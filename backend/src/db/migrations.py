from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection


async def ensure_analysis_session_media_columns(conn: AsyncConnection) -> None:
    await conn.execute(
        text(
            """
            ALTER TABLE analysis_sessions
                ADD COLUMN IF NOT EXISTS media_path VARCHAR(500),
                ADD COLUMN IF NOT EXISTS thumbnail_path VARCHAR(500),
                ADD COLUMN IF NOT EXISTS media_width INTEGER,
                ADD COLUMN IF NOT EXISTS media_height INTEGER,
                ADD COLUMN IF NOT EXISTS duration_seconds FLOAT
            """
        )
    )
