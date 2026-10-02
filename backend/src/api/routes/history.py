import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import joinedload
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.src.db.session import get_session
from backend.src.models.analysis_session import AnalysisSession

router = APIRouter()

@router.get("/{session_id}")
async def get_detailed_result(session_id: uuid.UUID, db: AsyncSession = Depends(get_session)):
    """
    Task 3.6 - API lấy kết quả chi tiết của 1 phiên phân tích dựa vào session_id
    """
    # Khởi tạo câu lệnh truy vấn (cú pháp chuẩn SQLAlchemy 2.0 cho Async)
    stmt = (
        select(AnalysisSession)
        .options(joinedload(AnalysisSession.face_analyses))
        .filter(AnalysisSession.id == session_id)
    )
    
    # Thực thi truy vấn bất đồng bộ với await
    result = await db.execute(stmt)
    
    # Lấy ra kết quả đầu tiên (first)
    session_record = result.scalars().first()
    
    if not session_record:
        raise HTTPException(
            status_code=404, 
            detail=f"Không tìm thấy phiên phân tích với ID: {session_id}"
        )
        
    return session_record