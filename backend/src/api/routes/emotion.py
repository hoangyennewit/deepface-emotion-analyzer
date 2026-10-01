# =========================================================
# src/api/routes/emotion.py
# =========================================================

from fastapi import (
    APIRouter,
    Depends,
    File,
    UploadFile,
)

from sqlalchemy.ext.asyncio import AsyncSession

from src.controller.emotion_controller import (
    analyze_image_controller,
    analyze_video_controller,
    analyze_webcam_controller,
)

from src.db.session import get_session

from src.schemas.analysis_schema import (
    AnalysisResponse,
)


router = APIRouter()


# =========================================================
# IMAGE
#
# Route chỉ:
# - nhận request
# - nhận DB session
# - gọi Controller
# =========================================================

@router.post(
    "/image",
    response_model=AnalysisResponse,
)
async def analyze_image(
    file: UploadFile = File(
        ...,
        description="Ảnh tĩnh JPG/PNG/WEBP",
    ),
    db: AsyncSession = Depends(
        get_session
    ),
):
    return await analyze_image_controller(
        file=file,
        db=db,
    )


# =========================================================
# VIDEO
#
# Video có lưu Repository / PostgreSQL
# nên cần db.
# =========================================================

@router.post("/video")
async def analyze_video(
    file: UploadFile = File(
        ...,
        description="Video cần phân tích",
    ),
    db: AsyncSession = Depends(
        get_session
    ),
):
    return await analyze_video_controller(
        file=file,
        db=db,
    )


# =========================================================
# WEBCAM
#
# Tạm thời webcam chưa lưu DB,
# nên không cần AsyncSession.
# =========================================================

@router.post("/webcam")
async def analyze_webcam(
    file: UploadFile = File(
        ...,
        description="Frame ảnh từ webcam",
    ),
):
    return await analyze_webcam_controller(
        file=file,
    )