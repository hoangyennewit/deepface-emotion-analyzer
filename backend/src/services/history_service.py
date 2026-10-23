import asyncio
import math
from collections import Counter, defaultdict
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.repositories.analysis_repository import (
    delete_analysis_session,
    get_analysis_session_by_id,
    get_analysis_sessions,
)
from src.services.media_storage import delete_session_media, to_url

POSITIVE_EMOTIONS = ("happy", "surprise")
TYPE_LABELS = {"image": "Ảnh", "video": "Video", "webcam": "Webcam"}

# Kích thước frame mà analyze_video_service đã dùng khi phân tích (resize_to),
# bbox của video được lưu theo hệ tọa độ này. Phải khớp với resize_to=(640, 360).
VIDEO_ANALYSIS_SIZE = (640, 360)

# Ghép khuôn mặt giữa các mốc thời gian thành "một người".
IOU_MATCH_THRESHOLD = 0.2  # bbox chồng lấp tối thiểu để coi là cùng một người
PERSON_MAX_GAP = 3.0  # quá ngần này giây không thấy thì không ghép tiếp
PERSON_MIN_APPEARANCE_RATIO = 0.2  # loại "người ảo" chỉ xuất hiện ở vài mốc


def _format_duration(seconds: float) -> str:
    minutes, secs = divmod(max(0, int(seconds)), 60)
    return f"{minutes:02d}:{secs:02d}"


def _average_scores(score_dicts: list[dict[str, Any]]) -> dict[str, float]:
    """Cộng điểm từng cảm xúc rồi chuẩn hóa về tổng 100."""
    totals: dict[str, float] = defaultdict(float)
    for scores in score_dicts:
        for emotion, value in (scores or {}).items():
            totals[emotion] += float(value)
    grand_total = sum(totals.values())
    if not grand_total:
        return {}
    return {e: round(v / grand_total * 100, 2) for e, v in totals.items()}


def _build_timeline(faces: list[Any]) -> list[dict[str, Any]]:
    """Gộp các khuôn mặt cùng mốc thời gian, lấy trung bình điểm cảm xúc."""
    by_time: dict[float, list[dict[str, Any]]] = defaultdict(list)
    for face in faces:
        by_time[round(face.timestamp or 0.0, 1)].append(face.emotion_scores)
    return [
        {"time": time, "emotions": _average_scores(scores)}
        for time, scores in sorted(by_time.items())
    ]


def _count_people(faces: list[Any]) -> int:
    """Có track_id thì đếm số id khác nhau, không thì lấy số mặt nhiều nhất trong một mốc."""
    track_ids = {f.track_id for f in faces if f.track_id is not None}
    if track_ids:
        return len(track_ids)
    per_moment = Counter(round(f.timestamp or 0.0, 1) for f in faces)
    return max(per_moment.values(), default=0)


def _bbox_to_percent(
    bbox: dict | None, width: int | None, height: int | None
) -> dict[str, float]:
    if not bbox or not width or not height:
        return {"x": 0.0, "y": 0.0, "width": 0.0, "height": 0.0}
    return {
        "x": round(bbox.get("x", 0) / width * 100, 2),
        "y": round(bbox.get("y", 0) / height * 100, 2),
        "width": round(bbox.get("width", 0) / width * 100, 2),
        "height": round(bbox.get("height", 0) / height * 100, 2),
    }


def _build_faces(session: Any, faces: list[Any]) -> list[dict[str, Any]]:
    """Chỉ dùng cho ảnh: mỗi người giữ lần phát hiện có độ tin cậy cao nhất."""
    best: dict[int, Any] = {}
    for index, face in enumerate(faces):
        key = face.track_id if face.track_id is not None else index
        if key not in best or face.confidence > best[key].confidence:
            best[key] = face
    return [
        {
            "id": key,
            "dominantEmotion": face.dominant_emotion,
            "confidence": face.confidence,
            **_bbox_to_percent(face.bbox, session.media_width, session.media_height),
        }
        for key, face in best.items()
    ]


# ---------------------------------------------------------------------------
# Theo dõi từng người trong video / webcam
# ---------------------------------------------------------------------------


def _moment(face: Any) -> float:
    return round(face.timestamp or 0.0, 1)


def _valid_bbox(bbox: Any) -> bool:
    return (
        isinstance(bbox, dict)
        and bbox.get("width", 0) > 0
        and bbox.get("height", 0) > 0
    )


def _iou(a: dict, b: dict) -> float:
    ax, ay, aw, ah = a["x"], a["y"], a["width"], a["height"]
    bx, by, bw, bh = b["x"], b["y"], b["width"], b["height"]
    inter_w = min(ax + aw, bx + bw) - max(ax, bx)
    inter_h = min(ay + ah, by + bh) - max(ay, by)
    if inter_w <= 0 or inter_h <= 0:
        return 0.0
    inter = inter_w * inter_h
    union = aw * ah + bw * bh - inter
    return inter / union if union > 0 else 0.0


def _assign_people(faces: list[Any]) -> dict[int, int]:
    """
    Ghép khuôn mặt giữa các mốc thời gian theo độ chồng lấp bbox (IoU).
    Trả về {vị trí của face trong list: person_id}.
    Người được đánh số theo thứ tự xuất hiện, cùng lúc thì từ trái sang phải.
    """
    by_moment: dict[float, list[int]] = defaultdict(list)
    for index, face in enumerate(faces):
        if _valid_bbox(face.bbox):
            by_moment[_moment(face)].append(index)

    assigned: dict[int, int] = {}
    last_box: dict[int, dict] = {}
    last_seen: dict[int, float] = {}
    next_id = 0

    for moment, indexes in sorted(by_moment.items()):
        indexes.sort(key=lambda i: faces[i].bbox.get("x", 0))

        # Bỏ những người đã vắng mặt quá lâu để không ghép nhầm sang người mới.
        for pid in [p for p, seen in last_seen.items() if moment - seen > PERSON_MAX_GAP]:
            last_box.pop(pid, None)
            last_seen.pop(pid, None)

        pairs = sorted(
            (
                (_iou(faces[i].bbox, box), i, pid)
                for i in indexes
                for pid, box in last_box.items()
            ),
            reverse=True,
        )

        used_faces: set[int] = set()
        used_people: set[int] = set()
        for score, i, pid in pairs:
            if score < IOU_MATCH_THRESHOLD:
                break
            if i in used_faces or pid in used_people:
                continue
            assigned[i] = pid
            used_faces.add(i)
            used_people.add(pid)
            last_box[pid] = faces[i].bbox
            last_seen[pid] = moment

        for i in indexes:
            if i in used_faces:
                continue
            assigned[i] = next_id
            last_box[next_id] = faces[i].bbox
            last_seen[next_id] = moment
            next_id += 1

    return assigned


def _build_people(faces: list[Any], assigned: dict[int, int]) -> list[dict[str, Any]]:
    """Tổng hợp riêng cho từng người: cảm xúc chủ đạo, tỉ lệ, timeline."""
    groups: dict[int, list[Any]] = defaultdict(list)
    for index, person_id in assigned.items():
        groups[person_id].append(faces[index])

    moments = {_moment(f) for f in faces}
    needed = max(1, math.ceil(len(moments) * PERSON_MIN_APPEARANCE_RATIO))

    people = []
    for person_id in sorted(groups):
        person_faces = groups[person_id]
        appeared = {_moment(f) for f in person_faces}
        if len(appeared) < needed:
            continue
        summary = _average_scores([f.emotion_scores for f in person_faces])
        counts = Counter(f.dominant_emotion for f in person_faces)
        people.append(
            {
                "id": person_id,
                "appearance_rate": round(len(appeared) / max(len(moments), 1) * 100),
                "dominant_emotion": counts.most_common(1)[0][0],
                "positive_rate": round(
                    sum(summary.get(e, 0.0) for e in POSITIVE_EMOTIONS), 1
                ),
                "emotion_summary": summary,
                "timeline": _build_timeline(person_faces),
            }
        )
    return people


def _reference_size(session: Any, faces: list[Any]) -> tuple[float, float]:
    """Kích thước ảnh mà bbox đã lưu đang dựa vào, để đổi sang phần trăm."""
    if session.source_type == "video":
        return VIDEO_ANALYSIS_SIZE
    if session.media_width and session.media_height:
        return session.media_width, session.media_height
    boxes = [f.bbox for f in faces if _valid_bbox(f.bbox)]
    width = max((b["x"] + b["width"] for b in boxes), default=1) or 1
    height = max((b["y"] + b["height"] for b in boxes), default=1) or 1
    return width, height


def _build_samples(
    session: Any,
    faces: list[Any],
    assigned: dict[int, int],
    people: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Khung mặt của từng người theo mốc thời gian, dùng để vẽ đè lên video."""
    kept = {p["id"] for p in people}
    width, height = _reference_size(session, faces)

    by_moment: dict[float, list[dict[str, Any]]] = defaultdict(list)
    for index, person_id in assigned.items():
        if person_id not in kept:
            continue
        face = faces[index]
        box = _bbox_to_percent(face.bbox, width, height)
        by_moment[_moment(face)].append(
            {
                "id": person_id,
                "dominantEmotion": face.dominant_emotion,
                "confidence": face.confidence,
                **{k: max(0.0, min(100.0, v)) for k, v in box.items()},
            }
        )
    return [
        {"time": time, "faces": items} for time, items in sorted(by_moment.items())
    ]


# ---------------------------------------------------------------------------


def _quick_result(status: str, has_faces: bool, dominant: str) -> str:
    if status == "processing":
        return "Đang xử lý"
    if status == "failed":
        return "Thất bại"
    return dominant if has_faces else "Không có khuôn mặt"


def _session_to_history(session: Any, *, detail: bool) -> dict[str, Any]:
    faces = list(session.face_analyses)

    emotion_counts = Counter(f.dominant_emotion for f in faces)
    dominant = emotion_counts.most_common(1)[0][0] if emotion_counts else "neutral"
    summary = _average_scores([f.emotion_scores for f in faces])

    if session.duration_seconds is not None:
        duration = session.duration_seconds
    elif session.source_type == "image" or not faces:
        duration = 0.0
    else:  # bản ghi cũ chưa có duration_seconds
        duration = max((f.timestamp or 0.0) for f in faces) + 1.0

    is_image = session.source_type == "image"

    # Video / webcam: ghép từng người để thống kê riêng và vẽ khung theo thời gian.
    people: list[dict[str, Any]] = []
    assigned: dict[int, int] = {}
    if not is_image and faces:
        assigned = _assign_people(faces)
        people = _build_people(faces, assigned)

    return {
        "id": str(session.id),
        "created_at": session.started_at.isoformat(),
        "type": session.source_type,
        "type_label": TYPE_LABELS.get(session.source_type, session.source_type),
        "status": session.status,
        "filename": session.source_name,
        "quick_result": _quick_result(session.status, bool(faces), dominant),
        "dominant_emotion": dominant,
        "duration": _format_duration(duration),
        "duration_seconds": duration,
        "total_faces": len(people) if people else _count_people(faces),
        "positive_rate": round(sum(summary.get(e, 0.0) for e in POSITIVE_EMOTIONS), 1),
        "emotion_summary": summary,
        "media_url": to_url(session.media_path),
        "thumbnail_url": to_url(session.thumbnail_path),
        # Danh sách chỉ trả bản nhẹ, timeline và khuôn mặt chỉ có ở trang chi tiết
        "timeline": _build_timeline(faces) if detail and not is_image else [],
        "faces": _build_faces(session, faces) if detail and is_image else [],
        "people": people if detail else [],
        "samples": _build_samples(session, faces, assigned, people) if detail else [],
    }


async def get_history_service(db: AsyncSession, source_type: str) -> list[dict[str, Any]]:
    sessions = await get_analysis_sessions(db=db, source_type=source_type)
    return [_session_to_history(s, detail=False) for s in sessions]


async def get_history_detail_service(db: AsyncSession, session_id: UUID) -> dict[str, Any] | None:
    session = await get_analysis_session_by_id(db=db, session_id=session_id)
    return _session_to_history(session, detail=True) if session is not None else None


async def delete_history_service(db: AsyncSession, session_id: UUID) -> bool:
    deleted = await delete_analysis_session(db=db, session_id=session_id)
    if deleted:
        await db.commit()
        # Chỉ xóa file sau khi DB đã commit thành công
        await asyncio.to_thread(delete_session_media, session_id)
    return deleted