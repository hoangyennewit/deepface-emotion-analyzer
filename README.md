1. Hướng dẫn chạy server
Bước 1: Kích hoạt virtual environment:
.\deepface-env\Scripts\Activate.ps1
Bước 2: Gõ lệnh vào Terminal:
uvicorn src.main:app --reload
Bước 3: Mở trình duyệt
- Nếu sử dụng trình duyệt gõ: http://127.0.0.1:8000
- Nếu sử dụng Swagger thì gõ: http://127.0.0.1:8000/docs
2. Mô tả ý nghĩa, tác dụng của thư viện
- python-multipart dùng để nhận ảnh, video upload
- Cài thư viện ORM: pip install "sqlalchemy[asyncio]" asyncpg alembic pydantic-settings