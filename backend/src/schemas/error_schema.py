from pydantic import BaseModel

class ErrorResponse(BaseModel):
    error_code: str  # Mã lỗi
    message: str  # Thông báo lỗi