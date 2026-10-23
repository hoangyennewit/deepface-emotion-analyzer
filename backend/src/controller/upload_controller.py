from fastapi import HTTPException, Path, UploadFile, status
from src.services.file_service import save_temporary_file, read_image_upload, save_upload_file, IMAGE_DIR, VIDEO_DIR

ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/tiff"]
ALLOWED_VIDEO_TYPES = ["video/mp4", "video/avi", "video/mov", "video/mkv", "video/webm", "video/flv"]

async def upload_image_controller(file: UploadFile, save_file: bool):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Loại file không hợp lệ. Chỉ chấp nhận các định dạng hình ảnh."
        )

    try:
        if save_file:
            result = await save_upload_file(file = file, destination = IMAGE_DIR)

            return {
                "success": True,
                "message": "Upload và lưu file hình ảnh thành công.",
                "saved": True,
                "file": {
                    "file_id": result["file_id"],
                    "file_name": result["file_name"],
                    "stored_name": result["stored_name"],
                    "size": result["file_size"]
                }
            }
        image_bytes = await read_image_upload(file)
        return {
            "success": True,
            "message": "Upload và lưu file hình ảnh thành công.",
            "saved": False,
            "file": {
                "file_name": file.filename,
                "file_type": file.content_type,
                "size": len(image_bytes)
            }
        }
    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Có lỗi xảy ra khi xử lý file ảnh upload: {str(e)}"
        ) from e
    


async def upload_video_controller(file: UploadFile, save_file: bool):
    if file.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Loại file không hợp lệ. Chỉ chấp nhận các định dạng video."
        )

    try:
        if save_file:
            result = await save_upload_file(file = file, destination = VIDEO_DIR)

            return {
                "success": True,
                "message": "Upload và lưu file video thành công.",
                "saved": True,
                "file": {
                    "file_id": result["file_id"],
                    "file_name": result["file_name"],
                    "stored_name": result["stored_name"],
                    "size": result["file_size"]
                }
            }
        temp_path = await save_temporary_file(file)
        return {
            "success": True,
            "message": "Upload file video thành công dưới dạng file tạm thời.",
            "saved": False,
            "temporary_path": temp_path
        }

    except HTTPException:
        raise
   
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Có lỗi xảy ra khi xử lý video upload: {str(e)}"
        ) from e


