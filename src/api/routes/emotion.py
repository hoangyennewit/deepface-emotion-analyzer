# kiểm tra cảm xúc của hình ảnh
from fastapi import APIRouter

router = APIRouter()

@router.post("/image")
async def analyze_image():
   return {"message": "analyze image"}

@router.post("/video")
async def analyze_video():
    return {"message": "analyze video"}

@router.post("/webcam")
async def analyze_webcam():
    return {"message": "analyze webcam"}