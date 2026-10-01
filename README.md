# 🌟 Face Emotion Analyzer

Dự án nhận diện và phân tích cảm xúc khuôn mặt từ **Hình ảnh tĩnh**, **Video (Đồng bộ / Xử lý ngầm BackgroundTasks)** và **Webcam trực tiếp** theo thời gian thực.

- **Backend:** FastAPI, DeepFace, OpenCV, SQLAlchemy (Async), asyncpg, Alembic, Pydantic Settings.
- **Frontend:** React, Vite, TypeScript, Tailwind CSS, React Router.

---

## 🌐 Địa Chỉ Truy Cập Mặc Định

| Dịch vụ | URL | Mô tả |
| :--- | :--- | :--- |
| **Frontend Web** | http://localhost:5173 | Giao diện phân tích và theo dõi |
| **Backend API Root** | http://127.0.0.1:8000 | Root service |
| **Swagger UI Docs** | http://127.0.0.1:8000/docs | Tài liệu kiểm thử API tương tác |
| **Health Check** | http://127.0.0.1:8000/health | Kiểm tra trạng thái hoạt động backend |

---

## 📦 I. CÀI ĐẶT MÔI TRƯỜNG & THƯ VIỆN LẦN ĐẦU

### 1. Backend

Khởi tạo và kích hoạt virtual environment:

```powershell
# Windows (PowerShell):
python -m venv deepface-env
.\deepface-env\Scripts\Activate.ps1

# Windows (Command Prompt):
deepface-env\Scripts\activate.bat

# macOS / Linux:
python3 -m venv deepface-env
source deepface-env/bin/activate
```

Cài đặt các gói phụ thuộc:

```bash
pip install -r requirements.txt
pip install opencv-python==4.10.0.84 deepface fastapi "uvicorn[standard]" python-multipart "sqlalchemy[asyncio]" asyncpg alembic pydantic-settings
```

**Mục đích một số thư viện chính:**
- `deepface`: Trích xuất khuôn mặt và dự đoán xác suất các nhóm cảm xúc.
- `python-multipart`: Đọc và xử lý luồng upload file multipart/form-data (ảnh, video).
- `sqlalchemy[asyncio]` & `asyncpg`: Thao tác cơ sở dữ liệu bất đồng bộ với PostgreSQL.
- `alembic`: Quản lý migration cho lược đồ cơ sở dữ liệu.

Cấu hình file môi trường backend:
- Sao chép file mẫu: `copy backend\.env.example backend\.env` (hoặc `cp backend/.env.example backend/.env` trên Linux/macOS).
- Mở file `backend/.env` và cập nhật chuỗi kết nối:
  ```env
  DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/emotion_db
  ```

---

### 2. Frontend

Di chuyển vào thư mục frontend và cài đặt dependencies:

```bash
cd frontend
npm install
npm install react-router-dom
```

Cấu hình file môi trường frontend:
- Sao chép file mẫu: `copy .env.example .env` (hoặc `cp .env.example .env`).
- Thiết lập biến URL trỏ đến backend:
  ```env
  VITE_API_URL=http://localhost:8000
  ```

---

## 🚀 II. HƯỚNG DẪN KHỞI CHẠY HỆ THỐNG

Cần mở **2 cửa sổ Terminal** riêng biệt tại thư mục gốc `Project`:

### 🔹 Cửa sổ 1: Chạy Backend (FastAPI)

1. Mở Terminal tại thư mục `Project`.
2. Kích hoạt môi trường ảo:
   - **PowerShell (VS Code):**
     ```powershell
     .\deepface-env\Scripts\Activate.ps1
     ```
     *(Nếu gặp lỗi script execution bị chặn, chạy lệnh: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process`)*
   - **Command Prompt (CMD):**
     ```cmd
     deepface-env\Scripts\activate.bat
     ```
   - **macOS / Linux:**
     ```bash
     source deepface-env/bin/activate
     ```
3. Khởi chạy Uvicorn server:
   ```bash
   uvicorn backend.src.main:app --reload --host 127.0.0.1 --port 8000
   ```
4. Đợi thông báo `Uvicorn running on http://127.0.0.1:8000`. Giữ nguyên cửa sổ này.

---

### 🔹 Cửa sổ 2: Chạy Frontend (React + Vite)

1. Mở cửa sổ Terminal thứ 2 tại thư mục `Project`.
2. Di chuyển vào thư mục frontend và chạy dev server:
   ```bash
   cd frontend
   npm run dev
   ```
3. Đợi thông báo `Local: http://localhost:5173/`. Truy cập trình duyệt theo địa chỉ trên.

---

## 🧭 III. KIẾN TRÚC TRANG FRONTEND

- `/webcam`: Phân tích biểu cảm webcam trực tiếp theo thời gian thực (đọc từng khung hình canvas định dạng JPEG đẩy lên server).
- `/video`: Tải lên và phân tích video (hỗ trợ cả luồng đồng bộ và luồng ngầm BackgroundTasks).
- `/history`: Lịch sử các phiên phân tích kèm chi tiết độ tin cậy và phân bổ cảm xúc.

---

## 📡 IV. TỔNG HỢP DANH SÁCH REST API

| Phương thức | Endpoint | Định dạng Body / Tham số | Mô tả chức năng |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Không | Kiểm tra trạng thái máy chủ backend |
| `POST` | `/emotion/image` | `multipart/form-data` (`file`) | Phân tích ảnh tĩnh (JPG, PNG, WEBP <= 10MB) |
| `POST` | `/emotion/webcam` | `multipart/form-data` (`file`) | Phân tích 1 frame ảnh từ webcam canvas |
| `POST` | `/emotion/video` | `multipart/form-data` (`file`) | Phân tích video dạng đồng bộ (chờ xử lý xong mới trả kết quả) |
| `POST` | `/emotion/video/background` | `multipart/form-data` (`file`) | Phân tích video chạy ngầm qua `BackgroundTasks`, nhận ngay `job_id` |
| `GET` | `/emotion/video/status/{id}` | Path param: `id` (job_id) | Tra cứu tiến độ xử lý video (`processing` / `completed` / `failed`) |
| `GET` | `/emotion/history` | Query param: `?type=image\|video` | Danh sách lịch sử phân tích đã lưu trữ |
| `GET` | `/emotion/history/{id}` | Path param: `id` | Xem thông tin chi tiết một bản ghi phân tích |
| `DELETE` | `/emotion/history/{id}` | Path param: `id` | Xóa bản ghi lịch sử phân tích |

---

## 💡 V. CHI TIẾT CƠ CHẾ XỬ LÝ

### 1. Phân tích ảnh tĩnh (`/emotion/image`)
- Tiếp nhận file ảnh qua multipart form field `file`.
- Chuyển tiếp tới `backend/src/services/image_analyzer.py` xử lý qua hàm `analyze_static_image()`.
- Trả về nhóm cảm xúc chiếm ưu thế (dominant emotion), bounding box khuôn mặt và bảng phân bổ xác suất các cảm xúc liên quan.

### 2. Xử lý video ngầm (`FastAPI BackgroundTasks`)
1. Client gửi video lên endpoint `/emotion/video/background`.
2. Máy chủ sinh mã `job_id`, lưu trạng thái `processing` và lập tức phản hồi về client mà không giữ kết nối chờ.
3. Tác vụ trích xuất frame và nhận diện DeepFace được đẩy vào Thread Pool chạy ngầm, không gây nghẽn Async Event Loop của server.
4. Client định kỳ polling qua `GET /emotion/video/status/{job_id}` để nhận trạng thái và lấy kết quả phân tích khi hoàn tất.

---

## ⛔ DỪNG ỨNG DỤNG
- Nhấn `Ctrl + C` tại cả 2 cửa sổ terminal (Backend và Frontend) để tắt toàn bộ dịch vụ.