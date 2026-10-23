# Làm việc với file/folder upload.
import logging
from pathlib import Path
from tempfile import NamedTemporaryFile
from uuid import uuid4

import aiofiles
from fastapi import UploadFile

logger = logging.getLogger(__name__)

# [CHỈNH] Dùng đường dẫn tuyệt đối theo project thay vì phụ thuộc thư mục chạy lệnh.
PROJECT_ROOT = Path(__file__).resolve().parents[3]
UPLOAD_DIR = PROJECT_ROOT / "outputs" / "uploads"
IMAGE_DIR = UPLOAD_DIR / "images"
VIDEO_DIR = UPLOAD_DIR / "videos"

CHUNK_SIZE = 64 * 1024

IMAGE_DIR.mkdir(parents=True, exist_ok=True)
VIDEO_DIR.mkdir(parents=True, exist_ok=True)


async def save_upload_file(
    file: UploadFile,
    destination: Path,
) -> dict:
    """Lưu file upload lâu dài vào destination."""
    if not file.filename:
        raise ValueError("Tên file upload không hợp lệ.")

    original_name = file.filename
    content_type = file.content_type

    destination.mkdir(parents=True, exist_ok=True)

    suffix = Path(original_name).suffix.lower()
    file_id = str(uuid4())
    stored_name = f"{file_id}{suffix}"
    file_path = destination / stored_name
    size = 0

    try:
        async with aiofiles.open(file_path, "wb") as output_file:
            while True:
                content = await file.read(CHUNK_SIZE)
                if not content:
                    break

                size += len(content)
                await output_file.write(content)
    finally:
        await file.close()

    return {
        "success": True,
        "file_id": file_id,
        "file_name": original_name,
        "stored_name": stored_name,
        "file_path": str(file_path),
        "file_size": size,
        "file_type": content_type,
    }


async def read_image_upload(
    file: UploadFile,
) -> bytes:
    """Đọc toàn bộ ảnh upload vào memory rồi đóng UploadFile."""
    try:
        return await file.read()
    finally:
        await file.close()


async def save_temporary_file(
    file: UploadFile,
) -> str:
    """
    Lưu UploadFile vào temporary file và trả về path.

    [CHỈNH] Bỏ tham số destination vì phiên bản cũ không sử dụng.
    """
    suffix = Path(file.filename or "").suffix.lower()

    temp_file = NamedTemporaryFile(
        delete=False,
        suffix=suffix,
    )
    temp_path = Path(temp_file.name)
    temp_file.close()

    try:
        async with aiofiles.open(temp_path, "wb") as output_file:
            while True:
                content = await file.read(CHUNK_SIZE)
                if not content:
                    break

                await output_file.write(content)

        return str(temp_path)

    except Exception:
        temp_path.unlink(missing_ok=True)
        raise

    finally:
        await file.close()


def delete_file(
    file_path: str | Path,
) -> None:
    """Xóa file nếu tồn tại; cleanup lỗi không làm hỏng response chính."""
    path = Path(file_path)

    try:
        path.unlink(missing_ok=True)
    except OSError as exc:
        logger.warning(
            "Không thể xóa file '%s': %s",
            path,
            exc,
        )
