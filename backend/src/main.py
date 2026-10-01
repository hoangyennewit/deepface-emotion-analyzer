import os
import sys
from pathlib import Path

# Thiết lập đường dẫn model và sys.path trong thư mục dự án cho Windows & Mac
workspace_dir = Path(__file__).resolve().parent.parent.parent
backend_dir = workspace_dir / "backend"
sys.path.insert(0, str(workspace_dir))
sys.path.insert(0, str(backend_dir))

venv_keras = workspace_dir / ".venv" / "keras"
venv_deepface = workspace_dir / ".venv" / "deepface"
if venv_keras.exists():
    os.environ["KERAS_HOME"] = str(venv_keras)
if venv_deepface.exists():
    os.environ["DEEPFACE_HOME"] = str(venv_deepface)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.src.api.router import api_router

app = FastAPI(
    title="Emotion Analysis API",
    description="API for facial expression analysis using DeepFace",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # đúng port Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.get("/")
def root():
    return {"message": "Welcome to the Emotion Analysis API!"}