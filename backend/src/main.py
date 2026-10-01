import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.router import api_router

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
    yield


app = FastAPI(
    title="Emotion Analysis API",
    description="API for facial expression analysis using DeepFace",
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

@app.get("/")
def root():
    return {"message": "Welcome to the Emotion Analysis API!"}