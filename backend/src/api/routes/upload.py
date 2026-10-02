from fastapi import APIRouter, UploadFile, Form
from backend.src.controller.upload_controller import upload_image_controller, upload_video_controller

router = APIRouter()

@router.post("/image")
async def upload_image(file: UploadFile, save_file: bool = Form(False)):
    return await upload_image_controller(file = file, save_file = save_file)

@router.post("/video")
async def upload_video(file: UploadFile, save_file: bool = Form(False)):
    return await upload_video_controller(file = file, save_file = save_file)