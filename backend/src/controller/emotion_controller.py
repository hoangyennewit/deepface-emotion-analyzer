import logging
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, UploadFile

from src.exceptions.ai_exceptions import AIException
from src.schemas.analysis_schema import AnalysisResponse
from src.schemas.error_schema import ErrorResponse
from src.services.emotion_service import (
    analyze_image_service,
    analyze_video_service,
    analyze_webcam_service,
)


logger = logging.getLogger(__name__)


async def analyze_image_controller(
    file: UploadFile,
    db: AsyncSession,
) -> AnalysisResponse:

    try:
        result = await analyze_image_service(file = file, db = db)

        return AnalysisResponse(
            success=True,
            total_faces=len(result),
            face_emotions=result,
            error=None,
        )

    except AIException as exc:
        logger.warning(
            "Phân tích ảnh thất bại: %s (%s)",
            exc.message,
            exc.error_code,
        )

        return AnalysisResponse(
            success=False,
            total_faces=0,
            face_emotions=[],
            error=ErrorResponse(
                error_code=exc.error_code,
                message=exc.message,
            ),
        )

    except Exception:
        logger.exception(
            "Lỗi không xác định khi phân tích ảnh"
        )

        return AnalysisResponse(
            success=False,
            total_faces=0,
            face_emotions=[],
            error=ErrorResponse(
                error_code="INTERNAL_ERROR",
                message="Lỗi hệ thống khi phân tích ảnh.",
            ),
        )


async def analyze_video_controller(
    file: UploadFile,
    db: AsyncSession,
):
    try:
        return await analyze_video_service(file = file, db = db)

    except AIException as exc:
        raise HTTPException(
            status_code=400,
            detail=exc.message,
        )
    except Exception as exc:
        logger.exception("Phân tích video thất bại: %s", file.filename)
        raise HTTPException(
            status_code=500,
            detail=f"Không thể phân tích video: {exc}",
        ) from exc


async def analyze_webcam_controller(
    file: UploadFile,
):
    try:
        return await analyze_webcam_service(file)

    except AIException as exc:
        raise HTTPException(
            status_code=400,
            detail=exc.message,
        )