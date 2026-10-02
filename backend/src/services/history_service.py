from collections import Counter
from datetime import timedelta
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.repositories.analysis_repository import (
    delete_analysis_session,
    get_analysis_session_by_id,
    get_analysis_sessions,
)


def _format_duration(seconds: float) -> str:
    duration = timedelta(seconds=max(0, int(seconds)))
    total_seconds = int(duration.total_seconds())
    minutes, seconds = divmod(total_seconds, 60)
    return f"{minutes:02d}:{seconds:02d}"


def _session_to_history(session: Any) -> dict[str, Any]:
    faces = list(session.face_analyses)
    representative_faces: dict[int, Any] = {}

    for index, face in enumerate(faces):
        face_id = face.track_id if face.track_id is not None else index
        current = representative_faces.get(face_id)
        if current is None or face.confidence > current.confidence:
            representative_faces[face_id] = face

    emotion_counts = Counter(face.dominant_emotion for face in faces)
    dominant_emotion = (
        emotion_counts.most_common(1)[0][0] if emotion_counts else "neutral"
    )
    emotion_totals: dict[str, float] = {}
    for face in faces:
        for emotion, score in (face.emotion_scores or {}).items():
            emotion_totals[emotion] = emotion_totals.get(emotion, 0.0) + float(score)

    total_score = sum(emotion_totals.values())
    emotion_summary = (
        {
            emotion: round(score / total_score * 100, 2)
            for emotion, score in emotion_totals.items()
        }
        if total_score
        else {}
    )

    if session.source_type == "video":
        timestamps = [face.timestamp or 0.0 for face in faces]
        duration = max(timestamps, default=0.0) + (1.0 if timestamps else 0.0)
    else:
        duration = 0.0

    return {
        "id": str(session.id),
        "created_at": session.started_at.isoformat(),
        "type": session.source_type,
        "type_label": "Ảnh" if session.source_type == "image" else "Video",
        "filename": session.source_name,
        "quick_result": dominant_emotion,
        "dominant_emotion": dominant_emotion,
        "duration": _format_duration(duration),
        "total_faces": len(representative_faces),
        "positive_rate": 0,
        "emotion_summary": emotion_summary,
        "timeline": [],
        "faces": [
            {
                "id": face_id,
                "dominantEmotion": face.dominant_emotion,
                "confidence": face.confidence,
                "x": (face.bbox or {}).get("x", 0),
                "y": (face.bbox or {}).get("y", 0),
                "width": (face.bbox or {}).get("width", 0),
                "height": (face.bbox or {}).get("height", 0),
            }
            for face_id, face in representative_faces.items()
        ],
    }


async def get_history_service(
    db: AsyncSession,
    source_type: str,
) -> list[dict[str, Any]]:
    sessions = await get_analysis_sessions(db=db, source_type=source_type)
    return [_session_to_history(session) for session in sessions]


async def get_history_detail_service(
    db: AsyncSession,
    session_id: UUID,
) -> dict[str, Any] | None:
    session = await get_analysis_session_by_id(db=db, session_id=session_id)
    return _session_to_history(session) if session is not None else None


async def delete_history_service(
    db: AsyncSession,
    session_id: UUID,
) -> bool:
    deleted = await delete_analysis_session(db=db, session_id=session_id)
    if deleted:
        await db.commit()
    return deleted
