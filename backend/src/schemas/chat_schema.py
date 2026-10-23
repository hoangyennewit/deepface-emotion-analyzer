from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


ChatMode = Literal["live", "video", "dashboard"]
ChatSourceType = Literal["image", "video", "webcam", "all"]


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mode: ChatMode
    message: str = Field(min_length=1, max_length=2000)
    session_id: UUID | None = None
    source_type: ChatSourceType = "all"
    analysis_data: dict[str, Any] | None = None
    video_file_id: UUID | None = None
    window_seconds: int = Field(default=30, ge=1, le=300)
    limit: int = Field(default=20, ge=1, le=20)

    @model_validator(mode="after")
    def validate_mode_requirements(self) -> "ChatRequest":
        if self.mode == "live" and self.analysis_data is None:
            raise ValueError("analysis_data là bắt buộc với mode live")
        if self.mode == "video" and self.video_file_id is None:
            raise ValueError("video_file_id là bắt buộc với mode video")
        if self.mode != "video" and self.video_file_id is not None:
            raise ValueError("video_file_id chỉ được dùng với mode video")
        return self


class ChatResponse(BaseModel):
    success: bool
    mode: ChatMode
    answer: str
    model: str
    used_fallback: bool
    attempted_models: list[str]
    input_type: Literal["text", "video"]
    scope: str