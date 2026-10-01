from fastapi import APIRouter, File, UploadFile, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.controller.emotion_controller import (
    analyze_image_controller,
    analyze_video_controller,
    analyze_webcam_controller,
)
from src.schemas.analysis_schema import AnalysisResponse
from src.db.session import get_session

router = APIRouter()


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
    return await analyze_image_controller(file = file, db = db)


@router.post("/video")
async def analyze_video(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_session),
):
    return await analyze_video_controller(file = file, db = db)


@router.post("/webcam")
async def analyze_webcam(
    file: UploadFile = File(...),
):
    return await analyze_webcam_controller(file = file)