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

app.include_router(api_router)

@app.get("/")
def root():
    return {"message": "Welcome to the Emotion Analysis API!"}