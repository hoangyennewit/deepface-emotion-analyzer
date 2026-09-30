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

4. Frontend (React + Vite + TypeScript + Tailwind CSS)
Bước 1: Cài dependencies:
```
cd frontend
npm install
```
Bước 2: Tạo file frontend/.env từ frontend/.env.example (VITE_API_URL trỏ đến backend, mặc định http://localhost:8000)
Bước 3: Chạy dev server:
```
npm run dev
```
- Web: http://localhost:5173
- Trang chính: /webcam — Phân tích webcam realtime; /video — Phân tích video (xử lý ngầm BackgroundTasks); /history — Lịch sử phân tích

5. Task 2 — Xử lý ngầm video bằng FastAPI BackgroundTasks
- POST /emotion/video/background: upload video, server nhận job_id và trả response NGAY (status=processing)
- Server phân tích video trong nền (thread pool, không chặn event loop)
- GET /emotion/video/status/{job_id}: poll trạng thái (processing / completed / failed) + kết quả
- POST /emotion/video: phiên bản đồng bộ (chờ xong mới trả) — giữ để so sánh

6. Tổng hợp API cho Frontend
- GET  /health                     — kiểm tra server
- POST /emotion/image              — phân tích ảnh tĩnh
- POST /emotion/webcam             — phân tích 1 frame webcam (JPEG từ canvas)
- POST /emotion/video              — phân tích video (đồng bộ)
- POST /emotion/video/background   — phân tích video (ngầm, BackgroundTasks)
- GET  /emotion/video/status/{id}  — tra cứu job video ngầm
- GET  /emotion/history            — danh sách lịch sử (?type=image|video)
- GET  /emotion/history/{id}       — chi tiết 1 bản ghi
- DELETE /emotion/history/{id}     — xóa 1 bản ghi