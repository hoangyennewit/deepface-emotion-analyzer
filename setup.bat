@echo off
echo === Cài đặt EmotionAI ===

echo [1/4] Cài backend dependencies...
cd backend
pip install -r requirements.txt
if errorlevel 1 (
    echo Loi: cai backend that bai.
    exit /b 1
)

echo [2/4] Tao file .env cho backend neu chua co...
if not exist .env (
    if exist .env.example (
        copy .env.example .env >nul
        echo Da copy .env.example -> .env
    ) else (
        echo Can co .env.example de tao .env
    )
) else (
    echo Da co .env roi, bo qua.
)

echo [3/4] Cài frontend dependencies...
cd ..\frontend
call npm install
if errorlevel 1 (
    echo Loi: cai frontend that bai.
    exit /b 1
)

echo [4/4] Tao file .env.local cho frontend neu chua co...
if not exist .env.local (
    if exist .env.example (
        copy .env.example .env.local >nul
        echo Da copy .env.example -> .env.local
    )
)

echo.
echo === Het cai dat. Cac buoc tiep theo:
echo   1. Trang bi database (chay lenh o duoi hoac dung alembic)
echo   2. Chay backend: uvicorn src.main:app --reload --port 8000
echo   3. Chay frontend: npm run dev
echo.
echo Lua chon:
echo   A. Tao database SQLite (dung cho testing)
echo   B. Thoat
echo.
set /p lh 끝으로="Chon (A/B): "
if /i "%lh 끝으로%"=="A" (
    cd ..\backend
    echo Tao database SQLite...
    python -c "import asyncio; from src.db.base import Base; from src.db.session import engine; async def init(): async with engine.begin() as conn: await conn.run_sync(Base.metadata.create_all); asyncio.run(init())"
    if errorlevel 1 (
        echo Loi tao database.
    ) else (
        echo Da tao xong database SQLite.
    )
)

echo.
echo Het.
pause
