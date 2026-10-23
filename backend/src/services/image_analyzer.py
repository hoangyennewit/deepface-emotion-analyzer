from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from deepface import DeepFace

from src.exceptions.ai_exceptions import (
    InvalidInputException,
    ModelInferenceException,
    NoFaceDetectedException,
)

logger = logging.getLogger(__name__)

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
}

MAX_IMAGE_BYTES = 10 * 1024 * 1024

# ---------------------------------------------------------------------------
# Cấu hình thuật toán MỚI - chế độ chính xác (ảnh upload)
# ---------------------------------------------------------------------------
FACE_DETECTORS = ["retinaface", "mtcnn", "centerface"]
MIN_FACE_CONFIDENCE = 0.85
STRONG_CONFIDENCE = 0.97      # đủ tin dù chỉ 1 detector thấy
MIN_VOTES = 2                 # số lượt (detector x biến thể) phải đồng ý
CLUSTER_IOU = 0.3
CLUSTER_IOMIN = 0.6           # box nhỏ nằm trong box lớn -> cùng 1 mặt
MIN_FACE_RATIO = 0.03         # cạnh mặt tối thiểu so với cạnh ngắn của ảnh
CROP_MARGIN = 0.15
MAX_SIDE_ACCURATE = 1600

# ---------------------------------------------------------------------------
# Cấu hình thuật toán MỚI - chế độ nhanh (video)
# ---------------------------------------------------------------------------
FAST_DETECTOR = "yunet"               # nhẹ, chạy tốt trên CPU
FAST_FALLBACK_DETECTOR = "retinaface" # dùng nếu yunet không chạy được
MAX_SIDE_FAST = 960

# Detector đang dùng cho chế độ nhanh (tự chuyển sang fallback nếu lỗi)
_fast_backend = FAST_DETECTOR

# ---------------------------------------------------------------------------
# Cấu hình thuật toán CŨ (webcam)
# ---------------------------------------------------------------------------
# OpenCV nhanh; RetinaFace dùng làm detector dự phòng khi cần.
WEBCAM_FALLBACK_DETECTOR_BACKEND = "retinaface"


def _decode_image(
    image_bytes: bytes,
) -> np.ndarray:
    """Giải mã bytes ảnh thành BGR ndarray của OpenCV."""
    if not image_bytes:
        raise InvalidInputException("File ảnh rỗng.")

    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise InvalidInputException(
            "Dung lượng ảnh vượt quá giới hạn "
            f"{MAX_IMAGE_BYTES // (1024 * 1024)}MB."
        )

    array = np.frombuffer(
        image_bytes,
        dtype=np.uint8,
    )

    image = cv2.imdecode(
        array,
        cv2.IMREAD_COLOR,
    )

    if image is None:
        raise InvalidInputException(
            "Không đọc được ảnh. Hãy dùng JPG, PNG hoặc WEBP."
        )

    return image


def _to_python_float(
    value: Any,
) -> float:
    """Chuyển numpy scalar sang float Python để JSON serialize được."""
    if hasattr(value, "item"):
        return float(value.item())

    return float(value)


def _normalize_emotion_scores(
    emotion: dict[str, Any],
) -> dict[str, float]:
    return {
        str(name): round(
            _to_python_float(value),
            4,
        )
        for name, value in emotion.items()
    }


# ===========================================================================
# THUẬT TOÁN MỚI (ảnh upload + video)
# ===========================================================================
def _overlap(a: list[int], b: list[int]) -> tuple[float, float]:
    """Trả về (IoU, IoMin) của 2 box dạng [x, y, w, h]."""
    ax1, ay1, aw, ah = a
    bx1, by1, bw, bh = b

    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax1 + aw, bx1 + bw), min(ay1 + ah, by1 + bh)

    inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
    union = aw * ah + bw * bh - inter
    smaller = min(aw * ah, bw * bh)

    iou = inter / union if union > 0 else 0.0
    iomin = inter / smaller if smaller > 0 else 0.0
    return iou, iomin


def _merge_candidates(
    boxes: list[dict],
    min_votes: int,
) -> list[dict]:
    """Gom các box cùng 1 khuôn mặt, bỏ phiếu để loại mặt ảo."""
    boxes = sorted(boxes, key=lambda b: b["confidence"], reverse=True)
    clusters: list[list[dict]] = []

    for box in boxes:
        for cluster in clusters:
            iou, iomin = _overlap(box["bbox"], cluster[0]["bbox"])
            if iou >= CLUSTER_IOU or iomin >= CLUSTER_IOMIN:
                cluster.append(box)
                break
        else:
            clusters.append([box])

    merged: list[dict] = []
    for cluster in clusters:
        votes = len({(b["detector"], b["variant"]) for b in cluster})
        best_conf = cluster[0]["confidence"]

        if votes < min_votes and best_conf < STRONG_CONFIDENCE:
            continue

        # Box trung bình có trọng số theo confidence -> ổn định hơn 1 box đơn lẻ
        total = sum(b["confidence"] for b in cluster)
        bbox = [
            int(sum(b["bbox"][i] * b["confidence"] for b in cluster) / total)
            for i in range(4)
        ]
        merged.append(
            {
                "bbox": bbox,
                "confidence": best_conf,
                "votes": votes,
            }
        )

    return merged


def _enhance(image: np.ndarray) -> np.ndarray:
    """CLAHE trên kênh sáng để cải thiện ảnh tối / ngược sáng."""
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    l = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(l)
    return cv2.cvtColor(cv2.merge((l, a, b)), cv2.COLOR_LAB2BGR)


def _extract_candidates(
    variant: np.ndarray,
    backend: str,
    variant_id: int,
    *,
    align: bool,
) -> list[dict]:
    """
    Chạy 1 detector trên 1 biến thể ảnh, lọc kết quả không hợp lệ.
    Ném exception nếu detector lỗi (để nơi gọi quyết định xử lý).
    """
    h, w = variant.shape[:2]
    min_side = min(h, w) * MIN_FACE_RATIO

    faces = DeepFace.extract_faces(
        img_path=variant,
        detector_backend=backend,
        enforce_detection=False,
        align=align,
    )

    candidates: list[dict] = []

    for f in faces:
        area = f["facial_area"]
        conf = float(f.get("confidence", 0))
        bw, bh = int(area["w"]), int(area["h"])

        # Bỏ kết quả "không thấy mặt" (DeepFace trả cả khung hình, conf = 0)
        if conf < MIN_FACE_CONFIDENCE:
            continue
        if bw >= w * 0.95 and bh >= h * 0.95:
            continue
        if bw < min_side or bh < min_side:
            continue
        if not 0.5 <= bw / max(bh, 1) <= 1.8:  # mặt không quá dẹt/dài
            continue

        candidates.append(
            {
                "bbox": [int(area["x"]), int(area["y"]), bw, bh],
                "confidence": conf,
                "detector": backend,
                "variant": variant_id,
            }
        )

    return candidates


def _detect_faces(
    image: np.ndarray,
    detectors: list[str],
    min_votes: int,
) -> list[dict]:
    """Chế độ chính xác: nhiều detector x (ảnh gốc + ảnh tăng sáng)."""
    candidates: list[dict] = []

    for variant_id, variant in enumerate((image, _enhance(image))):
        for backend in detectors:
            try:
                candidates.extend(
                    _extract_candidates(
                        variant,
                        backend,
                        variant_id,
                        align=True,
                    )
                )
            except Exception as exc:
                logger.warning("Detector '%s' lỗi: %s", backend, exc)

    logger.debug(
        "Candidates: %s",
        [
            (c["detector"], c["variant"], c["bbox"], round(c["confidence"], 3))
            for c in candidates
        ],
    )

    # Số phiếu tối đa = số detector x 2 biến thể
    effective_votes = min(min_votes, len(detectors) * 2)
    return _merge_candidates(candidates, effective_votes)


def _detect_fast(image: np.ndarray) -> list[dict]:
    """
    Chế độ nhanh: 1 detector, 1 biến thể ảnh, không cần bỏ phiếu.
    Tự chuyển sang detector dự phòng nếu detector nhẹ không chạy được.
    """
    global _fast_backend

    try:
        candidates = _extract_candidates(
            image,
            _fast_backend,
            0,
            align=False,
        )
    except Exception as exc:
        if _fast_backend == FAST_FALLBACK_DETECTOR:
            logger.warning(
                "Detector '%s' lỗi: %s",
                _fast_backend,
                exc,
            )
            return []

        logger.warning(
            "Detector '%s' lỗi (%s), chuyển sang '%s'",
            _fast_backend,
            exc,
            FAST_FALLBACK_DETECTOR,
        )
        _fast_backend = FAST_FALLBACK_DETECTOR

        try:
            candidates = _extract_candidates(
                image,
                _fast_backend,
                0,
                align=False,
            )
        except Exception as exc2:
            logger.warning(
                "Detector '%s' lỗi: %s",
                _fast_backend,
                exc2,
            )
            return []

    return _merge_candidates(candidates, 1)


def _crop_with_margin(image: np.ndarray, bbox: list[int]) -> np.ndarray:
    h, w = image.shape[:2]
    x, y, bw, bh = bbox
    mx, my = int(bw * CROP_MARGIN), int(bh * CROP_MARGIN)
    x1, y1 = max(0, x - mx), max(0, y - my)
    x2, y2 = min(w, x + bw + mx), min(h, y + bh + my)
    return image[y1:y2, x1:x2]


def analyze_static_image(
    image_input: bytes | np.ndarray,
    *,
    detectors: list[str] | None = None,
    min_votes: int = MIN_VOTES,
    fast: bool = False,
) -> list[dict[str, Any]]:
    """
    [THUẬT TOÁN MỚI] Phân loại nhãn biểu cảm của tất cả khuôn mặt trong ảnh.

    fast=False: chính xác (ảnh upload).
    fast=True : nhanh (video).

    bbox trả về theo tọa độ của ảnh đầu vào gốc (đã quy đổi nếu ảnh bị resize).
    """
    image = (
        image_input
        if isinstance(image_input, np.ndarray)
        else _decode_image(image_input)
    )

    # Ảnh quá lớn thì thu nhỏ, ảnh quá nhỏ thì phóng to (tối ưu cho detector)
    max_side = MAX_SIDE_FAST if fast else MAX_SIDE_ACCURATE

    scale = 1.0
    longest = max(image.shape[:2])
    if longest > max_side:
        scale = max_side / longest
    elif longest < 640:
        scale = 640 / longest
    if scale != 1.0:
        image = cv2.resize(
            image,
            None,
            fx=scale,
            fy=scale,
            interpolation=cv2.INTER_CUBIC,
        )

    if fast:
        detected = _detect_fast(image)
    else:
        detected = _detect_faces(
            image,
            detectors or FACE_DETECTORS,
            min_votes,
        )

    if not detected:
        raise NoFaceDetectedException()

    # Sắp xếp trái -> phải để track_id ổn định
    detected.sort(key=lambda d: d["bbox"][0])

    faces: list[dict[str, Any]] = []
    for index, det in enumerate(detected):
        crop = _crop_with_margin(image, det["bbox"])
        if crop.size == 0:
            continue

        try:
            res = DeepFace.analyze(
                img_path=crop,
                actions=["emotion"],
                detector_backend="skip",  # đã detect rồi, không detect lại
                enforce_detection=False,
                silent=True,
            )
        except Exception as exc:
            raise ModelInferenceException(str(exc)) from exc

        res = res[0] if isinstance(res, list) else res
        scores = _normalize_emotion_scores(res.get("emotion") or {})
        dominant = str(res.get("dominant_emotion") or "unknown")

        faces.append(
            {
                "track_id": index,

                # Giữ key cũ để tương thích schema hiện tại.
                "dominate_emotion": dominant,

                # Giữ key đúng chính tả để các layer khác có thể dùng.
                "dominant_emotion": dominant,

                "confidence": scores.get(dominant, 0.0),
                "emotion": scores,

                # Quy đổi về tọa độ ảnh gốc
                "bbox": [int(v / scale) for v in det["bbox"]],

                "face_confidence": round(det["confidence"], 4),
                "is_full_frame": False,
            }
        )

    if not faces:
        raise NoFaceDetectedException()

    return faces


# ===========================================================================
# THUẬT TOÁN CŨ (webcam)
# ===========================================================================
def _run_deepface_analyze(
    image: np.ndarray,
    detector_backend: str,
    enforce_detection: bool,
) -> list[dict[str, Any]] | None:
    """Chạy DeepFace với một detector cụ thể (bản cũ, dùng cho webcam)."""
    try:
        results = DeepFace.analyze(
            img_path=image,
            actions=["emotion"],
            detector_backend=detector_backend,
            enforce_detection=enforce_detection,
            silent=True,
        )

    except ValueError as exc:
        logger.info(
            "Không phát hiện khuôn mặt với detector '%s': %s",
            detector_backend,
            exc,
        )
        return None

    except Exception as exc:
        logger.exception(
            "Lỗi suy luận DeepFace với detector '%s'",
            detector_backend,
        )
        raise ModelInferenceException(str(exc)) from exc

    if isinstance(results, dict):
        results = [results]

    return results if results else None


def analyze_webcam_image(
    image_input: bytes | np.ndarray,
    *,
    detector_backend: str = "opencv",
    enforce_detection: bool = True,
    use_fallback: bool = True,
) -> list[dict[str, Any]]:
    """
    [THUẬT TOÁN CŨ] Phân loại nhãn biểu cảm cho frame webcam.

    Nếu detector chính không trả về kết quả, thử RetinaFace trước khi
    báo NoFaceDetectedException.
    """
    if isinstance(image_input, np.ndarray):
        image = image_input
    else:
        image = _decode_image(image_input)

    results = _run_deepface_analyze(
        image,
        detector_backend,
        enforce_detection,
    )

    if (
        results is None
        and use_fallback
        and detector_backend != WEBCAM_FALLBACK_DETECTOR_BACKEND
    ):
        logger.info(
            "Thử lại bằng detector dự phòng '%s'",
            WEBCAM_FALLBACK_DETECTOR_BACKEND,
        )

        results = _run_deepface_analyze(
            image,
            WEBCAM_FALLBACK_DETECTOR_BACKEND,
            enforce_detection,
        )

    if results is None:
        raise NoFaceDetectedException()

    faces: list[dict[str, Any]] = []
    image_height, image_width = image.shape[:2]

    for index, item in enumerate(results):
        emotion_scores = _normalize_emotion_scores(
            item.get("emotion") or {}
        )

        dominant_emotion = str(
            item.get("dominant_emotion")
            or "unknown"
        )

        confidence = round(
            emotion_scores.get(
                dominant_emotion,
                0.0,
            ),
            4,
        )

        region = item.get("region") or {}

        bbox = None
        is_full_frame = False

        if region:
            x = int(region.get("x", 0))
            y = int(region.get("y", 0))
            width = int(region.get("w", 0))
            height = int(region.get("h", 0))

            bbox = [
                x,
                y,
                width,
                height,
            ]

            if (
                width >= image_width * 0.9
                and height >= image_height * 0.9
            ):
                is_full_frame = True

        faces.append(
            {
                "track_id": index,

                # Giữ key cũ để tương thích schema hiện tại.
                "dominate_emotion": dominant_emotion,

                # Giữ key đúng chính tả để các layer khác có thể dùng.
                "dominant_emotion": dominant_emotion,

                "confidence": confidence,
                "emotion": emotion_scores,
                "bbox": bbox,
                "is_full_frame": is_full_frame,
            }
        )

    return faces


def warmup_models() -> None:
    """Nạp sẵn model khi khởi động server để lần gọi đầu không bị chậm."""
    dummy = np.zeros((480, 640, 3), dtype=np.uint8)

    for backend in {FAST_DETECTOR, *FACE_DETECTORS}:
        try:
            DeepFace.extract_faces(
                img_path=dummy,
                detector_backend=backend,
                enforce_detection=False,
            )
        except Exception as exc:
            logger.warning("Warmup '%s' lỗi: %s", backend, exc)

    try:
        DeepFace.analyze(
            img_path=dummy,
            actions=["emotion"],
            detector_backend="skip",
            enforce_detection=False,
            silent=True,
        )
    except Exception as exc:
        logger.warning("Warmup emotion lỗi: %s", exc)


def validate_image_upload(
    content_type: str | None,
    filename: str | None,
) -> None:
    """Kiểm tra content-type hoặc extension của ảnh upload."""
    if (
        content_type
        and content_type.lower() in ALLOWED_CONTENT_TYPES
    ):
        return

    if filename:
        extension = (
            Path(filename).suffix.lower()
            if "." in filename
            else ""
        )

        if extension in {
            ".jpg",
            ".jpeg",
            ".png",
            ".webp",
        }:
            return

    raise InvalidInputException(
        "Định dạng ảnh không hỗ trợ. "
        "Chỉ chấp nhận JPG, PNG, WEBP."
    )