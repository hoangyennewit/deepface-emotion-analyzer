# =========================================================
# face_analysic.py
# =========================================================

# [THÊM]
# Cho phép type hint dùng tên class chưa được import runtime.
from __future__ import annotations

import uuid
from datetime import datetime

# [CHỈNH]
# Thêm TYPE_CHECKING để tránh circular import.
from typing import Any, TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
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
# KHÔNG còn import trực tiếp:
#
# from src.models.analysis_session import AnalysisSession
#
# vì sẽ tạo circular import.
# =========================================================


# [THÊM]
# Chỉ dùng cho type checker / VS Code.
# Không chạy lúc runtime.
if TYPE_CHECKING:
    from src.models.analysis_session import AnalysisSession


class FaceAnalysis(Base):

    __tablename__ = "face_analyses"

    # =====================================================
    # ID
    # =====================================================

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # =====================================================
    # FOREIGN KEY -> analysis_sessions
    # =====================================================

    # [CHỈNH]
    # Khai báo rõ kiểu Uuid.
    session_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(
            "analysis_sessions.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    # =====================================================
    # FACE / FRAME
    # =====================================================

    track_id: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    frame_index: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    # =====================================================
    # EMOTION RESULT
    # =====================================================

    dominant_emotion: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    confidence: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    emotion_scores: Mapped[dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
    )

    # =====================================================
    # [CHỈNH]
    # CŨ:
    #
    # bbox: Mapped[list[int | None]]
    #
    # Repository / Service hiện đang lưu dạng:
    #
    # {
    #     "x": ...,
    #     "y": ...,
    #     "width": ...,
    #     "height": ...
    # }
    # =====================================================

    bbox: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
    )

    # =====================================================
    # Repository hiện đang truyền timestamp khi lưu
    # FaceAnalysis.
    #
    # Ảnh:
    # timestamp = 0.0
    #
    # Video:
    # timestamp = vị trí tính theo giây
    # =====================================================

    timestamp: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    # =====================================================
    # THỜI ĐIỂM RECORD ĐƯỢC TẠO
    # =====================================================

    analyzed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # =====================================================
    # RELATIONSHIP
    # =====================================================

    analysis_session: Mapped["AnalysisSession"] = relationship(
        "AnalysisSession",
        back_populates="face_analyses",
    )