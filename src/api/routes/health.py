# Kiểm tra sức khỏe của API(Còn phản hồi không hay đã bị lỗi)
from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def health_check():
    return {"status": "OK"}