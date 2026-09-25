1. Hướng dẫn chạy server
Bước 1: Kích hoạt virtual environment:
.\deepface-env\Scripts\Activate.ps1
Bước 2: Tạo file backend/.env từ backend/.env.example (điền DATABASE_URL)
Bước 3: Từ thư mục gốc project, chạy:
uvicorn backend.src.main:app --reload
Bước 4: Mở trình duyệt
- API: http://127.0.0.1:8000
- Swagger: http://127.0.0.1:8000/docs

2. Task 2 — Phân tích ảnh tĩnh
- Endpoint: POST /emotion/image
- Body: multipart/form-data, field `file` (JPG/PNG/WEBP, tối đa ~10MB)
- Service: backend/src/services/image_analyzer.py → hàm analyze_static_image()
- Ví dụ (Swagger): mở /docs → Emotion Analysis → POST /emotion/image → Upload file → Execute

3. Mô tả ý nghĩa, tác dụng của thư viện
- python-multipart dùng để nhận ảnh, video upload
- deepface dùng để nhận diện khuôn mặt và phân tích cảm xúc
- Cài thư viện ORM: pip install "sqlalchemy[asyncio]" asyncpg alembic pydantic-settings