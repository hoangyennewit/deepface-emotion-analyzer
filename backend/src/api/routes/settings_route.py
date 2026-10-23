from typing import Any, Dict
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

SYSTEM_SETTINGS = {
    "language": "Tiếng Việt",
    "theme": "Sáng",
    "auto_save": True,
    "face_detector_model": "DeepFace (SSD/OpenCV)",
    "emotion_analysis_model": "DeepFace (Keras)",
}

WEBCAM_SETTINGS = {
    "camera_id": "default",
    "resolution": "720p",
    "fps": 30,
    "show_face_box": True,
    "show_emotion_rate": True,
    "auto_save": True,
}

class SystemSettingsRequest(BaseModel):
    language: str | None = None
    theme: str | None = None
    auto_save: bool | None = None
    face_detector_model: str | None = None
    emotion_analysis_model: str | None = None

class WebcamSettingsRequest(BaseModel):
    camera_id: str | None = None
    resolution: str | None = None
    fps: int | None = None
    show_face_box: bool | None = None
    show_emotion_rate: bool | None = None
    auto_save: bool | None = None

@router.get("/")
async def get_system_settings():
    return SYSTEM_SETTINGS

@router.post("/")
async def update_system_settings(req: SystemSettingsRequest):
    update_data = req.model_dump(exclude_unset=True)
    SYSTEM_SETTINGS.update(update_data)
    return {"success": True, "settings": SYSTEM_SETTINGS}

@router.get("/webcam")
async def get_webcam_settings():
    return WEBCAM_SETTINGS

@router.post("/webcam")
async def update_webcam_settings(req: WebcamSettingsRequest):
    update_data = req.model_dump(exclude_unset=True)
    WEBCAM_SETTINGS.update(update_data)
    return {"success": True, "webcam_settings": WEBCAM_SETTINGS}
