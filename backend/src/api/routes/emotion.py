# =========================================================
# src/api/routes/emotion.py
# =========================================================

from uuid import UUID

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
from src.controller.history_controller import (
    delete_history_controller,
    get_history_controller,
    get_history_detail_controller,
)

from src.db.session import get_session

from src.schemas.analysis_schema import (
    AnalysisResponse,
)


router = APIRouter()


@router.get("/history")
async def get_history(
    type: str = "all",
    db: AsyncSession = Depends(get_session),
):
    return await get_history_controller(db=db, source_type=type)


@router.get("/history/{session_id}")
async def get_history_detail(
    session_id: UUID,
    db: AsyncSession = Depends(get_session),
):
    return await get_history_detail_controller(db=db, session_id=session_id)


@router.delete("/history/{session_id}")
async def delete_history(
    session_id: UUID,
    db: AsyncSession = Depends(get_session),
):
    return await delete_history_controller(db=db, session_id=session_id)


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