from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.analysis_session import AnalysisSession
from src.models.face_analysis import FaceAnalysis


# =========================================================
# ANALYSIS SESSION
# =========================================================

async def create_analysis_session(
    db: AsyncSession,
    source_type: str,
    source_name: str,
) -> AnalysisSession:
    """
    Tạo một phiên phân tích mới.

    source_type:
        image | video | webcam

    source_name:
        tên file được phân tích
    """

    analysis_session = AnalysisSession(
        source_type=source_type,
        source_name=source_name,
        status="processing",
    )

    db.add(analysis_session)

    # Gửi INSERT xuống DB nhưng chưa commit transaction.
    await db.flush()

    # Lấy các giá trị DB tự sinh như id.
    await db.refresh(analysis_session)

    return analysis_session


async def get_analysis_session_by_id(
    db: AsyncSession,
    session_id,
) -> Optional[AnalysisSession]:

    result = await db.execute(
        select(AnalysisSession).where(
            AnalysisSession.id == session_id
        )
    )

    return result.scalar_one_or_none()


async def get_analysis_sessions(
    db: AsyncSession,
    source_type: Optional[str] = None,
    offset: int = 0,
    limit: int = 50,
) -> list[AnalysisSession]:

    query = select(AnalysisSession)

    if source_type and source_type != "all":
        query = query.where(
            AnalysisSession.source_type
            == source_type
        )

    query = (
        query
        .order_by(
            AnalysisSession.started_at.desc()
        )
        .offset(offset)
        .limit(limit)
    )

    result = await db.execute(query)

    return list(
        result.scalars().all()
    )


async def complete_analysis_session(
    db: AsyncSession,
    session_id,
) -> Optional[AnalysisSession]:

    analysis_session = (
        await get_analysis_session_by_id(
            db,
            session_id,
        )
    )

    if analysis_session is None:
        return None

    analysis_session.status = "completed"

    analysis_session.ended_at = (
        datetime.now(timezone.utc)
    )

    await db.flush()
    await db.refresh(analysis_session)

    return analysis_session


async def fail_analysis_session(
    db: AsyncSession,
    session_id,
) -> Optional[AnalysisSession]:

    analysis_session = (
        await get_analysis_session_by_id(
            db,
            session_id,
        )
    )

    if analysis_session is None:
        return None

    analysis_session.status = "failed"

    analysis_session.ended_at = (
        datetime.now(timezone.utc)
    )

    await db.flush()
    await db.refresh(analysis_session)

    return analysis_session


# =========================================================
# FACE ANALYSIS
# =========================================================

async def create_face_analysis(
    db: AsyncSession,
    session_id,
    track_id: Optional[int],
    frame_index: Optional[int],
    dominant_emotion: str,
    confidence: float,
    emotion_scores: dict,
    bbox: Optional[dict],
    timestamp: Optional[float],
) -> FaceAnalysis:

    face_analysis = FaceAnalysis(
        session_id=session_id,
        track_id=track_id,
        frame_index=frame_index,
        dominant_emotion=dominant_emotion,
        confidence=confidence,
        emotion_scores=emotion_scores,
        bbox=bbox,
        timestamp=timestamp,
    )

    db.add(face_analysis)

    await db.flush()
    await db.refresh(face_analysis)

    return face_analysis


async def create_face_analyses(
    db: AsyncSession,
    session_id,
    faces: list[dict],
) -> list[FaceAnalysis]:
    """
    Lưu nhiều kết quả khuôn mặt cùng lúc.

    faces phải sử dụng key tương ứng với FaceAnalysis:
    track_id
    frame_index
    dominant_emotion
    confidence
    emotion_scores
    bbox
    timestamp
    """

    face_records: list[FaceAnalysis] = []

    for face in faces:

        record = FaceAnalysis(
            session_id=session_id,
            track_id=face.get(
                "track_id"
            ),
            frame_index=face.get(
                "frame_index"
            ),
            dominant_emotion=face.get(
                "dominant_emotion",
                "neutral",
            ),
            confidence=face.get(
                "confidence",
                0.0,
            ),
            emotion_scores=face.get(
                "emotion_scores",
                {},
            ),
            bbox=face.get("bbox"),
            timestamp=face.get(
                "timestamp"
            ),
        )

        face_records.append(record)

    db.add_all(face_records)

    await db.flush()

    return face_records


async def get_face_analyses_by_session(
    db: AsyncSession,
    session_id,
) -> list[FaceAnalysis]:

    result = await db.execute(
        select(FaceAnalysis)
        .where(
            FaceAnalysis.session_id
            == session_id
        )
        .order_by(
            FaceAnalysis.frame_index.asc()
        )
    )

    return list(
        result.scalars().all()
    )


# =========================================================
# DELETE
# =========================================================

async def delete_analysis_session(
    db: AsyncSession,
    session_id,
) -> bool:

    analysis_session = (
        await get_analysis_session_by_id(
            db,
            session_id,
        )
    )

    if analysis_session is None:
        return False

    await db.delete(
        analysis_session
    )

    await db.flush()

    return True