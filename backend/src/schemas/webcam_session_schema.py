from pydantic import BaseModel, Field, field_validator

VALID_EMOTIONS = {"angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"}


class WebcamFaceSample(BaseModel):
    track_id: int | None = None
    dominant_emotion: str
    confidence: float = Field(ge=0, le=100)
    emotion: dict[str, float]
    bbox: list[float] | None = Field(default=None, min_length=4, max_length=4)

    @field_validator("dominant_emotion")
    @classmethod
    def _check_dominant(cls, value: str) -> str:
        if value not in VALID_EMOTIONS:
            raise ValueError("Nhãn cảm xúc không hợp lệ")
        return value

    @field_validator("emotion")
    @classmethod
    def _check_scores(cls, value: dict[str, float]) -> dict[str, float]:
        if not value or not set(value) <= VALID_EMOTIONS:
            raise ValueError("Điểm cảm xúc không hợp lệ")
        return value


class WebcamSample(BaseModel):
    time: float = Field(ge=0)
    faces: list[WebcamFaceSample] = Field(default_factory=list, max_length=20)


class WebcamSessionPayload(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    duration: float = Field(ge=0, le=4 * 3600)
    samples: list[WebcamSample] = Field(default_factory=list, max_length=14400)