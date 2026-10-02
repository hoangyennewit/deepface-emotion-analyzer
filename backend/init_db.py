import asyncio
from backend.src.db.session import engine
from backend.src.db.base import Base
# Import các model để SQLAlchemy nhận diện cấu trúc
from backend.src.models.analysis_session import AnalysisSession
from backend.src.models.face_analysic import FaceAnalysis

async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Đã tạo bảng thành công!")

if __name__ == "__main__":
    asyncio.run(create_tables())