from fastapi import APIRouter, File, UploadFile, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.controller.emotion_controller import (
    analyze_image_controller,
    analyze_video_controller,
    analyze_webcam_controller,
)
from src.schemas.analysis_schema import AnalysisResponse
from src.db.session import get_session

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


@router.post(
    "/image",
    response_model=AnalysisResponse,
)
async def analyze_image(
    file: UploadFile = File(
        ...,
        description="Ảnh tĩnh JPG/PNG/WEBP",
    ),
    db: AsyncSession = Depends(get_session),
):
    return await analyze_image_controller(file = file, db = db)


@router.post("/video")
async def analyze_video(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_session),
):
    return await analyze_video_controller(file = file, db = db)


@router.post("/webcam")
async def analyze_webcam(
    file: UploadFile = File(...),
):
    return await analyze_webcam_controller(file = file)