from fastapi import FastAPI
from backend.src.api.router import api_router

app = FastAPI(
    title="Emotion Analysis API",
    description="API for facial expression analysis using DeepFace",
    version="1.0.0"
)

app.include_router(api_router)

@app.get("/")
def root():
    return {"message": "Welcome to the Emotion Analysis API!"}