from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.controller.chat_controller import ask_emotion_chatbot_controller
from src.db.session import get_session
from src.schemas.chat_schema import ChatRequest, ChatResponse


router = APIRouter()


@router.post("/emotion", response_model=ChatResponse)
async def chat_about_emotions(
    request: ChatRequest,
    db: AsyncSession = Depends(get_session),
):
    return await ask_emotion_chatbot_controller(
        mode=request.mode,
        message=request.message,
        db=db,
        session_id=request.session_id,
        source_type=request.source_type,
        analysis_data=request.analysis_data,
        video_file_id=request.video_file_id,
        window_seconds=request.window_seconds,
        limit=request.limit,
    )