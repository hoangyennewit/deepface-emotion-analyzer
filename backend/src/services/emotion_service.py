import asyncio
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from src.schemas.emotion_schema import FaceEmotionResponse
from src.services.image_analyzer import (
    analyze_static_image,
    validate_image_upload,
)


async def analyze_image_service(
    file: UploadFile,
    db: AsyncSession,
) -> list[FaceEmotionResponse]:

    validate_image_upload(
        file.content_type,
        file.filename,
    )

    image_bytes = await file.read()

    faces = await asyncio.to_thread(
        analyze_static_image,
        image_bytes,
    )

    return [
        FaceEmotionResponse(
            track_id=face.get("track_id"),
            dominate_emotion=face[
                "dominate_emotion"
            ],
            confidence=face["confidence"],
            emotion=face["emotion"],
            bbox=face.get("bbox"),
        )
        for face in faces
    ]