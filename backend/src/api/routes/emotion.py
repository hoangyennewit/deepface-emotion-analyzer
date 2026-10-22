# =========================================================
# src/api/routes/emotion.py
# =========================================================

from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    UploadFile,
)

from sqlalchemy.ext.asyncio import AsyncSession

from src.controller.emotion_controller import (
    analyze_image_controller,
    analyze_video_controller,
    analyze_webcam_controller,
    save_webcam_session_controller,
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


# =========================================================
# HISTORY
# =========================================================

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
    db: AsyncSession = Depends(get_session),
):
    return await analyze_image_controller(
        file=file,
        db=db,
    )


# =========================================================
# VIDEO
# =========================================================

@router.post("/video")
async def analyze_video(
    file: UploadFile = File(
        ...,
        description="Video cần phân tích",
    ),
    db: AsyncSession = Depends(get_session),
):
    return await analyze_video_controller(
        file=file,
        db=db,
    )


# =========================================================
# WEBCAM
#
# /webcam         : phân tích 1 frame realtime, không lưu DB
# /webcam/session : lưu cả phiên (video ghi từ trình duyệt + timeline)
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


@router.post("/webcam/session")
async def save_webcam_session(
    video: UploadFile = File(
        ...,
        description="Video webcam (WebM/MP4) do trình duyệt ghi",
    ),
    meta: str = Form(
        ...,
        description="JSON: name, duration, samples",
    ),
    db: AsyncSession = Depends(get_session),
):
    return await save_webcam_session_controller(
        video=video,
        meta=meta,
        db=db,
    )