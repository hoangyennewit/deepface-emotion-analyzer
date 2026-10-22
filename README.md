# 🌟 Face Emotion Analyzer

Dự án nhận diện và phân tích cảm xúc khuôn mặt từ **hình ảnh tĩnh**, **video** và **webcam trực tiếp**. Backend cung cấp API FastAPI, lưu lịch sử phân tích trong PostgreSQL và xử lý nhận diện bằng DeepFace/OpenCV.

- **Backend:** FastAPI, DeepFace, OpenCV, SQLAlchemy Async, asyncpg, Pydantic Settings.
- **Frontend:** React, Vite, TypeScript, Tailwind CSS, React Router.

---

## 🌐 Địa Chỉ Truy Cập Mặc Định

| Dịch vụ | URL | Mô tả |
| :--- | :--- | :--- |
| **Frontend Web** | http://localhost:5173 | Giao diện phân tích và theo dõi |
| **Backend API Root** | http://127.0.0.1:8000 | Root service |
| **Swagger UI Docs** | http://127.0.0.1:8000/docs | Tài liệu kiểm thử API tương tác |
| **Health Check** | http://127.0.0.1:8000/health/ | Kiểm tra trạng thái hoạt động backend |

---

## 📦 I. CÀI ĐẶT MÔI TRƯỜNG & THƯ VIỆN LẦN ĐẦU

### 1. Backend

Tạo và kích hoạt virtual environment tại thư mục gốc `Project`:

```powershell
# Windows (PowerShell):
python -m venv deepface-env
.\deepface-env\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r backend\requirements.txt

# Windows (Command Prompt):
deepface-env\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r backend\requirements.txt
```

```bash
# macOS / Linux:
python3 -m venv deepface-env
source deepface-env/bin/activate
python -m pip install --upgrade pip
pip install -r backend/requirements.txt
```

**Mục đích một số thư viện chính:**
- `deepface`: Trích xuất khuôn mặt và dự đoán xác suất các nhóm cảm xúc.
- `python-multipart`: Đọc và xử lý luồng upload file multipart/form-data (ảnh, video).
- `sqlalchemy[asyncio]` & `asyncpg`: Thao tác cơ sở dữ liệu bất đồng bộ với PostgreSQL.
- `opencv-python`: Đọc và xử lý ảnh/video.

Cấu hình PostgreSQL và file môi trường backend:
- Cài đặt, khởi động PostgreSQL và tạo database `emotion_analysis_db`.
- Sao chép file mẫu: `copy backend\.env.example backend\.env` (hoặc `cp backend/.env.example backend/.env` trên Linux/macOS).
- Cập nhật `DATABASE_URL` trong `backend/.env` theo định dạng `postgresql+asyncpg://<username>:<password>@localhost:5432/emotion_analysis_db`, thay placeholder bằng thông tin PostgreSQL của bạn.
- Backend tự tạo các bảng ORM khi khởi động; database cần được tạo trước.

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
   cd backend
   uvicorn src.main:app --reload --host 127.0.0.1 --port 8000
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
- `/video`: Tải lên và phân tích video đồng bộ.
- `/history`: Lịch sử các phiên phân tích kèm chi tiết độ tin cậy và phân bổ cảm xúc.

---

## 📡 IV. TỔNG HỢP DANH SÁCH REST API

| Phương thức | Endpoint | Định dạng Body / Tham số | Mô tả chức năng |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Không | Thông tin chào mừng API |
| `GET` | `/health/` | Không | Kiểm tra trạng thái máy chủ backend |
| `POST` | `/emotion/image` | `multipart/form-data` (`file`) | Phân tích ảnh và trả về cảm xúc/khuôn mặt nhận diện được |
| `POST` | `/emotion/webcam` | `multipart/form-data` (`file`) | Phân tích một frame ảnh từ webcam |
| `POST` | `/emotion/video` | `multipart/form-data` (`file`) | Phân tích video đồng bộ; request chờ đến khi xử lý xong |
| `POST` | `/chat/emotion` | JSON: `mode`, `message` và dữ liệu tùy chọn theo chế độ | Hỏi AI về biểu cảm ở chế độ live, video hoặc dashboard |
| `GET` | `/emotion/history?type=all` | Query `type`: `all`, `image` hoặc `video` | Danh sách lịch sử phân tích |
| `GET` | `/emotion/history/{session_id}` | Path param: UUID `session_id` | Xem chi tiết một bản ghi phân tích |
| `DELETE` | `/emotion/history/{session_id}` | Path param: UUID `session_id` | Xóa bản ghi lịch sử phân tích |
| `POST` | `/upload/image` | `multipart/form-data`: `file`, `save_file` (mặc định `false`) | Nhận ảnh; lưu bền vững khi `save_file=true` |
| `POST` | `/upload/video` | `multipart/form-data`: `file`, `save_file` (mặc định `false`) | Nhận video; lưu bền vững khi `save_file=true` |
| `GET` | `/user/profile` | Không | Lấy hồ sơ mẫu |
| `PUT` | `/user/profile` | JSON: `name`, `email`, `avatar` (tùy chọn) | Cập nhật hồ sơ mẫu |
| `POST` | `/user/change-password` | JSON: `old_password`, `new_password` | Endpoint minh họa đổi mật khẩu |
| `GET` | `/settings/` | Không | Lấy cài đặt hệ thống |
| `POST` | `/settings/` | JSON: các trường cài đặt (tùy chọn) | Cập nhật cài đặt hệ thống |
| `GET` | `/settings/webcam` | Không | Lấy cài đặt webcam |
| `POST` | `/settings/webcam` | JSON: các trường webcam (tùy chọn) | Cập nhật cài đặt webcam |

---

## 💡 V. CHI TIẾT CƠ CHẾ XỬ LÝ

### 1. Phân tích ảnh tĩnh (`/emotion/image`)
- Tiếp nhận file ảnh qua multipart form field `file`.
- Chuyển tiếp tới `backend/src/services/image_analyzer.py` xử lý qua hàm `analyze_static_image()`.
- Trả về `success`, tổng số khuôn mặt, thông tin cảm xúc từng khuôn mặt và lỗi (nếu có).

### 2. Phân tích video (`/emotion/video`)
- Đây là endpoint xử lý đồng bộ: client chờ server phân tích xong video rồi mới nhận kết quả.
- API hiện tại không cung cấp endpoint background, `job_id` hoặc endpoint polling trạng thái video.

### 3. Webcam và lịch sử
- `/emotion/webcam` nhận một frame ảnh dưới dạng multipart field `file`.
- Lịch sử ảnh/video được truy vấn, xem chi tiết và xóa qua `/emotion/history`; `type` nhận `all`, `image` hoặc `video`.
- Backend kết nối PostgreSQL bất đồng bộ bằng SQLAlchemy và `asyncpg`.

### 4. Upload file
- Các endpoint `/upload/image` và `/upload/video` nhận field `file` cùng `save_file`.
- Khi `save_file=true`, file được lưu dưới `outputs/uploads/images` hoặc `outputs/uploads/videos`; khi `false`, API không lưu ảnh lâu dài và video được ghi vào file tạm.
- `/chat/emotion` nhận `mode` là `live`, `video` hoặc `dashboard`. Chế độ `live` cần `analysis_data`; `dashboard` có thể nhận `session_id`, `source_type` và `limit`; `video` cần `video_file_id` từ kết quả upload video đã lưu (`save_file=true`), có thể kèm `session_id` để dùng kết quả DeepFace của phiên.
- Mọi chế độ đều nhận `message`. Chế độ live có thể cấu hình `window_seconds` (1–300). API chỉ nhận mã file video, không nhận đường dẫn hệ thống từ client.

### 5. Kiểm tra chatbot Dashboard với lịch sử thống kê cảm xúc

Chế độ `dashboard` hỏi chatbot dựa trên các kết quả phân tích đã lưu trong database. Khi muốn hỏi về một phiên cụ thể, chỉ cần gửi `session_id`; không cần sao chép toàn bộ JSON lịch sử hoặc upload video lại.

1. Khởi động backend và mở Swagger tại `http://127.0.0.1:8000/docs`.
2. Mở `GET /emotion/history?type=all`, chọn **Try it out** rồi **Execute**. Có thể dùng `type=image` hoặc `type=video` để lọc; API lịch sử hiện chưa hỗ trợ lọc riêng `webcam`, nên chọn `all` rồi tìm bản ghi có `"type": "webcam"`.
3. Trong kết quả, sao chép giá trị `"id"` của phiên muốn hỏi. Đây là `session_id`. Kiểm tra `"status": "completed"` để chọn phiên đã phân tích xong.
4. Mở `POST /chat/emotion`, chọn **Try it out** và gửi JSON. Thay UUID ví dụ bằng `"id"` vừa sao chép:

   ```json
   {
     "mode": "dashboard",
     "message": "Dựa trên thống kê cảm xúc của phiên này, hãy tóm tắt các biểu cảm nổi bật và nêu rõ giới hạn của kết quả.",
     "session_id": "116c4a5a-c3e3-4e3b-b04e-d6cf4ae1f17f",
     "source_type": "video",
     "limit": 1
   }
   ```

   Đặt `source_type` trùng với trường `"type"` của phiên: `image`, `video` hoặc `webcam`; có thể dùng `all` nếu không muốn lọc theo loại. `limit` nhận giá trị từ 1 đến 20 và chỉ ảnh hưởng khi không truyền `session_id`.

5. Chọn **Execute**. Response thành công có `"success": true`, `"mode": "dashboard"` và câu trả lời trong `"answer"`. Trường `"model"` cho biết Gemini model đã phản hồi; `"used_fallback"` và `"attempted_models"` cho biết có dùng model dự phòng hay không.

Nếu muốn chatbot tổng hợp nhiều phiên gần nhất thay vì hỏi một phiên cụ thể, bỏ `session_id`, đặt `source_type` phù hợp và chọn `limit`, ví dụ:

```json
{
  "mode": "dashboard",
  "message": "Tóm tắt phân bố cảm xúc trong các phiên video gần đây và nêu những giới hạn khi diễn giải thống kê.",
  "source_type": "video",
  "limit": 5
}
```

Đảm bảo đã cấu hình `GEMINI_API_KEY` trong `backend/.env` và có dữ liệu lịch sử trong database. Nếu `session_id` không tồn tại, API trả `404`; nếu database chưa có phiên phù hợp, API cũng không thể tạo thống kê cho chatbot. Chế độ Dashboard gửi thống kê đã lưu cho Gemini dưới dạng văn bản; khác với `mode: "video"`, chế độ này không upload video gốc lên Gemini để phân tích.

> Các endpoint hồ sơ người dùng và cài đặt hiện lưu dữ liệu mẫu trong bộ nhớ tiến trình, không phải cơ chế xác thực hay lưu trữ bền vững.

---

## ⛔ DỪNG ỨNG DỤNG
- Nhấn `Ctrl + C` tại cả 2 cửa sổ terminal (Backend và Frontend) để tắt toàn bộ dịch vụ.