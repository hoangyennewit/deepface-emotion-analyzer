"""Phân tích cảm xúc và trạng thái học tập cho frame webcam bằng MediaPipe.

Đây là nhánh thay thế cho ``analyze_webcam_image()`` (DeepFace) trong
``image_analyzer.py``. Lý do thay: mỗi lần gọi DeepFace phải chạy lại bộ phát
hiện khuôn mặt và mạng phân loại cảm xúc (~0.5 - 1.5 giây/khung trên CPU), nên
webcam chỉ đạt khoảng 1 - 2 khung/giây và bị trễ.

Cách làm mới:

* Một model MediaPipe FaceLandmarker (~3.7 MB) trả về 478 điểm mốc, 52 hệ số
  blendshape (tương đương Action Unit theo FACS) và ma trận góc đầu. Suy luận
  chỉ tốn ~10 - 25 ms/khung trên CPU.
* Từ blendshape + độ mở mắt (EAR) + hướng đầu, tính thêm các trạng thái phục
  vụ giám sát lớp học: ``focused`` (tập trung), ``distracted`` (mất tập trung),
  ``tired`` (mệt mỏi/buồn ngủ), ``confused`` (bối rối).
* Trạng thái được làm mượt theo thời gian và theo dõi khuôn mặt (track id), nên
  nhãn không nhấp nháy giữa các request.

Lưu ý: ``focused``/``distracted``/``tired``/``confused`` là chỉ số hành vi
(heuristic), không phải lớp huấn luyện của mạng nơ-ron; ngưỡng nằm ở đầu file
để có thể chỉnh khi báo cáo/thử nghiệm.

Chạy trực tiếp để tải trước model:

    python -m src.services.webcam_analyzer
"""

from __future__ import annotations

import logging
import math
import os
import threading
import time
import urllib.request
from collections import deque
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Deque, Dict, List, Optional, Tuple

import cv2
import numpy as np

from src.exceptions.ai_exceptions import (
    ModelInferenceException,
    NoFaceDetectedException,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Cấu hình
# ---------------------------------------------------------------------------
MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/"
    "face_landmarker/float16/1/face_landmarker.task"
)

_REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_MODEL_PATH = Path(
    os.getenv("WEBCAM_MODEL_PATH", _REPO_ROOT / "models" / "face_landmarker.task")
)

MAX_INFER_WIDTH = 640      # thu nhỏ frame trước khi suy luận
MAX_FACES = 5              # số khuôn mặt tối đa mỗi khung
MIN_FACE_RATIO = 0.03      # bỏ qua mặt nhỏ hơn 3% chiều rộng khung
RESET_IDLE_SECONDS = 2.5   # nghỉ lâu hơn -> coi như phiên mới, xoá track cũ
TRACK_TIMEOUT_SECONDS = 2.0
FATIGUE_WINDOW_SECONDS = 20.0
YAWN_COOLDOWN_SECONDS = 12.0

# Ngưỡng phân loại trạng thái (0..1)
FATIGUE_TIRED = 0.55
ATTENTION_DISTRACTED = 0.45
CONFUSION_CONFUSED = 0.62

EMOTION_KEYS: Tuple[str, ...] = (
    "happy",
    "sad",
    "angry",
    "surprise",
    "fear",
    "disgust",
    "neutral",
)

STATE_KEYS: Tuple[str, ...] = ("focused", "distracted", "tired", "confused")

STATE_LABELS_VI: Dict[str, str] = {
    "focused": "Tập trung",
    "distracted": "Mất tập trung",
    "tired": "Mệt mỏi",
    "confused": "Bối rối",
}

EMOTION_LABELS_VI: Dict[str, str] = {
    "happy": "Vui vẻ",
    "sad": "Buồn",
    "angry": "Tức giận",
    "surprise": "Ngạc nhiên",
    "fear": "Sợ hãi",
    "disgust": "Ghê tởm",
    "neutral": "Bình thường",
}

# Điểm mốc mắt trái / phải của FaceMesh (góc ngoài, mí trên ngoài, mí trên
# trong, góc trong, mí dưới trong, mí dưới ngoài).
_LEFT_EYE = (33, 160, 158, 133, 153, 144)
_RIGHT_EYE = (362, 385, 387, 263, 373, 380)


class MediaPipeUnavailableError(RuntimeError):
    """Không import được MediaPipe (chưa cài thư viện)."""


def _clip01(value: float) -> float:
    return 0.0 if value < 0.0 else 1.0 if value > 1.0 else float(value)


def ensure_model(model_path: Path = DEFAULT_MODEL_PATH) -> Path:
    """Trả về đường dẫn model, tự tải về lần đầu nếu chưa có."""
    model_path = Path(model_path)
    if model_path.exists() and model_path.stat().st_size > 100_000:
        return model_path

    model_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = model_path.with_suffix(".download")
    logger.info("Đang tải model MediaPipe: %s", MODEL_URL)
    try:
        with urllib.request.urlopen(MODEL_URL, timeout=120) as response:
            with open(temp_path, "wb") as fh:
                while True:
                    chunk = response.read(64 * 1024)
                    if not chunk:
                        break
                    fh.write(chunk)
        temp_path.replace(model_path)
    except Exception as exc:  # mạng lỗi, đĩa đầy, ...
        if temp_path.exists():
            temp_path.unlink(missing_ok=True)
        raise ModelInferenceException(
            f"Không tải được model MediaPipe ({exc}). Hãy kiểm tra mạng hoặc "
            f"chép file face_landmarker.task vào {model_path}."
        ) from exc

    logger.info("Đã lưu model vào %s", model_path)
    return model_path


def _eye_aspect_ratio(points: np.ndarray, indices: Tuple[int, ...]) -> float:
    """EAR = (|p2-p6| + |p3-p5|) / (2*|p1-p4|); mắt mở ~0.3, nhắm ~0.1."""
    p1, p2, p3, p4, p5, p6 = (points[i] for i in indices)
    vertical = np.linalg.norm(p2 - p6) + np.linalg.norm(p3 - p5)
    horizontal = np.linalg.norm(p1 - p4)
    if horizontal < 1e-3:
        return 0.0
    return float(vertical / (2.0 * horizontal))


def _euler_degrees(matrix: Any) -> Tuple[float, float, float]:
    """Tách góc (yaw, pitch, roll) theo độ từ ma trận biến đổi 4x4."""
    rotation = np.asarray(matrix, dtype=np.float64)[:3, :3]
    sy = math.hypot(rotation[0, 0], rotation[1, 0])
    if sy > 1e-6:
        pitch = math.degrees(math.atan2(rotation[2, 1], rotation[2, 2]))
        yaw = math.degrees(math.atan2(-rotation[2, 0], sy))
        roll = math.degrees(math.atan2(rotation[1, 0], rotation[0, 0]))
    else:  # gimbal lock
        pitch = math.degrees(math.atan2(-rotation[1, 2], rotation[1, 1]))
        yaw = math.degrees(math.atan2(-rotation[2, 0], sy))
        roll = 0.0
    yaw = (yaw + 180.0) % 360.0 - 180.0
    pitch = (pitch + 180.0) % 360.0 - 180.0
    roll = (roll + 180.0) % 360.0 - 180.0
    return yaw, pitch, roll


def emotion_from_blendshapes(blendshapes: Dict[str, float]) -> Dict[str, float]:
    """Quy đổi 52 blendshape thành phân bố xác suất 7 cảm xúc cơ bản.

    Trọng số dựa trên các Action Unit đặc trưng của từng cảm xúc (FACS), sau đó
    chuẩn hoá mềm để tổng xác suất bằng 1.
    """

    def g(key: str) -> float:
        return float(blendshapes.get(key, 0.0))

    smile = (g("mouthSmileLeft") + g("mouthSmileRight")) / 2.0
    frown = (g("mouthFrownLeft") + g("mouthFrownRight")) / 2.0
    brow_down = (g("browDownLeft") + g("browDownRight")) / 2.0
    brow_in = g("browInnerUp")
    brow_out = (g("browOuterUpLeft") + g("browOuterUpRight")) / 2.0
    jaw = g("jawOpen")
    eye_wide = (g("eyeWideLeft") + g("eyeWideRight")) / 2.0
    squint = (g("eyeSquintLeft") + g("eyeSquintRight")) / 2.0
    nose = (g("noseSneerLeft") + g("noseSneerRight")) / 2.0
    upper_up = (g("mouthUpperUpLeft") + g("mouthUpperUpRight")) / 2.0
    press = (g("mouthPressLeft") + g("mouthPressRight")) / 2.0
    stretch = (g("mouthStretchLeft") + g("mouthStretchRight")) / 2.0
    lower_down = (g("mouthLowerDownLeft") + g("mouthLowerDownRight")) / 2.0
    cheek = (g("cheekSquintLeft") + g("cheekSquintRight")) / 2.0

    raw = {
        "happy": 1.15 * smile + 0.25 * cheek + 0.15 * squint
        - 0.70 * frown - 0.40 * brow_down,
        "sad": 0.85 * brow_in + 0.70 * frown + 0.45 * lower_down + 0.15 * press
        - 0.80 * smile - 0.40 * jaw,
        "angry": 0.90 * brow_down + 0.35 * nose + 0.45 * press + 0.25 * frown
        - 0.80 * smile,
        "surprise": 0.80 * brow_out + 0.70 * jaw + 0.55 * eye_wide - 0.50 * smile,
        "fear": 0.55 * brow_in + 0.45 * brow_out + 0.45 * eye_wide
        + 0.35 * stretch + 0.20 * jaw - 0.50 * smile,
        "disgust": 0.90 * nose + 0.60 * upper_up + 0.25 * brow_down
        + 0.20 * squint - 0.70 * smile,
    }
    scores = {key: _clip01(value) for key, value in raw.items()}

    peak = max(scores.values()) if scores else 0.0
    scores["neutral"] = max(0.05, 0.75 - 1.10 * peak)

    powered = {key: max(value, 1e-6) ** 1.15 for key, value in scores.items()}
    total = sum(powered.values())
    return {key: value / total for key, value in powered.items()}


@dataclass
class _Track:
    """Trạng thái thời gian của một khuôn mặt (theo track id)."""

    track_id: int
    center: Tuple[float, float]
    size: float
    first_seen: float
    last_seen: float
    blendshapes: Dict[str, float] = field(default_factory=dict)
    emotion_probs: Dict[str, float] = field(default_factory=dict)
    attention: float = 0.6
    fatigue: float = 0.0
    confusion: float = 0.0
    ear_open: float = 0.30
    closed_samples: Deque[Tuple[float, float]] = field(
        default_factory=lambda: deque(maxlen=90)
    )
    closed_streak: int = 0
    mouth_open_since: Optional[float] = None
    yawn_until: float = 0.0
    yaw: float = 0.0
    pitch: float = 0.0
    roll: float = 0.0


class WebcamFaceAnalyzer:
    """Bọc MediaPipe FaceLandmarker, giữ track giữa các request webcam."""

    def __init__(
        self,
        model_path: Path = DEFAULT_MODEL_PATH,
        max_faces: int = MAX_FACES,
        smoothing: float = 0.45,
    ) -> None:
        self._model_path = Path(model_path)
        self._max_faces = max(1, int(max_faces))
        self._smoothing = float(np.clip(smoothing, 0.05, 0.95))
        self._landmarker: Any = None
        self._mp: Any = None
        self._lock = threading.Lock()
        self._tracks: Dict[int, _Track] = {}
        self._next_id = 1
        self._last_timestamp_ms = -1
        self._last_frame_at = 0.0

    # ------------------------------------------------------------------ API
    def analyze_bgr(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """Phân tích một frame BGR, trả về payload JSON cho từng khuôn mặt."""
        if frame is None or frame.size == 0:
            raise NoFaceDetectedException()

        with self._lock:
            now = time.monotonic()
            self._maybe_reset(now)

            height, width = frame.shape[:2]
            scale = min(1.0, MAX_INFER_WIDTH / float(width or 1))
            if scale < 1.0:
                small = cv2.resize(
                    frame,
                    (int(width * scale), int(height * scale)),
                    interpolation=cv2.INTER_AREA,
                )
            else:
                small = frame
            rgb = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)

            result = self._detect(rgb, now)
            detections = self._extract_detections(result, small.shape, scale)
            assigned = self._assign_tracks(detections, now)
            faces = [
                self._update_track(detection, track, now)
                for detection, track in assigned
            ]

            self._prune(now)
            self._last_frame_at = now

            if not faces:
                raise NoFaceDetectedException()
            return faces

    def close(self) -> None:
        with self._lock:
            if self._landmarker is not None:
                try:
                    self._landmarker.close()
                except Exception:  # pragma: no cover
                    pass
                self._landmarker = None

    # -------------------------------------------------------------- nội bộ
    def _ensure_landmarker(self) -> None:
        if self._landmarker is not None:
            return
        try:
            import mediapipe as mp
            from mediapipe.tasks.python import BaseOptions
            from mediapipe.tasks.python import vision
        except ImportError as exc:  # thiếu thư viện -> service sẽ fallback
            raise MediaPipeUnavailableError(
                "Chưa cài mediapipe. Chạy: pip install -r backend/requirements.txt"
            ) from exc

        model_path = ensure_model(self._model_path)
        options = vision.FaceLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=str(model_path)),
            running_mode=vision.RunningMode.VIDEO,
            num_faces=self._max_faces,
            min_face_detection_confidence=0.5,
            min_face_presence_confidence=0.5,
            min_tracking_confidence=0.5,
            output_face_blendshapes=True,
            output_facial_transformation_matrixes=True,
        )
        self._landmarker = vision.FaceLandmarker.create_from_options(options)
        self._mp = mp

    def _detect(self, rgb: np.ndarray, now: float) -> Any:
        self._ensure_landmarker()
        timestamp_ms = int(now * 1000.0)
        if timestamp_ms <= self._last_timestamp_ms:
            timestamp_ms = self._last_timestamp_ms + 1
        self._last_timestamp_ms = timestamp_ms

        image = self._mp.Image(
            image_format=self._mp.ImageFormat.SRGB,
            data=np.ascontiguousarray(rgb),
        )
        try:
            return self._landmarker.detect_for_video(image, timestamp_ms)
        except Exception as exc:
            raise ModelInferenceException(
                f"MediaPipe không phân tích được khung hình: {exc}"
            ) from exc

    def _extract_detections(
        self,
        result: Any,
        shape: Tuple[int, ...],
        scale: float,
    ) -> List[Dict[str, Any]]:
        height, width = shape[:2]
        inverse_scale = 1.0 / scale if scale > 0 else 1.0
        detections: List[Dict[str, Any]] = []

        landmarks_list = getattr(result, "face_landmarks", None) or []
        blendshapes_list = getattr(result, "face_blendshapes", None) or []
        matrices = getattr(result, "facial_transformation_matrixes", None) or []

        for index, landmarks in enumerate(landmarks_list):
            points = np.array(
                [(lm.x * width, lm.y * height) for lm in landmarks],
                dtype=np.float32,
            )
            if len(points) < 468:
                continue

            xs, ys = points[:, 0], points[:, 1]
            x0, x1 = float(xs.min()), float(xs.max())
            y0, y1 = float(ys.min()), float(ys.max())
            if (x1 - x0) < MIN_FACE_RATIO * width:
                continue  # khuôn mặt quá nhỏ / nền

            blendshapes = {}
            if index < len(blendshapes_list):
                blendshapes = {
                    category.category_name: float(category.score)
                    for category in blendshapes_list[index]
                }

            if index < len(matrices):
                yaw, pitch, roll = _euler_degrees(matrices[index])
            else:
                yaw = pitch = roll = 0.0

            ear = (
                _eye_aspect_ratio(points, _LEFT_EYE)
                + _eye_aspect_ratio(points, _RIGHT_EYE)
            ) / 2.0

            detections.append(
                {
                    "center": ((x0 + x1) / 2.0, (y0 + y1) / 2.0),
                    "size": max(x1 - x0, y1 - y0),
                    "bbox": (
                        max(0, int(x0 * inverse_scale)),
                        max(0, int(y0 * inverse_scale)),
                        max(1, int((x1 - x0) * inverse_scale)),
                        max(1, int((y1 - y0) * inverse_scale)),
                    ),
                    "blendshapes": blendshapes,
                    "yaw": yaw,
                    "pitch": pitch,
                    "roll": roll,
                    "ear": ear,
                }
            )

        return detections

    def _assign_tracks(
        self, detections: List[Dict[str, Any]], now: float
    ) -> List[Tuple[Dict[str, Any], _Track]]:
        available = list(self._tracks.values())
        assigned: List[Tuple[Dict[str, Any], _Track]] = []

        for detection in detections:
            cx, cy = detection["center"]
            size = max(detection["size"], 1.0)
            best: Optional[_Track] = None
            best_distance = float("inf")
            for track in available:
                distance = (
                    math.hypot(track.center[0] - cx, track.center[1] - cy) / size
                )
                if distance < best_distance and distance < 1.0:
                    best = track
                    best_distance = distance

            if best is None:
                best = _Track(
                    track_id=self._next_id,
                    center=(cx, cy),
                    size=size,
                    first_seen=now,
                    last_seen=now,
                )
                self._next_id += 1
                self._tracks[best.track_id] = best
            else:
                available.remove(best)

            best.center = (cx, cy)
            best.size = size
            best.last_seen = now
            assigned.append((detection, best))

        return assigned

    def _update_track(
        self, detection: Dict[str, Any], track: _Track, now: float
    ) -> Dict[str, Any]:
        alpha = self._smoothing
        for key, value in detection["blendshapes"].items():
            if key in track.blendshapes:
                track.blendshapes[key] = (
                    (1 - alpha) * track.blendshapes[key] + alpha * value
                )
            else:
                track.blendshapes[key] = value

        track.yaw = (1 - alpha) * track.yaw + alpha * detection["yaw"]
        track.pitch = (1 - alpha) * track.pitch + alpha * detection["pitch"]
        track.roll = (1 - alpha) * track.roll + alpha * detection["roll"]

        ear = detection["ear"]
        if ear > track.ear_open * 0.9:
            track.ear_open = 0.85 * track.ear_open + 0.15 * ear
        track.ear_open = float(np.clip(track.ear_open, 0.18, 0.45))

        closed_threshold = max(0.13, track.ear_open * 0.62)
        closed = ear < closed_threshold
        eye_open = _clip01(
            (ear - closed_threshold) / max(track.ear_open - closed_threshold, 1e-3)
        )
        track.closed_streak = track.closed_streak + 1 if closed else 0
        track.closed_samples.append((now, 0.5 if closed else 0.0))

        # Cảm xúc: làm mượt xác suất giữa các frame
        probs = emotion_from_blendshapes(track.blendshapes)
        if not track.emotion_probs:
            track.emotion_probs = dict(probs)
        else:
            for key in EMOTION_KEYS:
                track.emotion_probs[key] = (
                    0.5 * track.emotion_probs[key] + 0.5 * probs[key]
                )
        dominant = max(track.emotion_probs, key=track.emotion_probs.get)
        confidence = track.emotion_probs[dominant]
        if confidence < 0.34:
            dominant = "neutral"
            confidence = track.emotion_probs.get("neutral", confidence)

        self._update_yawn(track, now)

        attention_now = self._attention_score(track, eye_open)
        track.attention = 0.65 * track.attention + 0.35 * attention_now
        fatigue_now = self._fatigue_score(track, now)
        track.fatigue = 0.65 * track.fatigue + 0.35 * fatigue_now
        confusion_now = self._confusion_score(track)
        track.confusion = 0.65 * track.confusion + 0.35 * confusion_now

        observed = now - track.first_seen
        state = self._classify(track, observed)

        emotion_scores = {
            key: round(track.emotion_probs.get(key, 0.0) * 100.0, 2)
            for key in EMOTION_KEYS
        }
        x, y, w, h = detection["bbox"]

        return {
            "track_id": track.track_id,
            "dominate_emotion": dominant,
            "dominant_emotion": dominant,
            "confidence": round(confidence * 100.0, 2),
            "emotion": emotion_scores,
            "emotion_label": EMOTION_LABELS_VI.get(dominant, dominant),
            "bbox": [int(x), int(y), int(w), int(h)],
            "state": state,
            "state_label": STATE_LABELS_VI[state],
            "attention": round(_clip01(track.attention) * 100.0, 1),
            "fatigue": round(_clip01(track.fatigue) * 100.0, 1),
            "is_yawning": track.yawn_until > now,
            "yaw": round(track.yaw, 1),
            "pitch": round(track.pitch, 1),
        }

    def _update_yawn(self, track: _Track, now: float) -> None:
        jaw = track.blendshapes.get("jawOpen", 0.0)
        mouth_stretch = max(
            track.blendshapes.get("mouthFunnel", 0.0),
            track.blendshapes.get("mouthStretchLeft", 0.0),
            track.blendshapes.get("mouthStretchRight", 0.0),
        )
        opening = jaw > 0.45 and mouth_stretch > 0.12

        if opening and track.mouth_open_since is None:
            track.mouth_open_since = now
        elif opening and track.mouth_open_since is not None:
            if now - track.mouth_open_since > 0.6:
                track.yawn_until = now + YAWN_COOLDOWN_SECONDS
        else:
            track.mouth_open_since = None

    def _attention_score(self, track: _Track, eye_open: float) -> float:
        blendshapes = track.blendshapes
        yaw, pitch = abs(track.yaw), abs(track.pitch)
        head = _clip01(1.0 - max(0.0, yaw - 10.0) / 32.0) * _clip01(
            1.0 - max(0.0, pitch - 12.0) / 30.0
        )
        look_h = max(
            (blendshapes.get("eyeLookOutLeft", 0.0)
             + blendshapes.get("eyeLookInRight", 0.0)) / 2.0,
            (blendshapes.get("eyeLookInLeft", 0.0)
             + blendshapes.get("eyeLookOutRight", 0.0)) / 2.0,
        )
        look_v = (
            blendshapes.get("eyeLookUpLeft", 0.0)
            + blendshapes.get("eyeLookUpRight", 0.0)
            + blendshapes.get("eyeLookDownLeft", 0.0)
            + blendshapes.get("eyeLookDownRight", 0.0)
        ) / 4.0
        gaze = _clip01(1.0 - look_h / 0.55) * _clip01(1.0 - look_v / 0.65)
        return _clip01(0.5 * head + 0.3 * gaze + 0.2 * eye_open)

    def _fatigue_score(self, track: _Track, now: float) -> float:
        """Ước lượng buồn ngủ từ tỉ lệ nhắm mắt (PERCLOS), nhắm lâu và ngáp.

        Webcam gửi frame cách nhau ~0.4 giây nên tỉ lệ nhắm mắt được tính trên
        các mẫu đã lấy, không phải trên mọi khung hình video.
        """
        samples = [(t, v) for t, v in track.closed_samples
                   if now - t <= FATIGUE_WINDOW_SECONDS]
        if len(samples) >= 4:
            closed_ratio = sum(v for _, v in samples) / len(samples)
            perclos_component = _clip01((closed_ratio - 0.25) / 0.45)
        else:
            perclos_component = 0.0

        microsleep = 1.0 if track.closed_streak >= 2 else 0.0
        yawn = 1.0 if track.yawn_until > now else 0.0

        return _clip01(
            0.40 * perclos_component + 0.30 * microsleep + 0.30 * yawn
        )

    def _confusion_score(self, track: _Track) -> float:
        blendshapes = track.blendshapes
        brow_down = (
            blendshapes.get("browDownLeft", 0.0)
            + blendshapes.get("browDownRight", 0.0)
        ) / 2.0
        brow_in = blendshapes.get("browInnerUp", 0.0)
        frown = (
            blendshapes.get("mouthFrownLeft", 0.0)
            + blendshapes.get("mouthFrownRight", 0.0)
        ) / 2.0
        press = (
            blendshapes.get("mouthPressLeft", 0.0)
            + blendshapes.get("mouthPressRight", 0.0)
        ) / 2.0
        tilt = _clip01((abs(track.roll) - 8.0) / 18.0)
        return _clip01(
            0.42 * brow_down + 0.28 * brow_in + 0.15 * max(frown, press) + 0.15 * tilt
        )

    def _classify(self, track: _Track, observed: float) -> str:
        if observed >= 2.0 and track.fatigue >= FATIGUE_TIRED:
            return "tired"
        # Quay đầu rõ rệt (sang ngang hoặc cúi xuống) cũng tính là mất tập trung,
        # kể cả khi mắt vẫn mở và hướng mắt chưa lệch nhiều.
        looking_away = abs(track.yaw) > 30.0 or abs(track.pitch) > 32.0
        if observed >= 1.2 and (
            track.attention < ATTENTION_DISTRACTED or looking_away
        ):
            return "distracted"
        if (
            observed >= 2.0
            and track.confusion >= CONFUSION_CONFUSED
            and track.attention >= 0.5
        ):
            return "confused"
        return "focused"

    def _maybe_reset(self, now: float) -> None:
        """Xoá track cũ nếu người dùng đã dừng webcam một lúc."""
        if self._last_frame_at and now - self._last_frame_at > RESET_IDLE_SECONDS:
            self._tracks.clear()
            self._next_id = 1

    def _prune(self, now: float) -> None:
        stale = [
            track_id
            for track_id, track in self._tracks.items()
            if now - track.last_seen > TRACK_TIMEOUT_SECONDS
        ]
        for track_id in stale:
            del self._tracks[track_id]


# ---------------------------------------------------------------------------
# Singleton dùng chung cho các request webcam
# ---------------------------------------------------------------------------
_analyzer: Optional[WebcamFaceAnalyzer] = None
_analyzer_lock = threading.Lock()


def get_analyzer() -> WebcamFaceAnalyzer:
    global _analyzer
    with _analyzer_lock:
        if _analyzer is None:
            _analyzer = WebcamFaceAnalyzer()
    return _analyzer


def _decode_frame(image_input: Any) -> np.ndarray:
    if isinstance(image_input, np.ndarray):
        return image_input
    array = np.frombuffer(image_input, dtype=np.uint8)
    frame = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if frame is None:
        raise NoFaceDetectedException(
            "Không đọc được khung hình webcam (JPEG/PNG không hợp lệ)."
        )
    return frame


def analyze_webcam_frame(image_input: Any) -> List[Dict[str, Any]]:
    """API chính: bytes ảnh (hoặc ndarray BGR) -> danh sách khuôn mặt + trạng thái.

    Ném ``MediaPipeUnavailableError`` nếu chưa cài mediapipe (để service quyết
    định fallback DeepFace), ``NoFaceDetectedException`` khi khung hình không có
    khuôn mặt (controller trả HTTP 400 như hành vi cũ).
    """
    frame = _decode_frame(image_input)
    return get_analyzer().analyze_bgr(frame)


def warmup_webcam_analyzer() -> None:
    """Nạp sẵn model + tải model lần đầu, tránh request đầu tiên bị chậm."""
    try:
        analyzer = get_analyzer()
        analyzer.analyze_bgr(np.zeros((360, 640, 3), dtype=np.uint8))
    except NoFaceDetectedException:
        pass
    except Exception as exc:  # không làm sập server nếu model lỗi
        logger.warning("Warmup webcam model thất bại: %s", exc)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    path = ensure_model()
    print(f"Model sẵn sàng: {path}")
    warmup_webcam_analyzer()
    print("Đã nạp xong MediaPipe FaceLandmarker.")
