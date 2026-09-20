from pydantic import BaseModel
from emotion_schema import FaceEmotionResponse
from error_schema import ErrorResponse

class AnalysisResponse(BaseModel):
    success: bool  # Trạng thái thành công hay thất bại của phân tích
    total_faces: int  # Tổng số khuôn mặt được phát hiện trong ảnh
    face_emotions: list[FaceEmotionResponse]  # Danh sách các khuôn mặt và cảm xúc tương ứng
    error: ErrorResponse | None = None  # Thông tin lỗi nếu có, mặc định là None
