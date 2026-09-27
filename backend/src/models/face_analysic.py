import uuid
from datetime import datetime
from typing import Any
from sqlalchemy import DateTime, String, Uuid, func, JSON, ForeignKey, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.src.db.base import Base
from backend.src.models.analysis_session import AnalysisSession

class FaceAnalysis(Base):
    __tablename__ = "face_analyses"
    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("analysis_sessions.id", ondelete="CASCADE"), nullable=False
    )
    track_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    frame_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    domiant_emotion: Mapped[str] = mapped_column(String(50), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    emotion_scores: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    bbox: Mapped[list[int | None]] = mapped_column(JSON, nullable=True)
    analyzed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    session: Mapped["AnalysisSession"] = relationship(back_populates="face_analyses")
