# Kiểm tra cảm xúc của hình ảnh / video / webcam
import asyncio
import datetime
import logging
import os
import tempfile
import time
import uuid
from typing import Any, Dict, List, Optional, Tuple

import cv2
from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile

from backend.src.exceptions.ai_exceptions import AIException
from backend.src.schemas.analysis_schema import AnalysisResponse
from backend.src.schemas.emotion_schema import FaceEmotionResponse
from backend.src.schemas.error_schema import ErrorResponse
from backend.src.services.image_analyzer import (
    analyze_static_image,
    validate_image_upload,
)
from backend.src.video_processor import VideoProcessor

logger = logging.getLogger(__name__)
router = APIRouter()

# Bộ nhớ lưu trữ lịch sử phân tích (In-memory history store)
HISTORY_RECORDS: List[Dict[str, Any]] = [
    {
        "id": "hist-1",
        "created_at": "20/09/2026 15:00",
        "type": "image",
        "type_label": "Ảnh",
        "filename": "test.jpg",
        "quick_result": "Happy 57%",
        "dominant_emotion": "happy",
        "duration": "00:00",
        "total_faces": 2,
        "positive_rate": 57,
        "emotion_summary": {"happy": 57, "neutral": 35, "sad": 8},
        "timeline": [
            {"time": 0, "emotions": {"happy": 57, "neutral": 35, "sad": 8}}
        ],
        "faces": [
            {
                "id": 1,
                "dominantEmotion": "happy",
                "confidence": 57.0,
                "x": 20,
                "y": 25,
                "width": 30,
                "height": 45,
            },
            {
                "id": 2,
                "dominantEmotion": "neutral",
                "confidence": 42.0,
                "x": 60,
                "y": 28,
                "width": 28,
                "height": 42,
            }
        ]
    },
    {
        "id": "hist-2",
        "created_at": "20/09/2026 15:20",
        "type": "video",
        "type_label": "Video",
        "filename": "video_demo.mp4",
        "quick_result": "Happy 82%",
        "dominant_emotion": "happy",
        "duration": "02:35",
        "total_faces": 4,
        "positive_rate": 82,
        "emotion_summary": {"happy": 82, "neutral": 12, "sad": 6},
        "timeline": [
            {"time": 0, "emotions": {"happy": 75, "neutral": 18, "sad": 7}},
            {"time": 30, "emotions": {"happy": 82, "neutral": 12, "sad": 6}},
            {"time": 60, "emotions": {"happy": 88, "neutral": 8, "sad": 4}},
            {"time": 90, "emotions": {"happy": 80, "neutral": 15, "sad": 5}},
            {"time": 120, "emotions": {"happy": 85, "neutral": 10, "sad": 5}},
            {"time": 150, "emotions": {"happy": 81, "neutral": 13, "sad": 6}},
        ],
        "faces": [
            {
                "id": 1,
                "dominantEmotion": "happy",
                "confidence": 85.0,
                "x": 15,
                "y": 20,
                "width": 25,
                "height": 40,
            },
            {
                "id": 2,
                "dominantEmotion": "neutral",
                "confidence": 67.0,
                "x": 45,
                "y": 22,
                "width": 25,
                "height": 40,
            }
        ]
    }
]

# =====================================================================
# Task 2 — Xử lý ngầm (Background Processing) cho video bằng FastAPI
# BackgroundTasks: client upload video -> nhận job_id ngay lập tức ->
# server phân tích trong nền -> client poll GET /emotion/video/status/{job_id}
# =====================================================================
VIDEO_JOBS: Dict[str, Dict[str, Any]] = {}


async def _save_upload_to_temp(file: UploadFile) -> Tuple[str, str]:
    """Lưu file upload vào file tạm, trả về (đường dẫn, tên file)."""
    suffix = os.path.splitext(file.filename or "video.mp4")[1] or ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp_path = tmp.name
        content = await file.read()
        tmp.write(content)
    return tmp_path, (file.filename or "video.mp4")


def _analyze_video_core(tmp_path: str) -> Dict[str, Any]:
    """
    Phân tích cảm xúc toàn bộ video: lấy mẫu frame, phân tích từng frame,
    tạo timeline cho Recharts và tổng hợp cảm xúc. Dùng chung cho cả
    endpoint đồng bộ /video và job xử lý ngầm /video/background.
    """
    processor = VideoProcessor(tmp_path, frames_per_second=1.0)
    timeline: List[Dict[str, Any]] = []
    detected_faces_map: Dict[int, Dict[str, Any]] = {}
    processed_frames = 0
    all_emotion_counts: Dict[str, float] = {}

    for frame in processor.extract_frames():
        processed_frames += 1
        try:
            faces = analyze_static_image(
                frame.image,
                detector_backend="opencv",
                enforce_detection=False,
            )
        except Exception as exc:
            logger.warning("Frame %d phân tích thất bại: %s", processed_frames, exc)
            faces = []

        if not faces:
            continue

        primary_face = faces[0]
        raw_emotions = primary_face.get("emotion") or {}

        # Chuẩn hóa key cảm xúc để tương thích cả DeepFace ('surprise', 'fear', 'disgust')
        # lẫn Frontend ('surprised', 'fearful', 'disgusted')
        mapping = {
            "surprise": "surprised",
            "fear": "fearful",
            "disgust": "disgusted",
        }
        frame_emotions: Dict[str, float] = {}
        for k, v in raw_emotions.items():
            val = round(float(v), 1)
            frame_emotions[k] = val
            target_k = mapping.get(k)
            if target_k:
                frame_emotions[target_k] = val
            # Tích lũy cho tổng thể
            all_emotion_counts[k] = all_emotion_counts.get(k, 0.0) + float(v)

        timeline.append({
            "time": int(frame.timestamp),
            "emotions": frame_emotions
        })

        # Theo dõi bounding box thực tế (bỏ qua frame không detect được box thật)
        for face in faces:
            if not face.get("is_full_frame") and face.get("bbox"):
                track_id = face.get("track_id", 0) + 1
                bbox = face["bbox"]
                h, w = frame.image.shape[:2]
                score = round(face.get("confidence", 0.0) * 100, 1)
                dom = face.get("dominate_emotion", "neutral")
                # Lưu hoặc cập nhật box có độ tự tin cao nhất
                if track_id not in detected_faces_map or score > detected_faces_map[track_id]["confidence"]:
                    detected_faces_map[track_id] = {
                        "id": track_id,
                        "dominantEmotion": dom,
                        "confidence": score,
                        "x": round((bbox[0] / max(1, w)) * 100, 1),
                        "y": round((bbox[1] / max(1, h)) * 100, 1),
                        "width": round((bbox[2] / max(1, w)) * 100, 1),
                        "height": round((bbox[3] / max(1, h)) * 100, 1),
                    }

    # Tính tổng hợp cảm xúc thực tế
    sum_scores = sum(all_emotion_counts.values()) or 1.0
    emotion_summary: Dict[str, float] = {}
    for k, v in all_emotion_counts.items():
        pct = round((v / sum_scores) * 100, 1)
        if pct > 0:
            emotion_summary[k] = pct
            mapped = mapping.get(k)
            if mapped:
                emotion_summary[mapped] = pct

    cap = cv2.VideoCapture(tmp_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or processed_frames)
    duration = int(total_frames / fps) if fps > 0 else processed_frames
    cap.release()

    faces_list = list(detected_faces_map.values())
    # Đồng bộ dominantEmotion của face hiển thị với cảm xúc chiếm ưu thế nhất của toàn video
    if emotion_summary and faces_list:
        top_overall = max(
            [(k, v) for k, v in emotion_summary.items() if k in ("happy", "neutral", "sad", "angry", "surprise", "surprised", "fear", "fearful", "disgust", "disgusted")],
            key=lambda x: x[1],
            default=("neutral", 0.0)
        )
        for f in faces_list:
            f["dominantEmotion"] = top_overall[0]
            f["confidence"] = top_overall[1]

    return {
        "duration": max(duration, 1),
        "totalFrames": total_frames,
        "processedFrames": processed_frames,
        "totalFaces": len(faces_list),
        "emotionSummary": emotion_summary,
        "faces": faces_list,
        "timeline": timeline,
    }


def _save_video_to_history(filename: str, duration: int, faces_list: List[Dict[str, Any]], emotion_summary: Dict[str, float], timeline: List[Dict[str, Any]]) -> None:
    """Lưu kết quả phân tích video vào lịch sử in-memory."""
    now_str = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")
    top_emotion = max(emotion_summary.items(), key=lambda x: x[1])[0] if emotion_summary else "happy"
    HISTORY_RECORDS.insert(
        0,
        {
            "id": str(uuid.uuid4())[:8],
            "created_at": now_str,
            "type": "video",
            "type_label": "Video",
            "filename": filename,
            "quick_result": f"{top_emotion.capitalize()} {int(emotion_summary.get(top_emotion, 0))}%",
            "dominant_emotion": top_emotion,
            "duration": f"{duration // 60:02d}:{duration % 60:02d}",
            "total_faces": len(faces_list),
            "positive_rate": int(emotion_summary.get("happy", 0)),
            "emotion_summary": emotion_summary,
            "timeline": timeline,
            "faces": faces_list,
        }
    )


def _process_video_job(job_id: str, tmp_path: str, filename: str) -> None:
    """
    Hàm chạy NGẦM bằng FastAPI BackgroundTasks (hàm sync → chạy trên thread pool,
    không chặn event loop). Cập nhật trạng thái vào VIDEO_JOBS để client poll.
    """
    started = time.time()
    job = VIDEO_JOBS.get(job_id)
    if job is None:
        return
    try:
        result = _analyze_video_core(tmp_path)
        _save_video_to_history(filename, result["duration"], result["faces"], result["emotionSummary"], result["timeline"])
        result["filename"] = filename
        job.update({
            "status": "completed",
            "progress": 100,
            "result": result,
            "processing_time": round(time.time() - started, 2),
            "completed_at": datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
        })
        logger.info("Job %s hoàn tất sau %ss", job_id, job["processing_time"])
    except Exception as exc:
        logger.exception("Job phân tích video %s thất bại", job_id)
        job.update({
            "status": "failed",
            "progress": 100,
            "error": str(exc),
            "processing_time": round(time.time() - started, 2),
        })
    finally:
        # Dọn dẹp file tạm sau khi xử lý xong
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        except OSError:
            pass


@router.post("/image", response_model=AnalysisResponse)
async def analyze_image(file: UploadFile = File(..., description="Ảnh tĩnh JPG/PNG/WEBP")):
    """
    Task 2 — Phân tích cảm xúc khuôn mặt từ ảnh tĩnh.
    Upload 1 ảnh, DeepFace nhận diện khuôn mặt và trả về điểm 7 cảm xúc + bbox.
    """
    try:
        validate_image_upload(file.content_type, file.filename)
        image_bytes = await file.read()
        faces = await asyncio.to_thread(analyze_static_image, image_bytes)

        face_emotions = [
            FaceEmotionResponse(
                track_id=face.get("track_id"),
                dominate_emotion=face["dominate_emotion"],
                confidence=face["confidence"],
                emotion=face["emotion"],
                bbox=face.get("bbox"),
            )
            for face in faces
        ]

        # Tính tổng hợp cảm xúc cho giao diện
        dominant_counts: Dict[str, int] = {}
        for face in face_emotions:
            dom = face.dominate_emotion
            dominant_counts[dom] = dominant_counts.get(dom, 0) + 1

        total = len(face_emotions)
        quick = "Chưa phát hiện mặt"
        if face_emotions:
            primary = face_emotions[0]
            quick = f"{primary.dominate_emotion.capitalize()} {int(primary.confidence * 100)}%"

        # Lưu lại vào lịch sử
        now_str = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")
        HISTORY_RECORDS.insert(
            0,
            {
                "id": str(uuid.uuid4())[:8],
                "created_at": now_str,
                "type": "image",
                "type_label": "Ảnh",
                "filename": file.filename or "uploaded_image.jpg",
                "quick_result": quick,
                "dominant_emotion": face_emotions[0].dominate_emotion if face_emotions else "neutral",
                "duration": "00:00",
                "total_faces": total,
                "positive_rate": int(face_emotions[0].confidence * 100) if face_emotions and face_emotions[0].dominate_emotion in ("happy", "surprise") else 30,
                "emotion_summary": {
                    k: round((v / max(1, total)) * 100, 1) for k, v in dominant_counts.items()
                },
                "timeline": [{"time": 0, "emotions": face_emotions[0].emotion}] if face_emotions else [],
                "faces": [
                    {
                        "id": f.track_id or idx + 1,
                        "dominantEmotion": f.dominate_emotion,
                        "confidence": round(f.confidence * 100, 1),
                        "x": f.bbox[0] if f.bbox else 0,
                        "y": f.bbox[1] if f.bbox else 0,
                        "width": f.bbox[2] if f.bbox else 0,
                        "height": f.bbox[3] if f.bbox else 0,
                    }
                    for idx, f in enumerate(face_emotions)
                ],
            }
        )

        return AnalysisResponse(
            success=True,
            total_faces=len(face_emotions),
            face_emotions=face_emotions,
            error=None,
        )
    except AIException as exc:
        logger.warning("Phân tích ảnh thất bại: %s (%s)", exc.message, exc.error_code)
        return AnalysisResponse(
            success=False,
            total_faces=0,
            face_emotions=[],
            error=ErrorResponse(error_code=exc.error_code, message=exc.message),
        )
    except Exception as exc:
        logger.exception("Lỗi không xác định khi phân tích ảnh")
        return AnalysisResponse(
            success=False,
            total_faces=0,
            face_emotions=[],
            error=ErrorResponse(
                error_code="INTERNAL_ERROR",
                message=f"Lỗi hệ thống: {exc}",
            ),
        )


@router.post("/video")
async def analyze_video(file: UploadFile = File(...)):
    """
    Phân tích cảm xúc khuôn mặt từ Video (đồng bộ — chờ đến khi xử lý xong).
    Lấy mẫu frame, phân tích cảm xúc từng frame và tạo timeline Recharts.
    """
    tmp_path, filename = await _save_upload_to_temp(file)
    try:
        result = _analyze_video_core(tmp_path)
        _save_video_to_history(filename, result["duration"], result["faces"], result["emotionSummary"], result["timeline"])
        result["filename"] = filename
        return result
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@router.post("/video/background")
async def analyze_video_background(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """
    Task 2 — Xử lý ngầm video bằng FastAPI BackgroundTasks.

    Client upload video, nhận ngay job_id + trạng thái "processing" mà không phải
    chờ; server phân tích trong nền (thread pool), client sau đó poll
    GET /emotion/video/status/{job_id} để lấy kết quả.
    """
    tmp_path, filename = await _save_upload_to_temp(file)
    job_id = uuid.uuid4().hex[:8]

    VIDEO_JOBS[job_id] = {
        "job_id": job_id,
        "status": "processing",
        "progress": 0,
        "filename": filename,
        "created_at": datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
        "result": None,
        "error": None,
        "processing_time": None,
    }

    # add_task với hàm sync → starlette tự chạy trên thread pool SAU KHI trả response
    background_tasks.add_task(_process_video_job, job_id, tmp_path, filename)

    return {
        "job_id": job_id,
        "status": "processing",
        "filename": filename,
        "message": "Đã nhận video, hệ thống đang phân tích ngầm. Poll /emotion/video/status/{job_id} để lấy kết quả.",
    }


@router.get("/video/status/{job_id}")
async def get_video_job_status(job_id: str):
    """Tra cứu trạng thái job phân tích video ngầm (cho FE poll định kỳ)."""
    job = VIDEO_JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy job {job_id}.")
    return job


@router.post("/webcam")
async def analyze_webcam(file: UploadFile = File(...)):
    """
    Phân tích frame từ Webcam trực tiếp.
    Nhận 1 JPEG frame từ canvas, trả về kết quả nhận diện khuôn mặt và cảm xúc ngay lập tức.
    """
    try:
        image_bytes = await file.read()
        faces = await asyncio.to_thread(analyze_static_image, image_bytes)
        
        face_list = []
        for face in faces:
            dom = face.get("dominate_emotion", "neutral")
            conf = face.get("confidence", 0.0)
            bbox = face.get("bbox") or [0, 0, 100, 100]
            scores = face.get("emotion") or {}
            face_list.append({
                "dominant_emotion": dom,
                "confidence": conf,
                "bbox": bbox,
                "emotion_scores": scores
            })

        return {
            "success": True,
            "total_faces": len(face_list),
            "faces": face_list
        }
    except Exception as e:
        logger.warning("Webcam analyze frame warning: %s", e)
        return {
            "success": False,
            "total_faces": 0,
            "faces": [],
            "message": str(e)
        }


@router.get("/history")
async def get_history(type: Optional[str] = None):
    """
    Lấy danh sách lịch sử phân tích (cho màn hình Lịch sử Desktop - 12).
    """
    if type and type != "all":
        return [r for r in HISTORY_RECORDS if r.get("type") == type]
    return HISTORY_RECORDS


@router.get("/history/{history_id}")
async def get_history_detail(history_id: str):
    """
    Lấy chi tiết 1 phiên phân tích (cho màn hình Desktop - 13).
    """
    for r in HISTORY_RECORDS:
        if r["id"] == history_id:
            return r
    raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi lịch sử.")


@router.delete("/history/{history_id}")
async def delete_history_item(history_id: str):
    """
    Xóa 1 bản ghi lịch sử (cho thao tác Xóa trong Desktop - 12).
    """
    global HISTORY_RECORDS
    original_len = len(HISTORY_RECORDS)
    HISTORY_RECORDS = [r for r in HISTORY_RECORDS if r["id"] != history_id]
    if len(HISTORY_RECORDS) == original_len:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi lịch sử để xóa.")
    return {"success": True, "message": "Đã xóa bản ghi thành công", "deleted_id": history_id}
