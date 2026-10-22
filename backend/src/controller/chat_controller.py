import logging
from pathlib import Path
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.services.file_service import VIDEO_DIR
from src.services.chat_service import ChatMode, ask_emotion_chatbot
from src.services.gemini_service import (
    GeminiConfigurationError,
    GeminiServiceError,
    GeminiUnavailableError,
)


logger = logging.getLogger(__name__)


async def ask_emotion_chatbot_controller(
    *,
    mode: ChatMode,
    message: str,
    db: AsyncSession | None = None,
    session_id: UUID | None = None,
    source_type: str = "all",
    analysis_data: dict[str, Any] | None = None,
    video_file_id: UUID | None = None,
    video_path: str | Path | None = None,
    window_seconds: int = 30,
    limit: int = 20,
) -> dict[str, Any]:
    try:
        if video_file_id is not None:
            video_files = list(VIDEO_DIR.glob(f"{video_file_id}.*"))
            if not video_files:
                raise FileNotFoundError(
                    f"Không tìm thấy video có mã {video_file_id}"
                )
            if len(video_files) > 1:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Mã video không xác định duy nhất.",
                )
            video_path = video_files[0]

        return await ask_emotion_chatbot(
            mode=mode,
            message=message,
            db=db,
            session_id=session_id,
            source_type=source_type,
            analysis_data=analysis_data,
            video_path=video_path,
            window_seconds=window_seconds,
            limit=limit,
        )
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except LookupError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy video cần phân tích.",
        ) from exc
    except (GeminiConfigurationError, GeminiUnavailableError) as exc:
        logger.error("Chat Gemini hiện không khả dụng: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Dịch vụ chat AI hiện không khả dụng.",
        ) from exc
    except GeminiServiceError as exc:
        logger.warning("Yêu cầu chat Gemini thất bại: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.exception("Lỗi không xác định khi xử lý yêu cầu chat")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Lỗi hệ thống khi xử lý yêu cầu chat.",
        ) from exc