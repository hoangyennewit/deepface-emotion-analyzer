from fastapi import APIRouter
from backend.src.api.routes.emotion import router as emotion_router
from backend.src.api.routes.health import router as health_router

api_router = APIRouter()

api_router.include_router(
    emotion_router,
    prefix="/emotion", 
    tags=["Emotion Analysis"]
)
api_router.include_router(
    health_router,
    prefix="/health",
    tags=["Health Check"]
)