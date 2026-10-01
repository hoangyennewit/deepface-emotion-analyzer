from __future__ import annotations
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    String,
    Uuid,
    func,
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from src.db.base import Base


# =========================================================
# [XÓA]
#
# KHÔNG còn:
#
# from src.models.face_analysic import FaceAnalysis
#
# vì đây chính là import ngược gây circular import.
# =========================================================


# [THÊM]
# Chỉ phục vụ type hint.
if TYPE_CHECKING:
    from src.models.face_analysic import FaceAnalysis


class AnalysisSession(Base):

    __tablename__ = "analysis_sessions"

    # =====================================================
    # PRIMARY KEY
    # =====================================================

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # =====================================================
    # SOURCE
    #
    # image | video | webcam
    # =====================================================

    source_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    source_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    # =====================================================
    # STATUS
    #
    # processing | completed | failed
    # =====================================================

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="processing",
    )

    # =====================================================
    # TIME
    # =====================================================

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    ended_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # =====================================================
    # RELATIONSHIP
    # =====================================================

    # [CHỈNH]
    # Không import FaceAnalysis runtime.
    #
    # SQLAlchemy sẽ resolve "FaceAnalysis" sau khi
    # model được load.
    face_analyses: Mapped[list["FaceAnalysis"]] = relationship(
        "FaceAnalysis",
        back_populates="analysis_session",

        # Khi xóa AnalysisSession,
        # xóa luôn các FaceAnalysis liên quan.
        cascade="all, delete-orphan",

        # DB đã có ON DELETE CASCADE.
        passive_deletes=True,
    )