#làm việc với xử lí file/folder
from pathlib import Path
from tempfile import NamedTemporaryFile 
import aiofiles
from fastapi import UploadFile
from uuid import uuid4

UPLOAD_DIR = Path("outputs/uploads")
IMAGE_DIR = UPLOAD_DIR / "images"
VIDEO_DIR = UPLOAD_DIR / "videos"

IMAGE_DIR.mkdir(parents=True, exist_ok=True)
VIDEO_DIR.mkdir(parents=True, exist_ok=True)

async def save_upload_file(file: UploadFile, destination: Path) -> dict:
    if not file.filename:
        raise ValueError("Tên file upload không hợp lệ.")

    destination.mkdir(parents=True, exist_ok=True)
    suffix = Path(file.filename).suffix
    file_id = str(uuid4())
    stored_name = f"{file_id}{suffix}"
    file_path = destination / stored_name
    size = 0

    async with aiofiles.open(file_path, 'wb') as output_file:
        while content := await file.read(1024):  # Đọc file theo từng chunk 1KB
            size += len(content)
            await output_file.write(content)

    await file.close()

    return {
        "success": True,
        "file_id": file_id,
        "file_name": file.filename,
        "stored_name": stored_name,
        "file_path": str(file_path),
        "file_size": size,
        "file_type": file.content_type
    }

async def read_image_upload(file: UploadFile) -> bytes:
    content = await file.read()
    await file.close()
    return content

async def save_temporary_file(file: UploadFile, destination: Path | None = None) -> str:
    suffix = Path(file.filename or "").suffix.lower()
    temp_file = NamedTemporaryFile(delete=False, suffix=suffix)
    temp_path = Path(temp_file.name)
    temp_file.close()

    async with aiofiles.open(temp_path, 'wb') as output_file:
        while content := await file.read(1024 * 64):
            await output_file.write(content)

    await file.close()
    return str(temp_path)
