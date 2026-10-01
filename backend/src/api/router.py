from fastapi import APIRouter
from src.api.routes.emotion import router as emotion_router
from src.api.routes.health import router as health_router
from src.api.routes.upload import router as upload_router
from src.api.routes.user import router as user_router
from src.api.routes.settings_route import router as settings_router

api_router = APIRouter()

api_router.include_router(
    emotion_router,
    prefix="/emotion", 
    tags=["Emotion Analysis"]
)
api_router.include_router(
    user_router,
    prefix="/user",
    tags=["User Profile"]
)
api_router.include_router(
    settings_router,
    prefix="/settings",
    tags=["Settings"]
)
api_router.include_router(
    health_router,
    prefix="/health",
    tags=["Health Check"]
)
api_router.include_router(
    upload_router,
    prefix="/upload",
    tags=["File Upload"]
)