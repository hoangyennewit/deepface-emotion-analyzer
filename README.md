# EmotionAI - DeepFace Emotion Analyzer

Phân tích cảm xúc khuôn mặt từ ảnh, video và webcam.

## Cài đặt

Chạy file setup theo hệ điều hành:

- Windows: `setup.bat`
- Linux/macOS: `bash setup.sh`

Hoặc làm thủ công:

```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env   # sửa DATABASE_URL và SECRET_KEY nếu cần

# Frontend
cd ../frontend
npm install
cp .env.example .env.local
```

## Chạy

```bash
# Tạo database (SQLite - dùng được ngay, chỉ phù hợp dev)
cd backend
python -c "import asyncio; from src.db.base import Base; from src.db.session import engine; async def init(): async with engine.begin() as conn: await conn.run_sync(Base.metadata.create_all); asyncio.run(init())"

# Backendnuvicorn src.main:app --reload --port 8000

# Frontend (cửa sổ khác)
cd frontend
npm run dev
```

## Đăng nhập/đăng ký

- `POST /auth/register` — tạo tài khoản (JSON: full_name, email, password)
- `POST /auth/login` — đăng nhập (form: username=email, password)

Frontend: mở `http://localhost:5173/register` hoặc `/login`.

## Lưu ý

- File `.env` và `.env.local` đã trong `.gitignore`, không bị commit.
- Mặc định dùng PostgreSQL. Để dùng SQLite cho nhanh, sửa `DATABASE_URL=sqlite+aiosqlite:///./emotion_analysis.db` trong `backend/.env`.
- Nếu lỗi bcrypt/passlib: `pip install bcrypt==4.0.1`
- Nếu thiếu greenlet: `pip install greenlet`
- Nếu thiếu email_validator: `pip install email-validator`

Branch `feat/dangnhap` chứa phần đăng nhập/đăng ký.
