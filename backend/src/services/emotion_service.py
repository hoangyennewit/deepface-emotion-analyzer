import asyncio
import logging
import time
from typing import Any

import cv2
import numpy as np
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from src.exceptions.ai_exceptions import (
    ModelInferenceException,
    NoFaceDetectedException,
)
from src.repositories.analysis_repository import (
    complete_analysis_session,
    create_analysis_session,
    create_face_analyses,
)
from src.schemas.emotion_schema import FaceEmotionResponse
from src.services.file_service import (
    delete_file,
    read_image_upload,
    save_temporary_file,
)
from src.services.image_analyzer import (
    analyze_static_image,
    analyze_webcam_image,
    validate_image_upload,
)
from src.services.video_processor import VideoProcessor

logger = logging.getLogger(__name__)

# Số frame lấy mẫu mỗi giây. Hạ xuống 0.5 để video xử lý nhanh gấp đôi.
VIDEO_FPS = 1.0

# Một khuôn mặt phải xuất hiện ở ít nhất tỉ lệ này trong số frame có mặt
# thì mới được tính (loại mặt ảo chỉ xuất hiện ở vài frame).
MIN_APPEARANCE_RATIO = 0.3

# Nếu frame gần giống frame đã phân tích trước đó (độ lệch trung bình pixel
# trên ảnh thu nhỏ nhỏ hơn ngưỡng này) thì dùng lại kết quả, không chạy model.
# Đặt 0 để tắt.
SIMILAR_FRAME_THRESHOLD = 2.0


def _frame_signature(image: np.ndarray) -> np.ndarray:
    """Ảnh xám thu nhỏ dùng để so sánh độ giống nhau giữa các frame."""
    small = cv2.resize(image, (64, 36), interpolation=cv2.INTER_AREA)
    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
    return gray.astype(np.float32)


def _bbox_to_dict(bbox: Any) -> dict[str, float] | None:
    """Chuẩn hóa bbox về dạng JSON để lưu DB và tính tọa độ frontend."""
    if bbox is None:
        return None

    if isinstance(bbox, dict):
        return {
            "x": float(bbox.get("x", 0)),
            "y": float(bbox.get("y", 0)),
            "width": float(bbox.get("width", bbox.get("w", 0))),
            "height": float(bbox.get("height", bbox.get("h", 0))),
        }

    if isinstance(bbox, (list, tuple)) and len(bbox) >= 4:
        return {
            "x": float(bbox[0]),
            "y": float(bbox[1]),
            "width": float(bbox[2]),
            "height": float(bbox[3]),
        }

    return None


def _build_face_record(
    face: dict[str, Any],
    *,
    frame_index: int,
    timestamp: float,
    fallback_track_id: int,
) -> dict[str, Any]:
    """Chuyển kết quả từ image_analyzer sang format analysis_repository."""
    track_id = face.get("track_id")
    if track_id is None:
        track_id = fallback_track_id

    return {
        "track_id": int(track_id),
        "frame_index": frame_index,
        "dominant_emotion": str(
            face.get("dominate_emotion", "neutral")
        ),
        "confidence": float(face.get("confidence", 0.0)),
        "emotion_scores": face.get("emotion") or {},
        "bbox": _bbox_to_dict(face.get("bbox")),
        "timestamp": float(timestamp),
    }


async def _persist_analysis(
    db: AsyncSession,
    *,
    source_type: str,
    source_name: str,
    face_records: list[dict[str, Any]],
) -> None:
    """
    Điều phối transaction:
    AnalysisSession -> FaceAnalysis -> completed -> commit.
    """
    try:
        analysis_session = await create_analysis_session(
            db=db,
            source_type=source_type,
            source_name=source_name,
        )

        if face_records:
            await create_face_analyses(
                db=db,
                session_id=analysis_session.id,
                faces=face_records,
            )

        await complete_analysis_session(
            db=db,
            session_id=analysis_session.id,
        )

        await db.commit()

    except Exception:
        await db.rollback()
        raise


async def analyze_image_service(
    file: UploadFile,
    db: AsyncSession,
) -> list[FaceEmotionResponse]:
    """Phân tích ảnh (thuật toán mới, chế độ chính xác) và lưu vào PostgreSQL."""
    validate_image_upload(
        file.content_type,
        file.filename,
    )

    source_name = file.filename or "uploaded_image.jpg"

    # Đọc file qua file_service thay vì đọc trực tiếp tại service.
    image_bytes = await read_image_upload(file)

    faces = await asyncio.to_thread(
        analyze_static_image,
        image_bytes,
    )

    response_faces = [
        FaceEmotionResponse(
            track_id=face.get("track_id"),
            dominate_emotion=face["dominate_emotion"],
            confidence=face["confidence"],
            emotion=face["emotion"],
            bbox=face.get("bbox"),
        )
        for face in faces
    ]

    # Chuẩn hóa dữ liệu và lưu Repository.
    face_records = [
        _build_face_record(
            face,
            frame_index=0,
            timestamp=0.0,
            fallback_track_id=index,
        )
        for index, face in enumerate(faces)
    ]

    await _persist_analysis(
        db=db,
        source_type="image",
        source_name=source_name,
        face_records=face_records,
    )

    return response_faces


async def analyze_video_service(
    file: UploadFile,
    db: AsyncSession,
) -> dict[str, Any]:
    """
    Phân tích video theo frame lấy mẫu và lưu toàn bộ face detection vào DB.

    Dùng thuật toán mới ở chế độ nhanh (fast=True) và tái sử dụng kết quả
    cho các frame gần giống nhau để giảm thời gian xử lý.

    Lưu ý:
    track_id hiện do image_analyzer tạo theo thứ tự khuôn mặt (trái -> phải)
    trong từng frame, chưa phải ID theo dõi cùng một người xuyên suốt video.
    """
    source_name = file.filename or "uploaded_video.mp4"
    logger.info("Bắt đầu phân tích video: %s", source_name)

    # Toàn bộ xử lý file tạm giao cho file_service.
    temp_path = await save_temporary_file(file)

    try:
        processor = VideoProcessor(
            temp_path,
            frames_per_second=VIDEO_FPS,
            resize_to=(640, 360),
        )

        metadata = processor.get_metadata()

        timeline: list[dict[str, Any]] = []
        emotion_totals: dict[str, float] = {}
        database_face_records: list[dict[str, Any]] = []

        # Giữ một bbox đại diện tốt nhất cho từng face index để frontend hiển thị.
        representative_faces: dict[int, dict[str, Any]] = {}

        # Đếm số frame mà mỗi face index xuất hiện để lọc mặt ảo.
        face_appearances: dict[int, int] = {}
        frames_with_faces = 0

        # Bộ nhớ đệm cho frame gần giống nhau.
        last_signature: np.ndarray | None = None
        last_faces: list[dict[str, Any]] | None = None

        processed_frames = 0
        reused_frames = 0

        for frame in processor.extract_frames():
            processed_frames += 1
            t0 = time.perf_counter()

            signature = (
                _frame_signature(frame.image)
                if SIMILAR_FRAME_THRESHOLD > 0
                else None
            )

            if (
                signature is not None
                and last_signature is not None
                and last_faces is not None
                and float(np.mean(np.abs(signature - last_signature)))
                < SIMILAR_FRAME_THRESHOLD
            ):
                # Frame gần như không đổi -> dùng lại kết quả trước đó.
                faces = last_faces
                reused_frames += 1
            else:
                try:
                    faces = await asyncio.to_thread(
                        analyze_static_image,
                        frame.image,
                        fast=True,
                    )
                except NoFaceDetectedException:
                    faces = []

                except ModelInferenceException:
                    logger.exception(
                        "Frame %d: lỗi suy luận", frame.frame_index
                    )
                    continue

                last_signature = signature
                last_faces = faces

            logger.info(
                "Frame %d: %d mặt (%.2fs)",
                frame.frame_index,
                len(faces),
                time.perf_counter() - t0,
            )

            if not faces:
                continue

            frames_with_faces += 1

            frame_emotion_totals: dict[str, float] = {}

            for face_index, face in enumerate(faces):
                emotion_scores = face.get("emotion") or {}

                for emotion_name, value in emotion_scores.items():
                    score = float(value)

                    frame_emotion_totals[emotion_name] = (
                        frame_emotion_totals.get(emotion_name, 0.0)
                        + score
                    )

                    emotion_totals[emotion_name] = (
                        emotion_totals.get(emotion_name, 0.0)
                        + score
                    )

                record = _build_face_record(
                    face,
                    # Dùng frame_index thật từ VideoProcessor.
                    frame_index=frame.frame_index,
                    timestamp=frame.timestamp,
                    fallback_track_id=face_index,
                )
                database_face_records.append(record)

                bbox = record["bbox"]
                if bbox is None:
                    continue

                frame_height, frame_width = frame.image.shape[:2]
                track_id = int(record["track_id"])

                face_appearances[track_id] = (
                    face_appearances.get(track_id, 0) + 1
                )

                frontend_face = {
                    "id": track_id,
                    "dominantEmotion": record["dominant_emotion"],
                    "confidence": record["confidence"],
                    "x": round(
                        bbox["x"] / max(frame_width, 1) * 100,
                        2,
                    ),
                    "y": round(
                        bbox["y"] / max(frame_height, 1) * 100,
                        2,
                    ),
                    "width": round(
                        bbox["width"] / max(frame_width, 1) * 100,
                        2,
                    ),
                    "height": round(
                        bbox["height"] / max(frame_height, 1) * 100,
                        2,
                    ),
                }

                current = representative_faces.get(track_id)
                if (
                    current is None
                    or frontend_face["confidence"] > current["confidence"]
                ):
                    representative_faces[track_id] = frontend_face

            face_count = len(faces)
            timeline.append(
                {
                    "time": frame.timestamp,
                    "emotions": {
                        emotion_name: round(total / face_count, 4)
                        for emotion_name, total in frame_emotion_totals.items()
                    },
                }
            )

        total_emotion_score = sum(emotion_totals.values())

        if total_emotion_score > 0:
            emotion_summary = {
                emotion_name: round(
                    score / total_emotion_score * 100,
                    2,
                )
                for emotion_name, score in emotion_totals.items()
            }
        else:
            emotion_summary = {}

        # Lưu tất cả face detection của các frame đã lấy mẫu.
        await _persist_analysis(
            db=db,
            source_type="video",
            source_name=source_name,
            face_records=database_face_records,
        )

        # Chỉ giữ khuôn mặt xuất hiện đủ nhiều frame -> loại mặt ảo.
        faces_for_frontend = [
            representative_faces[key]
            for key in sorted(representative_faces)
            if face_appearances.get(key, 0)
            >= frames_with_faces * MIN_APPEARANCE_RATIO
        ]

        result = {
            "duration": metadata["duration"],
            "totalFrames": metadata["total_frames"],
            "processedFrames": processed_frames,
            "totalFaces": len(faces_for_frontend),
            "emotionSummary": emotion_summary,
            "faces": faces_for_frontend,
            "timeline": timeline,
        }
        logger.info(
            "Hoàn tất phân tích video: %s | %d/%d frame (%d frame dùng lại) | %d khuôn mặt đại diện",
            source_name,
            processed_frames,
            metadata["total_frames"],
            reused_frames,
            len(faces_for_frontend),
        )
        return result

    finally:
        # Việc xóa file cũng giao lại cho file_service.
        delete_file(temp_path)


async def analyze_webcam_service(
    file: UploadFile,
) -> dict[str, Any]:
    """
    Phân tích một frame webcam bằng thuật toán CŨ
    (OpenCV + RetinaFace dự phòng).
    Tạm thời không lưu Repository/PostgreSQL.
    """
    validate_image_upload(
        file.content_type,
        file.filename,
    )

    image_bytes = await read_image_upload(file)

    faces = await asyncio.to_thread(
        analyze_webcam_image,
        image_bytes,
    )

    return {
        "success": True,
        "total_faces": len(faces),
        "faces": [
            {
                "track_id": face.get("track_id"),
                "dominate_emotion": face["dominate_emotion"],
                "confidence": face["confidence"],
                "emotion": face["emotion"],
                "bbox": face.get("bbox"),
            }
            for face in faces
        ],
    }