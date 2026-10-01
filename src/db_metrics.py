"""
Lưu và đọc chỉ số tổng hợp (2.6) vào Database theo schema 1.2 + bảng session_metrics.

Cách dùng (sau khi phân tích xong 1 phiên video/webcam):

    from db_metrics import save_session_metrics, get_session_metrics

    summary = summarize_session(emotion_records, face_confidences)
    save_session_metrics(conn, session_id=123, summary=summary)

    metrics = get_session_metrics(conn, session_id=123)   # -> dict hoặc None

Hỗ trợ: PostgreSQL  — truyền connection tương ứng vào.
"""

from typing import Mapping, Any

EMOTION_KEYS = ("angry", "disgust", "fear", "happy", "sad", "surprise", "neutral")


def _ph(conn) -> str:
    """Placeholder kiểu %s (PostgreSQL/MySQL) hoặc ? (SQLite)."""
    return "?" if conn.__class__.__module__.startswith("sqlite3") else "%s"


def save_session_metrics(conn, session_id: int, summary: Mapping[str, Any]) -> int:
    """
    Ghi bộ chỉ số tổng hợp của 1 phiên vào bảng session_metrics.
    Nếu phiên đã có chỉ số -> UPDATE (tính lại), chưa có -> INSERT.
    Trả về id của dòng trong session_metrics.
    """
    ratio = summary["emotion_ratio"]
    ph = _ph(conn)
    cols = ["session_id",
            "pct_angry", "pct_disgust", "pct_fear", "pct_happy",
            "pct_sad", "pct_surprise", "pct_neutral",
            "dominant_emotion", "stress_index", "confidence_index",
            "total_faces"]
    vals = [session_id,
            ratio["angry"], ratio["disgust"], ratio["fear"], ratio["happy"],
            ratio["sad"], ratio["surprise"], ratio["neutral"],
            summary["dominant_emotion"], summary["stress_index"],
            summary["confidence_index"], summary["total_faces"]]

    update_cols = cols[1:]
    sql = f"""
        INSERT INTO session_metrics ({", ".join(cols)})
        VALUES ({", ".join([ph] * len(vals))})
        ON CONFLICT (session_id) DO UPDATE SET
            {", ".join(c + " = excluded." + c for c in update_cols)}
        RETURNING id
    """
    cur = conn.cursor()
    cur.execute(sql, vals)
    row = cur.fetchone()
    conn.commit()
    return row[0] if row else None


def get_session_metrics(conn, session_id: int) -> dict | None:
    """Đọc bộ chỉ số của 1 phiên. Trả về None nếu chưa tính."""
    ph = _ph(conn)
    cur = conn.cursor()
    cur.execute(f"""
        SELECT pct_angry, pct_disgust, pct_fear, pct_happy,
               pct_sad, pct_surprise, pct_neutral,
               dominant_emotion, stress_index, confidence_index,
               total_faces, created_at
        FROM session_metrics
        WHERE session_id = {ph}
    """, (session_id,))
    row = cur.fetchone()
    if not row:
        return None
    d = dict(zip(("pct_" + e for e in EMOTION_KEYS), row[:7]))
    d.update({
        "dominant_emotion": row[7],
        "stress_index":     row[8],
        "confidence_index": row[9],
        "total_faces":      row[10],
        "created_at":       row[11],
    })
    return d


def collect_input_data(conn, session_id: int) -> tuple[list[dict], list[float]]:
    """
    Lấy dữ liệu đầu vào cho thuật toán 2.6 từ DB theo schema 1.2:
      - emotion_records: mỗi khuôn mặt 1 dict {emotion: score} (dominant emotion)
      - face_confidences: độ tin cậy phát hiện khuôn mặt tương ứng
    """
    ph = _ph(conn)
    cur = conn.cursor()
    cur.execute(f"""
        SELECT f.id, s.emotion, s.score, f.face_confidence
        FROM emotion_scores s
        JOIN detected_faces f ON f.id = s.face_id
        JOIN frame_analyses  fr ON fr.id = f.frame_id
        WHERE fr.session_id = {ph} AND s.is_dominant = TRUE
        ORDER BY f.id
    """, (session_id,))

    records, confs, seen = [], [], {}
    for face_id, emotion, score, conf in cur.fetchall():
        if face_id not in seen:
            seen[face_id] = {e: 0.0 for e in EMOTION_KEYS}
            records.append(seen[face_id])
            confs.append(float(conf) if conf is not None else 1.0)
        seen[face_id][emotion] = float(score)

    return records, confs


# ---------------------------------------------------------------- DEMO
if __name__ == "__main__":
    # Demo bằng SQLite trong bộ nhớ — không cần cài gì
    import sqlite3
    from emotion_metrics import summarize_session

    conn = sqlite3.connect(":memory:")
    conn.executescript("""
        CREATE TABLE session_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER UNIQUE NOT NULL,
            pct_angry REAL, pct_disgust REAL, pct_fear REAL, pct_happy REAL,
            pct_sad REAL, pct_surprise REAL, pct_neutral REAL,
            dominant_emotion TEXT, stress_index REAL, confidence_index REAL,
            total_faces INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    session_id = 1
    records = [
        {"angry": 0.10, "disgust": 0.01, "fear": 0.05, "happy": 0.65,
         "sad": 0.03, "surprise": 0.10, "neutral": 0.06},
        {"angry": 0.20, "disgust": 0.02, "fear": 0.30, "happy": 0.10,
         "sad": 0.25, "surprise": 0.05, "neutral": 0.08},
    ]
    confs = [0.95, 0.88]

    summary = summarize_session(records, confs)
    new_id = save_session_metrics(conn, session_id, summary)
    print("saved, id =", new_id)
    print(get_session_metrics(conn, session_id))