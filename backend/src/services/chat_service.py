import logging
from uuid import UUID
from pathlib import Path
from typing import Any, Literal, Optional
from dotenv import load_dotenv
from google import genai
from google.genai import types, errors
from pydantic import BaseModel, ConfigDict, Field, AliasChoices, ValidationError, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
import math

from src.services.gemini_service import (
    analyze_video_content,
    generate_with_fallback,
)

from src.services.chat_context_service import (
    build_live_context,
    build_dashboard_context,
)

logger = logging.getLogger(__name__)

ChatMode = Literal["live", "video", "dashboard"]
MAX_MESSAGE_LENGTH = 2000
MAX_VIDEO_FACE_SAMPLES = 20
MAX_VIDEO_TIMELINE_SAMPLES = 30

# 1. Khai báo khuôn mẫu dữ liệu
# --- 1. PYDANTIC MODELS & HELPERS ---
def _is_valid_number(v: Any) -> bool:
    if isinstance(v, bool): 
        return False
    try:
        return math.isfinite(float(v))
    except (TypeError, ValueError):
        return False


class FaceSample(BaseModel):
    model_config = ConfigDict(extra='ignore')
    
    # AliasChoices giúp tự động nhận biết cả 'id' lẫn 'track_id'
    id: int | str = Field(validation_alias=AliasChoices('id', 'track_id'))
    dominant_emotion: Optional[str] = Field(
        default=None, 
        validation_alias=AliasChoices('dominant_emotion', 'dominantEmotion', 'emotion', 'dominate_emotion')
    )
    confidence: Optional[float] = Field(default=None, ge=0)

    @field_validator('confidence', mode='before')
    @classmethod
    def validate_confidence(cls, v):
        return round(float(v), 3) if _is_valid_number(v) else None

    @field_validator('id', mode='before')
    @classmethod
    def validate_id(cls, v):
        if isinstance(v, bool): raise ValueError("ID không được là boolean")
        return v


class TimelineSample(BaseModel):
    model_config = ConfigDict(extra='ignore')
    
    timestamp_seconds: Optional[float] = Field(
        default=None, validation_alias=AliasChoices('timestamp_seconds', 'time', 'timestamp')
    )
    frame_index: Optional[int] = Field(
        default=None, validation_alias=AliasChoices('frame_index', 'frameIndex')
    )
    dominant_emotion: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices('dominant_emotion', 'dominantEmotion'),
    )
    emotions: Optional[dict[str, float]] = None

    @field_validator('timestamp_seconds', mode='before')
    @classmethod
    def validate_timestamp(cls, v):
        return round(float(v), 3) if _is_valid_number(v) else None

    @field_validator('frame_index', mode='before')
    @classmethod
    def validate_frame(cls, v):
        return int(float(v)) if _is_valid_number(v) and float(v) >= 0 else None

    @field_validator('emotions', mode='before')
    @classmethod
    def clean_emotions(cls, v):
        if not isinstance(v, dict): return None
        cleaned = {
            str(k): round(float(val), 3) 
            for k, val in v.items() 
            if _is_valid_number(val)
        }
        return cleaned if cleaned else None

def _sample_evenly(items: list[Any], limit: int) -> list[Any]:
    """Lấy mẫu đều để tránh gửi toàn bộ timeline dài cho Gemini."""
    if len(items) <= limit:
        return items
    if limit <= 1:
        return [items[-1]]
    indices = [round(i * (len(items) - 1) / (limit - 1)) for i in range(limit)]
    return [items[index] for index in indices]


def _dominant_emotion(emotions: dict[str, float] | None) -> str | None:
    if not emotions:
        return None
    return max(emotions, key=emotions.get)


def _build_video_context(analysis_data: dict[str, Any]) -> dict[str, Any]:
    """Rút gọn kết quả Video DeepFace bằng Pydantic."""
    if not isinstance(analysis_data, dict):
        raise ValueError("analysis_data phải là JSON object")

    # 1. Xử lý Emotion Summary
    summary = analysis_data.get("emotion_summary") or analysis_data.get("emotionSummary") or {}
    if not isinstance(summary, dict):
        raise ValueError("emotion_summary/emotionSummary phải là JSON object")
        
    clean_summary = {
        str(k): round(float(v), 3)
        for k, v in summary.items()
        if _is_valid_number(v) and float(v) >= 0
    }

    # 2. Xử lý Faces bằng Pydantic (Rút gọn hoàn toàn)
    raw_faces = analysis_data.get("faces") or []
    face_samples = []
    if isinstance(raw_faces, list):
        for face in raw_faces[:MAX_VIDEO_FACE_SAMPLES]:
            if not isinstance(face, dict): continue
            try:
                # exclude_none=True sẽ tự động vứt bỏ các key có giá trị null
                clean_face = FaceSample(**face).model_dump(exclude_none=True)
                face_samples.append(clean_face)
            except ValidationError:
                continue

    # 3. Xử lý Timeline bằng Pydantic (Rút gọn hoàn toàn)
    raw_timeline = analysis_data.get("timeline") or []
    timeline_samples = []
    if isinstance(raw_timeline, list):
        for item in _sample_evenly(raw_timeline, MAX_VIDEO_TIMELINE_SAMPLES):
            if not isinstance(item, dict): continue
            try:
                clean_item = TimelineSample(**item).model_dump(exclude_none=True)
                if "dominant_emotion" not in clean_item:
                    dominant_emotion = _dominant_emotion(clean_item.get("emotions"))
                    if dominant_emotion is not None:
                        clean_item["dominant_emotion"] = dominant_emotion
                if clean_item: 
                    timeline_samples.append(clean_item)
            except ValidationError:
                continue

    # 4. Trích xuất thông tin Top-level
    def _get_metric(keys: list[str], cast_type=float):
        for k in keys:
            val = analysis_data.get(k)
            if _is_valid_number(val):
                return cast_type(float(val))
        return None

    duration = _get_metric(["duration_seconds", "duration"])
    total_frames = _get_metric(["total_frames", "totalFrames"], int)
    processed_frames = _get_metric(["processed_frames", "processedFrames"], int)
    total_faces = _get_metric(["total_faces", "totalFaces"], int)

    has_data = bool(
        clean_summary or face_samples or timeline_samples or 
        duration is not None or total_frames is not None or 
        processed_frames is not None or total_faces is not None
    )
    if not has_data:
        raise ValueError("analysis_data không chứa kết quả Video DeepFace hợp lệ")

    return {
        "mode": "video",
        "source_type": "video",
        "duration_seconds": duration,
        "total_frames": total_frames,
        "processed_frames": processed_frames,
        "total_faces": total_faces,
        "emotion_summary": clean_summary,
        "summary_unit": analysis_data.get("summary_unit") or analysis_data.get("summaryUnit", "unknown"),
        "face_samples": face_samples,
        "face_samples_are_limited": len(raw_faces) > MAX_VIDEO_FACE_SAMPLES,
        "timeline_samples": timeline_samples,
        "timeline_is_sampled": len(raw_timeline) > MAX_VIDEO_TIMELINE_SAMPLES,
        "data_origin": "deepface_video_analysis",
        "note": (
            "Các nhãn biểu cảm là dự đoán của DeepFace; không phải bằng chứng "
            "chắc chắn về cảm xúc thật hoặc tình trạng sức khỏe của người trong video."
        ),
    }

def _normalize_live_data(analysis_data: dict[str, Any]) -> dict[str, Any]:
    """Hỗ trợ cả tên thuộc tính snake_case và camelCase từ React."""
    if not isinstance(analysis_data, dict):
        raise ValueError("analysis_data phải là JSON object")

    normalized = dict(analysis_data)
    if "emotion_summary" not in normalized:
        normalized["emotion_summary"] = normalized.get("emotionSummary")
    if "processed_frames" not in normalized:
        normalized["processed_frames"] = normalized.get("processedFrames")
    if "summary_unit" not in normalized:
        normalized["summary_unit"] = normalized.get("summaryUnit", "unknown")
    return normalized

async def ask_emotion_chatbot(
    *,
    mode: ChatMode,
    message: str,
    db: AsyncSession | None = None,
    session_id: UUID | None = None,
    source_type: str = "all",
    analysis_data: dict[str, Any] | None = None,
    video_path: str | Path | None = None,
    window_seconds: int = 30,
    limit: int = 20,
) -> dict[str, Any]:

    if not isinstance(message, str):
        raise ValueError("message phải là chuỗi")
    message = message.strip()
    if not message or len(message) > MAX_MESSAGE_LENGTH:
        raise ValueError(
            f"Câu hỏi phải dài từ 1 đến {MAX_MESSAGE_LENGTH} ký tự"
        )

    if mode == "live":
        context = build_live_context(
            _normalize_live_data(analysis_data or {}),
            window_seconds=window_seconds,
        )
        ai_result = await generate_with_fallback(
            message=message,
            context=context,
        )

    elif mode == "video":
        if video_path is None:
            raise ValueError(
                "Thiếu video_path. Backend cần truyền đường dẫn video đã lưu."
            )

        # Ưu tiên dữ liệu DB khi caller chỉ rõ phiên Video đã lưu.
        if db is not None and session_id is not None:
            context = await build_dashboard_context(
                db,
                session_id=session_id,
                source_type="video",
                limit=1,
            )
        elif analysis_data is not None:
            context = _build_video_context(analysis_data)
        else:
            # Gemini vẫn có thể phân tích trực tiếp video khi không có thống kê DeepFace.
            context = None

        ai_result = await analyze_video_content(
            video_path=video_path,
            prompt=message,
            context=context,
        )

    elif mode == "dashboard":
        if db is None:
            raise ValueError("Thiếu AsyncSession để đọc lịch sử Dashboard")
        context = await build_dashboard_context(
            db,
            session_id=session_id,
            source_type=source_type,
            limit=limit,
        )
        ai_result = await generate_with_fallback(
            message=message,
            context=context,
        )

    else:
        raise ValueError("mode chỉ nhận 'live', 'video' hoặc 'dashboard'")

    context_scope = context.get("scope", mode) if context else mode
    return {
        "success": True,
        "mode": mode,
        "answer": ai_result["answer"],
        "model": ai_result["model"],
        "used_fallback": ai_result["used_fallback"],
        "attempted_models": ai_result.get("attempted_models", []),
        "input_type": ai_result.get("input_type", "text"),
        "scope": context_scope,
    }

