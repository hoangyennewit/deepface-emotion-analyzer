from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.services.history_service import (
    delete_history_service,
    get_history_detail_service,
    get_history_service,
)


async def get_history_controller(
    db: AsyncSession,
    source_type: str,
):
    if source_type not in {"all", "image", "video"}:
        raise HTTPException(status_code=400, detail="Loại lịch sử không hợp lệ")
    return await get_history_service(db=db, source_type=source_type)


async def get_history_detail_controller(
    db: AsyncSession,
    session_id: UUID,
):
    result = await get_history_detail_service(db=db, session_id=session_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy lịch sử phân tích")
    return result


async def delete_history_controller(
    db: AsyncSession,
    session_id: UUID,
):
    deleted = await delete_history_service(db=db, session_id=session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Không tìm thấy lịch sử phân tích")
    return {"success": True}
