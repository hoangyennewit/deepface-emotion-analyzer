"""
Task 2: Phân tích cảm xúc khuôn mặt từ ảnh tĩnh bằng DeepFace.
"""

from __future__ import annotations

import logging
from typing import Any

import cv2
import numpy as np
from deepface import DeepFace

from backend.src.exceptions.ai_exceptions import (
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
MAX_IMAGE_BYTES = 10 * 1024 * 1024  # ~10MB theo khảo sát yêu cầu


def _decode_image(image_bytes: bytes) -> np.ndarray:
    """Giải mã bytes ảnh thành mảng BGR OpenCV."""
    if not image_bytes:
        raise InvalidInputException("File ảnh rỗng.")
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise InvalidInputException(
            f"Dung lượng ảnh vượt quá giới hạn {MAX_IMAGE_BYTES // (1024 * 1024)}MB."
        )

    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise InvalidInputException("Không đọc được ảnh. Hãy dùng JPG, PNG hoặc WEBP.")
    return image


def _to_python_float(value: Any) -> float:
    """Chuyển numpy scalar sang float Python để JSON serialize được."""
    if hasattr(value, "item"):
        return float(value.item())
    return float(value)


def _normalize_emotion_scores(emotion: dict[str, Any]) -> dict[str, float]:
    return {str(k): round(_to_python_float(v), 4) for k, v in emotion.items()}


def analyze_static_image(
    image_bytes: bytes,
    *,
    detector_backend: str = "opencv",
) -> list[dict[str, Any]]:
    """
    Phân tích cảm xúc tất cả khuôn mặt trong một ảnh tĩnh.

    Returns:
        list[dict]: mỗi phần tử gồm dominate_emotion, confidence, emotion, bbox.

    Raises:
        InvalidInputException: ảnh không hợp lệ / vượt dung lượng.
        NoFaceDetectedException: không tìm thấy khuôn mặt.
        ModelInferenceException: lỗi khi chạy DeepFace.
    """
    image = _decode_image(image_bytes)

    try:
        results = DeepFace.analyze(
            img_path=image,
            actions=["emotion"],
            detector_backend=detector_backend,
            enforce_detection=True,
            silent=True,
        )
    except ValueError as exc:
        # DeepFace thường ném ValueError khi không detect được mặt
        logger.info("Không phát hiện khuôn mặt: %s", exc)
        raise NoFaceDetectedException() from exc
    except Exception as exc:
        logger.exception("Lỗi suy luận DeepFace")
        raise ModelInferenceException(str(exc)) from exc

    # DeepFace có thể trả về dict (1 mặt) hoặc list[dict] (nhiều mặt)
    if isinstance(results, dict):
        results = [results]
    if not results:
        raise NoFaceDetectedException()

    faces: list[dict[str, Any]] = []
    for idx, item in enumerate(results):
        emotion_scores = _normalize_emotion_scores(item.get("emotion") or {})
        dominant = str(item.get("dominant_emotion") or "unknown")
        confidence = round(emotion_scores.get(dominant, 0.0), 4)

        region = item.get("region") or {}
        bbox = None
        if region:
            bbox = [
                int(region.get("x", 0)),
                int(region.get("y", 0)),
                int(region.get("w", 0)),
                int(region.get("h", 0)),
            ]

        faces.append(
            {
                "track_id": idx,
                "dominate_emotion": dominant,
                "dominant_emotion": dominant,  # tương thích create_ai_respose
                "confidence": confidence,
                "emotion": emotion_scores,
                "bbox": bbox,
            }
        )

    return faces


def validate_image_upload(content_type: str | None, filename: str | None) -> None:
    """Kiểm tra content-type / phần mở rộng file upload."""
    if content_type and content_type.lower() in ALLOWED_CONTENT_TYPES:
        return

    if filename:
        ext = filename.rsplit(".", 1)[-1].lower()
        if ext in {"jpg", "jpeg", "png", "webp"}:
            return

    raise InvalidInputException(
        "Định dạng ảnh không hỗ trợ. Chỉ chấp nhận JPG, PNG, WEBP."
    )
