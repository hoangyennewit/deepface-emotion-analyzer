from fastapi import APIRouter, Depends, Path
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from backend.src.db.session import get_session
from backend.src.services.sql_report_service import export_sql_excel

router = APIRouter()

@router.post('/{session_id}/excel', response_class=FileResponse)
async def create_excel_report(
    session_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_session),
):
    path = await export_sql_excel(db, session_id)
    return FileResponse(path, filename=path.name,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
