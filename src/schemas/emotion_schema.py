# Mô tả kết quả phân tích cảm xúc của khuôn mặt

from pydantic import BaseModel
from typing import Optional, Dict

class FaceEmotionResponse(BaseModel):
    track_id: Optional[int] = None  # ID theo dõi khuôn mặt (nếu có)
    dominate_emotion: str  # Cảm xúc chiếm ưu thế
    confidence: float  # Mức độ tự tin của dự đoán cảm xúc
    emotion: Dict[str, float]  # Cảm xúc và xác suất tương ứng
