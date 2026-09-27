# Kiểm tra cảm xúc của hình ảnh / video / webcam
import asyncio
import logging

from fastapi import APIRouter, File, UploadFile

from backend.src.exceptions.ai_exceptions import AIException
from backend.src.schemas.analysis_schema import AnalysisResponse
from backend.src.schemas.emotion_schema import FaceEmotionResponse
from backend.src.schemas.error_schema import ErrorResponse
from backend.src.services.image_analyzer import (
    analyze_static_image,
    validate_image_upload,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/image", response_model=AnalysisResponse)
async def analyze_image(file: UploadFile = File(..., description="Ảnh tĩnh JPG/PNG/WEBP")):
    """
    Task 2 — Phân tích cảm xúc khuôn mặt từ ảnh tĩnh.

    Upload 1 ảnh, DeepFace nhận diện khuôn mặt và trả về điểm 7 cảm xúc.
    """
    try:
        validate_image_upload(file.content_type, file.filename)
        image_bytes = await file.read()
        # DeepFace/TensorFlow là blocking → chạy trên thread pool
        faces = await asyncio.to_thread(analyze_static_image, image_bytes)

        face_emotions = [
            FaceEmotionResponse(
                track_id=face.get("track_id"),
                dominate_emotion=face["dominate_emotion"],
                confidence=face["confidence"],
                emotion=face["emotion"],
            )
            for face in faces
        ]

        return AnalysisResponse(
            success=True,
            total_faces=len(face_emotions),
            face_emotions=face_emotions,
            error=None,
        )
    except AIException as exc:
        logger.warning("Phân tích ảnh thất bại: %s (%s)", exc.message, exc.error_code)
        return AnalysisResponse(
            success=False,
            total_faces=0,
            face_emotions=[],
            error=ErrorResponse(error_code=exc.error_code, message=exc.message),
        )
    except Exception as exc:
        logger.exception("Lỗi không xác định khi phân tích ảnh")
        return AnalysisResponse(
            success=False,
            total_faces=0,
            face_emotions=[],
            error=ErrorResponse(
                error_code="INTERNAL_ERROR",
                message=f"Lỗi hệ thống: {exc}",
            ),
        )


@router.post("/video")
async def analyze_video():
    return {"message": "analyze video"}


@router.post("/webcam")
async def analyze_webcam():
    return {"message": "analyze webcam"}
