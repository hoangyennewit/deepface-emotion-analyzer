# Lưu trữ thông tin file upload
from pydantic import BaseModel, Field

class UploadSchema(BaseModel):
    sussces: bool
    file_id: str
    file_name: str
    stored_name: str
    file_size: int
    file_type: str