# 🌟 Face Emotion Analyzer - Hướng Dẫn Chạy Thủ Công

Dự án nhận diện và phân tích cảm xúc khuôn mặt từ **Hình ảnh**, **Video** và **Webcam trực tiếp** thời gian thực (FastAPI + DeepFace + React).

---

## 🌐 Địa Chỉ Truy Cập Sau Khi Chạy
- **Giao diện Frontend:** [http://localhost:5173](http://localhost:5173)
- **Tài liệu API Backend (Swagger Docs):** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Kiểm tra trạng thái Backend:** [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

## 🪟 I. HƯỚNG DẪN CHẠY THỦ CÔNG TRÊN WINDOWS

Cần mở **2 cửa sổ Command Prompt (CMD)** hoặc **PowerShell** riêng biệt tại thư mục gốc `Project`:

### 🔹 Cửa sổ 1: Chạy Backend (FastAPI)
1. Mở CMD / PowerShell tại thư mục `Project`.
2. Kích hoạt môi trường ảo:
   ```cmd
   # Nếu dùng .venv:
   .venv\Scripts\activate

   # Hoặc nếu dùng deepface-env:
   deepface-env\Scripts\activate
   ```
   *(Khi kích hoạt thành công, đầu dòng lệnh sẽ hiện tên môi trường ví dụ `(.venv)`)*
3. Khởi chạy server:
   ```cmd
   uvicorn backend.src.main:app --reload --host 127.0.0.1 --port 8000
   ```
4. Đợi màn hình hiện dòng: `Uvicorn running on http://127.0.0.1:8000`. **Giữ nguyên cửa sổ này, không đóng.**

---

### 🔹 Cửa sổ 2: Chạy Frontend (React)
1. Mở thêm một cửa sổ CMD / PowerShell thứ 2 tại thư mục `Project`.
2. Di chuyển vào thư mục `frontend`:
   ```cmd
   cd frontend
   ```
3. Khởi chạy giao diện:
   ```cmd
   npm run dev
   ```
4. Đợi màn hình hiện: `Local: http://localhost:5173/`. Giữ cửa sổ này và mở trình duyệt truy cập vào `http://localhost:5173`.

---

## 🍎 II. HƯỚNG DẪN CHẠY THỦ CÔNG TRÊN macOS / LINUX

Cần mở **2 tab / cửa sổ Terminal** riêng biệt tại thư mục gốc `Project`:

### 🔹 Terminal 1: Chạy Backend (FastAPI)
1. Mở Terminal tại thư mục `Project`.
2. Kích hoạt môi trường ảo:
   ```bash
   source .venv/bin/activate
   ```
3. Khởi chạy server:
   ```bash
   uvicorn backend.src.main:app --reload --host 127.0.0.1 --port 8000
   ```
4. Đợi màn hình hiện dòng: `Uvicorn running on http://127.0.0.1:8000`. **Giữ nguyên tab này, không đóng.**

---

### 🔹 Terminal 2: Chạy Frontend (React)
1. Mở một tab / cửa sổ Terminal mới tại thư mục `Project`.
2. Di chuyển vào thư mục `frontend`:
   ```bash
   cd frontend
   ```
3. Khởi chạy giao diện:
   ```bash
   npm run dev
   ```
4. Đợi màn hình hiện: `Local: http://localhost:5173/`. Giữ tab này và mở trình duyệt truy cập vào `http://localhost:5173`.

---

## 🛠️ Lưu Ý Cho Lần Đầu Chạy Hoặc Máy Mới Tinh

Nếu máy tính mới chưa cài đặt các gói thư viện phụ thuộc:

### Cài đặt Backend:
```bash
# Trên Windows:
.venv\Scripts\activate
pip install -r requirements.txt
pip install opencv-python==4.10.0.84 deepface fastapi uvicorn[standard] python-multipart

# Trên macOS/Linux:
source .venv/bin/activate
pip install -r requirements.txt
pip install opencv-python==4.10.0.84 deepface fastapi uvicorn[standard] python-multipart
```

### Cài đặt Frontend:
```bash
cd frontend
npm install
```

---

## ⛔ Cách Tắt Ứng Dụng Khi Dùng Xong
- Nhấn tổ hợp phím `Ctrl + C` ở cả 2 cửa sổ terminal đang chạy Backend và Frontend.