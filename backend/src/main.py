import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.router import api_router
from fastapi.staticfiles import StaticFiles
from src.services.media_storage import MEDIA_ROOT

# Import model để Base.metadata biết có bảng nào (đường dẫn lấy từ repository của bạn)
from src.models.analysis_session import AnalysisSession  # noqa: F401
from src.models.face_analysic import FaceAnalysis  # noqa: F401
from src.db.base import Base
from src.db.session import engine

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Nạp sẵn model MediaPipe cho webcam ở luồng nền để request đầu tiên
    # không phải chờ (lần chạy đầu còn tải model ~3.7 MB). Lỗi model không
    # được làm sập server.
    warmup_task = None
    try:
        from src.services.webcam_analyzer import warmup_webcam_analyzer

        warmup_task = asyncio.create_task(
            asyncio.to_thread(warmup_webcam_analyzer)
        )
        # Giữ tham chiếu để task không bị garbage collector thu hồi.
        app.state.warmup_task = warmup_task
    except Exception:
        logging.getLogger(__name__).exception(
            "Không nạp được model webcam, sẽ thử lại ở request đầu tiên"
        )

    yield

    if warmup_task is not None:
        warmup_task.cancel()


app = FastAPI(
    title="Emotion Analysis API",
    description=(
        "API phân tích cảm xúc khuôn mặt (DeepFace cho ảnh/video, "
        "MediaPipe cho webcam thời gian thực)"
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

app.mount("/media", StaticFiles(directory=MEDIA_ROOT), name="media")
@app.get("/")
def root():
    return {"message": "Welcome to the Emotion Analysis API!"}