from __future__ import annotations

import math
from collections import Counter, defaultdict
from datetime import datetime
from typing import Any, Iterable
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.repositories.analysis_repository import (
    get_analysis_session_by_id,
    get_analysis_sessions,
    get_face_analyses_by_session,
)

SOURCES = frozenset({"image", "video", "webcam", "all"})
MAX_DASHBOARD_SESSIONS = 20
MAX_TIMELINE_SAMPLES = 30


def _number(value: Any) -> float | None:
    """Chuyển giá trị thành số hữu hạn; bỏ qua bool, NaN và infinity."""
    if value is None or isinstance(value, bool):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def _non_negative_int(value: Any) -> int | None:
    """Chuẩn hóa số nguyên không âm, tránh nhận bool như một số nguyên."""
    number = _number(value)
    if number is None or number < 0:
        return None
    return int(number)


def _iso(value: Any) -> str | None:
    """Định dạng datetime ORM thành chuỗi ISO-8601 nếu có."""
    return value.isoformat() if isinstance(value, datetime) else None


def _sample_evenly(items: list[dict[str, Any]], limit: int) -> list[dict[str, Any]]:
    """Lấy mẫu đều để không gửi toàn bộ timeline dài cho Gemini."""
    if len(items) <= limit:
        return items
    if limit <= 1:
        return [items[-1]]
    indices = [round(i * (len(items) - 1) / (limit - 1)) for i in range(limit)]
    return [items[index] for index in indices]


def _dominant_emotion(emotions: dict[str, float]) -> str | None:
    if not emotions:
        return None
    return max(emotions, key=emotions.get)


def summarize_faces(faces: Iterable[Any]) -> dict[str, Any]:
    """Tính thống kê bằng Python thay vì yêu cầu Gemini tự tính.

    Các phần trăm được tính trên những bản ghi có nhãn dominant_emotion hợp lệ.
    Điểm emotion_scores được lấy trung bình trên các bản ghi có điểm tương ứng.
    """
    rows = list(faces)
    dominant_counts: Counter[str] = Counter()
    score_sum: dict[str, float] = defaultdict(float)
    score_count: Counter[str] = Counter()
    timeline: list[dict[str, Any]] = []

    for row in rows:
        label_value = getattr(row, "dominant_emotion", None)
        label = str(label_value).strip() if label_value is not None else ""
        if label:
            dominant_counts[label] += 1

        scores = getattr(row, "emotion_scores", None) or {}
        if isinstance(scores, dict):
            for name, value in scores.items():
                numeric = _number(value)
                if numeric is None or numeric < 0:
                    continue
                emotion_name = str(name).strip()
                if not emotion_name:
                    continue
                score_sum[emotion_name] += numeric
                score_count[emotion_name] += 1

        timeline_item: dict[str, Any] = {}
        timestamp = _number(getattr(row, "timestamp", None))
        frame_index = _non_negative_int(getattr(row, "frame_index", None))
        if timestamp is not None:
            timeline_item["timestamp_seconds"] = round(timestamp, 3)
        if frame_index is not None:
            timeline_item["frame_index"] = frame_index
        if label:
            timeline_item["dominant_emotion"] = label
        if timeline_item:
            timeline.append(timeline_item)

    sampled_timeline = _sample_evenly(timeline, MAX_TIMELINE_SAMPLES)
    labelled_observations = sum(dominant_counts.values())

    return {
        "face_observations": len(rows),
        "labelled_observations": labelled_observations,
        "dominant_counts": dict(dominant_counts),
        "dominant_percent": {
            label: round(count * 100 / labelled_observations, 2)
            for label, count in dominant_counts.items()
        } if labelled_observations else {},
        "average_emotion_scores": {
            name: round(total / score_count[name], 3)
            for name, total in score_sum.items()
            if score_count[name]
        },
        "timeline_samples": sampled_timeline,
        "timeline_is_sampled": len(timeline) > MAX_TIMELINE_SAMPLES,
    }


def build_live_context(
    analysis_data: dict[str, Any],
    *,
    window_seconds: int = 30,
) -> dict[str, Any] | None:
    """Chuẩn hóa thống kê Webcam live được truyền từ pipeline hiện tại.

    ``analysis_data`` phải là dữ liệu thật do DeepFace/pipeline cung cấp;
    hàm này không tự tạo kết quả dự đoán.
    """
    if not isinstance(analysis_data, dict):
        raise ValueError("analysis_data phải là JSON object")
    if isinstance(window_seconds, bool) or not isinstance(window_seconds, int):
        raise ValueError("window_seconds phải là số nguyên")
    if not 1 <= window_seconds <= 300:
        raise ValueError("window_seconds phải trong khoảng 1..300")

    raw_summary = analysis_data.get("emotion_summary")
    if raw_summary is None:
        raw_summary = analysis_data.get("emotionSummary")
    if raw_summary is None:
        raw_summary = {}
    if not isinstance(raw_summary, dict):
        raise ValueError("emotion_summary phải là JSON object")

    summary: dict[str, float] = {}
    for name, value in raw_summary.items():
        numeric = _number(value)
        emotion_name = str(name).strip()
        if numeric is not None and numeric >= 0 and emotion_name:
            summary[emotion_name] = round(numeric, 3)

    raw_timeline = analysis_data.get("timeline") or []
    timeline_samples: list[dict[str, Any]] = []
    if isinstance(raw_timeline, list):
        for item in raw_timeline[-MAX_TIMELINE_SAMPLES:]:
            if not isinstance(item, dict):
                continue
            sample: dict[str, Any] = {}
            time_value = _number(item.get("time", item.get("timestamp_seconds")))
            if time_value is not None:
                sample["timestamp_seconds"] = round(time_value, 3)

            emotions = item.get("emotions")
            if isinstance(emotions, dict):
                clean_emotions = {
                    str(name): round(number, 3)
                    for name, value in emotions.items()
                    if (number := _number(value)) is not None and number >= 0
                }
                if clean_emotions:
                    sample["emotions"] = clean_emotions
                    sample["dominant_emotion"] = (
                        str(item.get("dominant_emotion") or item.get("dominantEmotion"))
                        if item.get("dominant_emotion") or item.get("dominantEmotion")
                        else _dominant_emotion(clean_emotions)
                    )
            if sample:
                timeline_samples.append(sample)

    processed_frames = _non_negative_int(
        analysis_data.get("processed_frames", analysis_data.get("processedFrames"))
    )
    total_faces = _non_negative_int(
        analysis_data.get("total_faces", analysis_data.get("totalFaces"))
    )
    raw_unit = analysis_data.get(
        "summary_unit", analysis_data.get("summaryUnit", "unknown")
    )
    summary_unit = str(raw_unit or "unknown").strip().lower()

    if not summary and not timeline_samples and processed_frames is None and total_faces is None:
        return None

    # Chỉ tính phần trăm khi nguồn dữ liệu xác nhận emotion_summary là số đếm.
    # Không dùng processed_frames hoặc total_faces làm mẫu số thay thế.
    count_units = {"count", "counts", "observation_count", "observations"}
    summary_total = round(sum(summary.values()), 3) if summary_unit in count_units else None
    summary_percent = (
        {
            label: round(value * 100 / summary_total, 2)
            for label, value in summary.items()
        }
        if summary_total is not None and summary_total > 0
        else None
    )

    return {
        "mode": "live",
        "source_type": "webcam",
        "window_seconds": window_seconds,
        "processed_frames": processed_frames,
        "total_faces": total_faces,
        "emotion_summary": summary,
        "emotion_summary_unit": summary_unit,
        "emotion_summary_total": summary_total,
        "emotion_summary_percent": summary_percent,
        "timeline_samples": timeline_samples,
        "data_origin": "live_webcam_deepface_pipeline",
        "note": (
            "Các nhãn biểu cảm là dự đoán của DeepFace, không xác nhận cảm xúc thật "
            "hoặc tình trạng sức khỏe. processed_frames là số khung hình đã xử lý, "
            "không mặc nhiên là mẫu số của emotion_summary."
        ),
    }


async def build_dashboard_context(
    db: AsyncSession,
    *,
    session_id: UUID | None = None,
    source_type: str = "all",
    limit: int = MAX_DASHBOARD_SESSIONS,
) -> dict[str, Any]:
    """Lấy một phiên hoặc tối đa 20 phiên gần nhất qua Repository.

    Hàm này không tuyên bố thống kê toàn bộ database khi không chỉ rõ session_id.
    Controller phải kiểm tra quyền truy cập phiên trước khi gọi hàm nếu ứng dụng
    có nhiều tài khoản/người dùng.
    """
    if source_type not in SOURCES:
        raise ValueError("source_type phải là image, video, webcam hoặc all")
    if isinstance(limit, bool) or not isinstance(limit, int):
        raise ValueError("limit phải là số nguyên")
    if not 1 <= limit <= MAX_DASHBOARD_SESSIONS:
        raise ValueError(f"limit phải trong khoảng 1..{MAX_DASHBOARD_SESSIONS}")

    if session_id is not None:
        session = await get_analysis_session_by_id(
            db=db,
            session_id=session_id,
        )
        if session is None:
            raise LookupError("Không tìm thấy phiên phân tích")
        if source_type != "all" and session.source_type != source_type:
            raise ValueError("source_type không khớp với phiên phân tích đã chọn")
        sessions = [session]
    else:
        sessions = await get_analysis_sessions(
            db=db,
            source_type=source_type,
            offset=0,
            limit=limit,
        )

    if not sessions:
        raise LookupError("Chưa có dữ liệu phân tích trong database")

    session_details: list[dict[str, Any]] = []
    combined_dominant_counts: Counter[str] = Counter()

    for session in sessions:
        face_rows = await get_face_analyses_by_session(
            db=db,
            session_id=session.id,
        )
        statistics = summarize_faces(face_rows)
        combined_dominant_counts.update(statistics["dominant_counts"])

        session_details.append({
            "session_id": str(session.id),
            "source_type": session.source_type,
            "source_name": session.source_name,
            "status": session.status,
            "started_at": _iso(getattr(session, "started_at", None)),
            "ended_at": _iso(getattr(session, "ended_at", None)),
            "statistics": statistics,
        })

    return {
        "mode": "dashboard",
        "scope": "one_session" if session_id is not None else "recent_sessions",
        "source_filter": source_type,
        "total_sessions_in_context": len(session_details),
        "max_sessions_requested": 1 if session_id is not None else limit,
        "not_all_database_history": session_id is None,
        "combined_dominant_counts": dict(combined_dominant_counts),
        "sessions": session_details,
        "note": (
            "Thống kê được tính từ các bản ghi FaceAnalysis đã truy xuất. "
            "Một bản ghi là một lượt dự đoán khuôn mặt, không phải một người duy nhất. "
            "Nếu không chọn session_id, dữ liệu chỉ gồm tối đa các phiên gần nhất "
            "theo limit, không phải toàn bộ lịch sử database."
        ),
    }
