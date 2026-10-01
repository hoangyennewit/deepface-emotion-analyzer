"""
Phân tích nhãn biểu cảm khuôn mặt từ ảnh tĩnh bằng DeepFace.
"""

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

# OpenCV nhanh; RetinaFace dùng làm detector dự phòng khi cần.
FALLBACK_DETECTOR_BACKEND = "retinaface"


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


def _run_deepface_analyze(
    image: np.ndarray,
    detector_backend: str,
    enforce_detection: bool,
) -> list[dict[str, Any]] | None:
    """
    Chạy DeepFace với một detector cụ thể.

    [CHỈNH] enforce_detection được truyền vào rõ ràng.
    Bản cũ dùng biến này nhưng không khai báo trong hàm.
    """
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


def analyze_static_image(
    image_input: bytes | np.ndarray,
    *,
    detector_backend: str = "opencv",
    enforce_detection: bool = True,
    use_fallback: bool = True,
) -> list[dict[str, Any]]:
    """
    Phân loại nhãn biểu cảm của tất cả khuôn mặt trong ảnh.

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
        and detector_backend != FALLBACK_DETECTOR_BACKEND
    ):
        logger.info(
            "Thử lại bằng detector dự phòng '%s'",
            FALLBACK_DETECTOR_BACKEND,
        )

        results = _run_deepface_analyze(
            image,
            FALLBACK_DETECTOR_BACKEND,
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
