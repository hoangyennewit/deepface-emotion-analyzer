"""Lưu / xóa media (ảnh, video, thumbnail) của từng phiên phân tích."""

from __future__ import annotations

import logging
import shutil
from dataclasses import dataclass
from pathlib import Path
from uuid import UUID

import cv2
import numpy as np

logger = logging.getLogger(__name__)

# <project>/outputs/history/<session_id>/...  (outputs/* đã nằm trong .gitignore)
PROJECT_ROOT = Path(__file__).resolve().parents[3]
MEDIA_ROOT = PROJECT_ROOT / "outputs" / "history"
MEDIA_ROOT.mkdir(parents=True, exist_ok=True)

MEDIA_URL_PREFIX = "/media"
THUMB_WIDTH = 320

ALLOWED_EXTENSIONS = {
    "image": {".jpg", ".jpeg", ".png", ".webp"},
    "video": {".mp4", ".webm", ".mov", ".m4v", ".avi", ".mkv"},
}
DEFAULT_EXTENSION = {"image": ".jpg", "video": ".mp4"}


@dataclass
class MediaPayload:
    kind: str                        # "image" | "video"
    filename: str                    # tên gốc, chỉ dùng để lấy đuôi file
    data: bytes | None = None        # ảnh: bytes đã đọc
    source_path: str | None = None   # video: file tạm, sẽ được chuyển vào kho
    duration_seconds: float | None = None


@dataclass
class StoredMedia:
    media_path: str
    thumbnail_path: str | None
    width: int | None
    height: int | None


def _safe_extension(kind: str, filename: str) -> str:
    suffix = Path(filename or "").suffix.lower()
    return suffix if suffix in ALLOWED_EXTENSIONS[kind] else DEFAULT_EXTENSION[kind]


def session_dir(session_id: UUID) -> Path:
    path = MEDIA_ROOT / str(session_id)
    path.mkdir(parents=True, exist_ok=True)
    return path


def to_url(relative_path: str | None) -> str | None:
    return f"{MEDIA_URL_PREFIX}/{relative_path}" if relative_path else None


def _preview_frame(path: Path, kind: str) -> np.ndarray | None:
    if kind == "image":
        return cv2.imread(str(path))
    capture = cv2.VideoCapture(str(path))
    try:
        ok, frame = capture.read()
        return frame if ok else None
    finally:
        capture.release()


def store_media(session_id: UUID, payload: MediaPayload) -> StoredMedia:
    """Ghi file gốc + thumbnail. Hàm đồng bộ, gọi qua asyncio.to_thread."""
    folder = session_dir(session_id)
    original = folder / f"original{_safe_extension(payload.kind, payload.filename)}"

    if payload.data is not None:
        original.write_bytes(payload.data)
    elif payload.source_path:
        shutil.move(payload.source_path, original)
    else:
        raise ValueError("MediaPayload thiếu dữ liệu")

    thumb_rel: str | None = None
    width = height = None

    frame = _preview_frame(original, payload.kind)
    if frame is not None:
        height, width = frame.shape[:2]
        thumb = frame
        if width > THUMB_WIDTH:
            thumb = cv2.resize(
                frame, (THUMB_WIDTH, max(1, int(height * THUMB_WIDTH / width)))
            )
        thumb_file = folder / "thumb.jpg"
        cv2.imwrite(str(thumb_file), thumb)
        thumb_rel = thumb_file.relative_to(MEDIA_ROOT).as_posix()

    return StoredMedia(
        media_path=original.relative_to(MEDIA_ROOT).as_posix(),
        thumbnail_path=thumb_rel,
        width=width,
        height=height,
    )


def delete_session_media(session_id: UUID) -> None:
    shutil.rmtree(MEDIA_ROOT / str(session_id), ignore_errors=True)