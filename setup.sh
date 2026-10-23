#!/usr/bin/env bash
set -e

echo "=== Cài đặt EmotionAI ==="

echo "[1/4] Cài backend dependencies..."
cd backend
pip install -r requirements.txt

echo "[2/4] Tạo file .env cho backend nếu chưa có..."
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "Đã copy .env.example -> .env"
    else
        echo "Cần có .env.example để tạo .env"
        exit 1
    fi
else
    echo "Đã có .env rồi, bỏ qua."
fi

echo "[3/4] Cài frontend dependencies..."
cd ../frontend
npm install

echo "[4/4] Tạo file .env.local cho frontend nếu chưa có..."
if [ ! -f .env.local ]; then
    if [ -f .env.example ]; then
        cp .env.example .env.local
        echo "Đã copy .env.example -> .env.local"
    fi
fi

echo ""
echo "=== Hết cài đặt. Các bước tiếp theo:"
echo "  1. Chuẩn bị database (chạy lệnh bên dưới hoặc dùng alembic)"
echo "  2. Chạy backend: uvicorn src.main:app --reload --port 8000"
echo "  3. Chạy frontend: npm run dev"
echo ""
echo "Lựa chọn:"
echo "  A. Tạo database SQLite (dùng cho testing)"
echo "  B. Thoát"
echo ""
read -p "Chọn (A/B): " choice
if [ "$choice" = "A" ] || [ "$choice" = "a" ]; then
    cd ../backend
    echo "Tạo database SQLite..."
    python -c "import asyncio; from src.db.base import Base; from src.db.session import engine; async def init(): async with engine.begin() as conn: await conn.run_sync(Base.metadata.create_all); asyncio.run(init())"
    echo "Đã tạo xong database SQLite."
fi

echo "Hết."
