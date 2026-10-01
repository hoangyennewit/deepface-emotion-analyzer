"""
2.6. Thuật toán tính chỉ số tổng hợp cảm xúc
DeepFace Emotion Analyzer

Tính 3 nhóm chỉ số cho toàn bộ video/webcam:
  1. Tỷ lệ % cảm xúc chủ đạo (emotion distribution)
  2. Chỉ số căng thẳng (Stress Index)  - thang 0-100
  3. Chỉ số tự tin   (Confidence Index) - thang 0-100

Dữ liệu đầu vào: list các dict mỗi phần tử là 1 khuôn mặt trong 1 frame,
lấy từ bảng emotion_scores join detected_faces join frame_analyses
(theo schema 1.2), hoặc trả trực tiếp từ DeepFace.analyze.
"""

from collections import Counter
from typing import Iterable, Mapping

# 7 cảm xúc DeepFace trả về
EMOTIONS = ("angry", "disgust", "fear", "happy", "sad", "surprise", "neutral")

# Nhóm cảm xúc tiêu cực / tích cực để tính chỉ số tổng hợp
NEGATIVE = ("angry", "disgust", "fear", "sad")
POSITIVE = ("happy", "surprise")

# Trọng số cho chỉ số CĂNG THẲNG (tổng = 1.0)
# fear/angry ảnh hưởng mạnh nhất; sad/disgust vừa; neutral làm giảm nhẹ
STRESS_WEIGHTS = {
    "fear":     0.30,
    "angry":    0.30,
    "sad":      0.20,
    "disgust":  0.15,
    "neutral": -0.05,   # trung tính làm giảm căng thẳng
    "happy":   -0.15,   # vui làm giảm rõ rệt
    "surprise": 0.05,   # ngạc nhiên hơi tăng
}

# Trọng số cho chỉ số TỰ TIN
# (a) Cảm xúc: tích cực tăng (chuẩn hóa /0.90), tiêu cực trừ trực tiếp
CONF_POS_WEIGHTS = {"happy": 0.55, "neutral": 0.25, "surprise": 0.10}  # tổng = 0.90
CONF_NEG_PENALTY = {"sad": 0.50, "fear": 0.60, "angry": 0.30, "disgust": 0.30}

def _normalize(row: Mapping) -> dict:
    """Chuẩn hóa 1 record thành dict {emotion: score} với score 0-1."""
    return {e: float(row.get(e, 0.0)) for e in EMOTIONS}


def dominant_emotion(row: Mapping) -> str:
    """Cảm xúc có điểm cao nhất của 1 khuôn mặt."""
    scores = _normalize(row)
    return max(scores, key=scores.get)


# ---------------------------------------------------------------- 1
def emotion_percentages(records: Iterable[Mapping]) -> dict:
    """
    Tỷ lệ % cảm xúc CHỦ ĐẠO trên toàn bộ video.
    Mỗi khuôn mặt được tính 1 phiếu cho cảm xúc cao nhất của nó.
    Ví dụ: 100 khuôn mặt, 60 khuôn mặt 'happy' -> happy = 60%
    """
    records = list(records)
    if not records:
        return {e: 0.0 for e in EMOTIONS}

    votes = Counter(dominant_emotion(r) for r in records)
    total = len(records)
    return {e: round(votes.get(e, 0) / total * 100, 2) for e in EMOTIONS}


# ---------------------------------------------------------------- 2
def stress_index(records: Iterable[Mapping]) -> float:
    """
    Chỉ số căng thẳng toàn video, thang 0-100.

    Công thức:
      stress_mat = Σ (score_cảm_xúc × trọng_số)      # cho từng khuôn mặt
      stress = clamp(avg(stress_mat), 0, 1) × 100
    Trọng số xem ở STRESS_WEIGHTS (fear/angry nặng nhất).
    """
    records = list(records)
    if not records:
        return 0.0

    total = 0.0
    for r in records:
        s = _normalize(r)
        total += sum(s[e] * STRESS_WEIGHTS[e] for e in EMOTIONS)

    avg = total / len(records)
    return round(min(max(avg, 0.0), 1.0) * 100, 2)


# ---------------------------------------------------------------- 3
def confidence_index(records: Iterable[Mapping],
                     face_confidences: Iterable[float] | None = None) -> float:
    """
    Chỉ số tự tin toàn video, thang 0-100.

    Từng khuôn mặt:
      emo = clamp01( Σ(score × trọng_số_tích_cực) / 0.90
                     - Σ(score × hệ_số_phạt_tiêu_cực) )
      conf = 0.8 × emo + 0.2 × face_confidence   (độ rõ nét khuôn mặt)
    Chỉ số video = trung bình conf của tất cả khuôn mặt.
    """
    records = list(records)
    if not records:
        return 0.0

    confs = list(face_confidences) if face_confidences else [1.0] * len(records)

    total = 0.0
    for r, fc in zip(records, confs):
        s = _normalize(r)
        pos = sum(s[e] * w for e, w in CONF_POS_WEIGHTS.items()) / 0.90
        neg = sum(s[e] * w for e, w in CONF_NEG_PENALTY.items())
        emo = min(max(pos - neg, 0.0), 1.0)
        total += 0.8 * emo + 0.2 * float(fc)

    return round(total / len(records) * 100, 2)


# ---------------------------------------------------------------- TỔNG HỢP
def summarize_session(records: Iterable[Mapping],
                      face_confidences: Iterable[float] | None = None) -> dict:
    """
    Gói toàn bộ chỉ số của 1 phiên phân tích (1 video/webcam).
    Trả về dict -> lưu vào DB hoặc đưa vào báo cáo PDF/Excel.
    """
    records = list(records)
    return {
        "total_faces":      len(records),
        "emotion_ratio":    emotion_percentages(records),       # % từng cảm xúc
        "dominant_emotion": max(emotion_percentages(records),
                                key=emotion_percentages(records).get),
        "stress_index":     stress_index(records),              # 0-100
        "confidence_index": confidence_index(records, face_confidences),  # 0-100
    }


# ---------------------------------------------------------------- DEMO
if __name__ == "__main__":
    # Giả lập kết quả DeepFace trả về cho 4 khuôn mặt trong video
    demo = [
        {"angry": 0.10, "disgust": 0.01, "fear": 0.05, "happy": 0.65,
         "sad": 0.03, "surprise": 0.10, "neutral": 0.06},
        {"angry": 0.20, "disgust": 0.02, "fear": 0.30, "happy": 0.10,
         "sad": 0.25, "surprise": 0.05, "neutral": 0.08},
        {"angry": 0.60, "disgust": 0.05, "fear": 0.10, "happy": 0.05,
         "sad": 0.10, "surprise": 0.05, "neutral": 0.05},
        {"angry": 0.05, "disgust": 0.01, "fear": 0.02, "happy": 0.70,
         "sad": 0.02, "surprise": 0.15, "neutral": 0.05},
    ]
    faces = [0.95, 0.88, 0.92, 0.97]
    print(summarize_session(demo, faces))
