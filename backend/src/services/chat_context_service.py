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
)
# Dùng nguyên hàm có sẵn của history_service (không sửa file đó) để số liệu chatbot
# luôn khớp trang Lịch sử.
from src.services.history_service import (
    POSITIVE_EMOTIONS,
    _session_to_history as build_session_history,
)

SOURCES = frozenset({"image", "video", "webcam", "all"})
MAX_DASHBOARD_SESSIONS = 20
MAX_TIMELINE_SAMPLES = 30
MAX_LIVE_TIMELINE_INPUT = 600  # số mốc cuối tối đa đọc từ payload live

# Nhóm tiêu cực/tích cực. POSITIVE_EMOTIONS lấy từ history_service (happy, surprise)
# để chatbot và trang Lịch sử cùng một định nghĩa.
NEGATIVE_EMOTIONS = ("angry", "disgust", "fear", "sad")
FLAT_TOP_SHARE = 35.0  # nhãn cao nhất dưới ngưỡng này = phân bố phẳng, không nổi trội
PERCENT_UNITS = frozenset({"percent", "percentage", "pct"})

# Thống kê theo khoảng thời gian: tối đa MAX_TIME_BUCKETS khoảng, độ rộng chọn từ danh sách.
MAX_TIME_BUCKETS = 24
_BUCKET_SECONDS_CHOICES = (1, 2, 5, 10, 15, 30, 60, 120, 300, 600)


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


def _format_clock(seconds: float) -> str:
    """Định dạng giây thành m:ss (75 -> 1:15)."""
    minutes, secs = divmod(max(0, int(round(seconds))), 60)
    return f"{minutes}:{secs:02d}"


def summary_insights(percent: dict[str, Any] | None) -> dict[str, Any] | None:
    """Tính sẵn các chỉ số tổng hợp từ tỷ lệ cảm xúc, không để Gemini tự cộng.

    positive_percent dùng cùng định nghĩa với trang Lịch sử (happy + surprise).
    distribution_is_flat = nhãn cao nhất chiếm dưới FLAT_TOP_SHARE%, tức không có
    cảm xúc nào nổi trội (thường là nhiễu của bộ nhận diện).
    """
    clean = {
        str(name): number
        for name, raw in (percent or {}).items()
        if (number := _number(raw)) is not None and number >= 0
    }
    total = sum(clean.values())
    if total <= 0:
        return None
    # Tỷ lệ đã tổng ~100 thì giữ nguyên để trùng khớp từng chữ số với giao diện.
    scale = 1.0 if abs(total - 100.0) < 1.0 else 100.0 / total
    top = max(clean, key=clean.get)
    top_share = round(clean[top] * scale, 2)
    return {
        "top_emotion": top,
        "top_emotion_share": top_share,
        "distribution_is_flat": top_share < FLAT_TOP_SHARE,
        "positive_percent": round(
            sum(clean.get(e, 0.0) for e in POSITIVE_EMOTIONS) * scale, 1
        ),
        "negative_percent": round(
            sum(clean.get(e, 0.0) for e in NEGATIVE_EMOTIONS) * scale, 1
        ),
        "positive_definition": "happy + surprise",
        "negative_definition": "angry + disgust + fear + sad",
    }


def build_time_buckets(
    timeline: Any,
    *,
    max_buckets: int = MAX_TIME_BUCKETS,
) -> dict[str, Any] | None:
    """Thống kê cảm xúc theo từng khoảng thời gian, tính trên TOÀN BỘ timeline.

    ``timeline`` là danh sách {"time": giây, "emotions": {nhãn: điểm}}. Mỗi mốc được
    chuẩn hóa về tổng 100, sau đó gom vào các khoảng bằng nhau (tối đa max_buckets).
    Nhờ vậy câu hỏi "từ A đến B cảm xúc gì" hay "có cảm xúc tiêu cực không" được
    trả lời từ số liệu đầy đủ, không phụ thuộc vào việc lấy mẫu vài chục mốc.
    """
    if not isinstance(timeline, list):
        return None

    points: list[tuple[float, dict[str, float]]] = []
    for item in timeline:
        if not isinstance(item, dict):
            continue
        moment = _number(item.get("time", item.get("timestamp_seconds")))
        emotions = item.get("emotions")
        if moment is None or moment < 0 or not isinstance(emotions, dict):
            continue
        clean = {
            str(name): number
            for name, raw in emotions.items()
            if (number := _number(raw)) is not None and number >= 0
        }
        total = sum(clean.values())
        if total <= 0:
            continue
        points.append((moment, {k: v * 100.0 / total for k, v in clean.items()}))
    if not points:
        return None

    points.sort(key=lambda p: p[0])
    start = float(math.floor(points[0][0]))
    end = points[-1][0]
    span = end - start
    size = next(
        (s for s in _BUCKET_SECONDS_CHOICES if span / s < max_buckets),
        _BUCKET_SECONDS_CHOICES[-1],
    )

    grouped: dict[int, list[dict[str, float]]] = defaultdict(list)
    for moment, shares in points:
        grouped[int((moment - start) // size)].append(shares)

    buckets: list[dict[str, Any]] = []
    indexes: list[int] = []
    for index in sorted(grouped):
        members = grouped[index]
        labels = {label for member in members for label in member}
        average = {
            label: round(sum(m.get(label, 0.0) for m in members) / len(members), 2)
            for label in labels
        }
        b_from = start + index * size
        b_to = min(start + (index + 1) * size, max(math.ceil(end), b_from + 1))
        buckets.append(
            {
                "from": _format_clock(b_from),
                "to": _format_clock(b_to),
                "from_seconds": int(b_from),
                "to_seconds": int(b_to),
                "dominant_emotion": max(average, key=average.get),
                "negative_percent": round(
                    sum(average.get(e, 0.0) for e in NEGATIVE_EMOTIONS), 1
                ),
                "emotion_percent": average,
                "moments": len(members),
            }
        )
        indexes.append(index)

    # Gộp các khoảng liền kề có cùng nhãn nổi bật thành một đoạn.
    runs: list[dict[str, Any]] = []
    for position, bucket in enumerate(buckets):
        adjacent = position > 0 and indexes[position] == indexes[position - 1] + 1
        if (
            runs
            and adjacent
            and runs[-1]["emotion"] == bucket["dominant_emotion"]
        ):
            runs[-1]["to"] = bucket["to"]
            runs[-1]["to_seconds"] = bucket["to_seconds"]
        else:
            runs.append(
                {
                    "emotion": bucket["dominant_emotion"],
                    "from": bucket["from"],
                    "to": bucket["to"],
                    "from_seconds": bucket["from_seconds"],
                    "to_seconds": bucket["to_seconds"],
                }
            )

    worst = max(buckets, key=lambda b: b["negative_percent"])
    peaks: dict[str, dict[str, Any]] = {}
    for bucket in buckets:
        for label, value in bucket["emotion_percent"].items():
            if label not in peaks or value > peaks[label]["percent"]:
                peaks[label] = {
                    "from": bucket["from"],
                    "to": bucket["to"],
                    "percent": value,
                }

    return {
        "bucket_seconds": size,
        "time_range": {"from": _format_clock(start), "to": _format_clock(end)},
        "moments_total": len(points),
        "buckets": buckets,
        "dominant_runs": runs,
        "negative_peak": {
            "from": worst["from"],
            "to": worst["to"],
            "negative_percent": worst["negative_percent"],
        },
        "emotion_peaks": peaks,
        "note": (
            "Mỗi khoảng là trung bình các mốc đo nằm trong khoảng đó, tính từ toàn bộ "
            "dữ liệu (không lấy mẫu). Độ phân giải thời gian là bucket_seconds giây; "
            "không nội suy bên trong một khoảng. Khoảng vắng mặt nghĩa là không phát "
            "hiện khuôn mặt."
        ),
    }


def summarize_faces(faces: Iterable[Any]) -> dict[str, Any]:
    """Tính thống kê bằng Python thay vì yêu cầu Gemini tự tính.

    dominant_percent đếm nhãn chủ đạo; emotion_score_percent chuẩn hóa tổng điểm
    DeepFace, cùng cơ sở với tỷ lệ cảm xúc hiển thị trong lịch sử.
    """
    rows = list(faces)
    dominant_counts: Counter[str] = Counter()
    score_sum: dict[str, float] = defaultdict(float)
    score_count: Counter[str] = Counter()
    scored_observations = 0
    timeline: list[dict[str, Any]] = []

    for row in rows:
        label_value = getattr(row, "dominant_emotion", None)
        label = str(label_value).strip() if label_value is not None else ""
        if label:
            dominant_counts[label] += 1

        scores = getattr(row, "emotion_scores", None) or {}
        has_scores = False
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
                has_scores = True
        if has_scores:
            scored_observations += 1

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
    total_emotion_score = sum(score_sum.values())

    return {
        "face_observations": len(rows),
        "scored_observations": scored_observations,
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
        "emotion_score_percent": {
            name: round(total * 100 / total_emotion_score, 2)
            for name, total in score_sum.items()
        } if total_emotion_score else {},
        "emotion_score_totals": dict(score_sum),
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

    # Thống kê theo khoảng thời gian trên các mốc gần nhất mà giao diện gửi lên.
    time_analysis = (
        build_time_buckets(raw_timeline[-MAX_LIVE_TIMELINE_INPUT:])
        if isinstance(raw_timeline, list)
        else None
    )

    processed_frames = _non_negative_int(
        analysis_data.get("processed_frames", analysis_data.get("processedFrames"))
    )
    total_faces = _non_negative_int(
        analysis_data.get("total_faces", analysis_data.get("totalFaces"))
    )
    # Duyệt đủ 4 tên key (snake_case + camelCase); bỏ qua giá trị rỗng/"unknown" để
    # một key mặc định không che mất đơn vị thật ở key khác.
    summary_unit = "unknown"
    for unit_key in (
        "emotion_summary_unit",
        "summary_unit",
        "emotionSummaryUnit",
        "summaryUnit",
    ):
        candidate = str(analysis_data.get(unit_key) or "").strip().lower()
        if candidate and candidate != "unknown":
            summary_unit = candidate
            break
    raw_basis = analysis_data.get(
        "emotion_summary_basis",
        analysis_data.get("emotionSummaryBasis"),
    )
    summary_basis = str(raw_basis).strip() if raw_basis else None

    if (
        not summary
        and not timeline_samples
        and time_analysis is None
        and processed_frames is None
        and total_faces is None
    ):
        return None

    # Percentages supplied by the analyzer are authoritative; counts are normalized here.
    count_units = {"count", "counts", "observation_count", "observations"}
    summary_total = round(sum(summary.values()), 3) if summary_unit in count_units else None
    summary_percent = dict(summary) if summary_unit in {"percent", "percentage", "pct"} else (
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
        "emotion_summary_basis": summary_basis,
        "summary_insights": summary_insights(summary_percent) if summary_percent else None,
        "time_analysis": time_analysis,
        "timeline_samples": timeline_samples,
        "timeline_samples_are_recent_only": (
            isinstance(raw_timeline, list) and len(raw_timeline) > MAX_TIMELINE_SAMPLES
        ),
        "data_origin": "live_webcam_deepface_pipeline",
        "note": (
            "Các nhãn biểu cảm là dự đoán của DeepFace, không xác nhận cảm xúc thật "
            "hoặc tình trạng sức khỏe. processed_frames là số khung hình đã xử lý, "
            "không mặc nhiên là mẫu số của emotion_summary."
        ),
    }


def _session_context(
    session: Any,
    statistics: dict[str, Any],
    *,
    detail: bool,
) -> dict[str, Any]:
    """Số liệu một phiên cho chatbot, lấy từ cùng hàm mà trang Lịch sử dùng."""
    entry = build_session_history(session, detail=detail)
    summary = entry.get("emotion_summary") or {}
    has_faces = statistics["face_observations"] > 0

    context: dict[str, Any] = {
        "session_id": entry["id"],
        "source_type": entry["type"],
        "source_name": entry["filename"],
        "status": entry["status"],
        # recorded_at là lúc lưu phiên, KHÔNG phải thời gian trong video.
        "recorded_at": entry["created_at"],
        "duration_seconds": entry["duration_seconds"],
        "duration": entry["duration"],
        "people_count": entry["total_faces"],
        "face_observations": statistics["face_observations"],
        "dominant_emotion": entry["dominant_emotion"] if has_faces else None,
        "emotion_percent": summary,
        "emotion_percent_basis": "share_of_aggregate_deepface_scores",
        "summary_insights": summary_insights(summary),
        "dominant_label_counts": statistics["dominant_counts"],
    }

    if detail:
        time_analysis = build_time_buckets(entry.get("timeline"))
        if time_analysis is not None:
            context["time_analysis"] = time_analysis
        people = [
            {
                "id": person["id"],
                "appearance_rate_percent": person["appearance_rate"],
                "dominant_emotion": person["dominant_emotion"],
                "emotion_percent": person["emotion_summary"],
                "positive_percent": person["positive_rate"],
            }
            for person in entry.get("people", [])
        ]
        if people:
            context["people"] = people
    return context


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

    # Chỉ có một phiên được chọn thì kèm timeline theo khoảng và danh sách người.
    detail = session_id is not None

    session_details: list[dict[str, Any]] = []
    combined_dominant_counts: Counter[str] = Counter()
    combined_emotion_score_totals: dict[str, float] = defaultdict(float)

    for session in sessions:
        # face_analyses đã được nạp sẵn (selectinload) trong repository, và đây cũng
        # chính là dữ liệu mà history_service dùng.
        statistics = summarize_faces(list(session.face_analyses))
        combined_dominant_counts.update(statistics["dominant_counts"])
        for label, total in statistics["emotion_score_totals"].items():
            combined_emotion_score_totals[label] += total
        session_details.append(_session_context(session, statistics, detail=detail))

    combined_score_total = sum(combined_emotion_score_totals.values())
    combined_emotion_score_percent = (
        {
            label: round(total * 100 / combined_score_total, 2)
            for label, total in combined_emotion_score_totals.items()
        }
        if len(session_details) > 1 and combined_score_total
        else {}
    )

    return {
        "mode": "dashboard",
        "scope": "one_session" if session_id is not None else "recent_sessions",
        "source_filter": source_type,
        "total_sessions_in_context": len(session_details),
        "max_sessions_requested": 1 if session_id is not None else limit,
        "not_all_database_history": session_id is None,
        "combined_dominant_counts": dict(combined_dominant_counts),
        "combined_emotion_score_percent": combined_emotion_score_percent,
        "emotion_score_basis": "share_of_aggregate_deepface_scores",
        "sessions": session_details,
        "note": (
            "Số liệu từng phiên (emotion_percent, positive/negative_percent, duration, "
            "people_count) lấy từ cùng hàm với trang Lịch sử nên khớp giao diện. "
            "combined_emotion_score_percent chỉ là số gộp nhiều phiên gần nhất theo số "
            "bản ghi khuôn mặt, không phải trung bình các phiên. Một bản ghi là một lượt "
            "dự đoán khuôn mặt, không phải một người. Nếu không chọn session_id, dữ liệu "
            "chỉ gồm tối đa các phiên gần nhất theo limit, không phải toàn bộ lịch sử."
        ),
    }