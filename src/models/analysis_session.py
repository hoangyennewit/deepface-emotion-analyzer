import uuid
from datetime import datetime
from sqlalchemy import DateTime, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.db.base import Base
from src.models.face_analysic import FaceAnalysis

class AnalysisSession(Base):
    __tablename__ = "analysis_sessions"
    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False)
    source_name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="processing")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    face_analyses: Mapped[list["FaceAnalysis"]] = relationship(back_populates="analysis_session", cascade="all, delete-orphan")
