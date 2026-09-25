# 1.1. Khảo sát yêu cầu phần mềm — DeepFace Emotion Analyzer

## 1. Mục tiêu phần mềm
Xây dựng hệ thống phân tích cảm xúc khuôn mặt từ ảnh tĩnh, video hoặc webcam (real-time) sử dụng thư viện DeepFace,
lưu trữ kết quả phân tích vào cơ sở dữ liệu để tra cứu, thống kê và xuất báo cáo.

## 2. Đầu vào (Input)

| Nguồn đầu vào | Mô tả | Yêu cầu kỹ thuật |
|---|---|---|
| **Ảnh tĩnh** | Upload 1 hoặc nhiều ảnh (JPG/PNG/WEBP) | Dung lượng tối đa ~10MB/ảnh; tự động phát hiện khuôn mặt trong ảnh |
| **Video** | Upload file video (MP4/AVI/MOV/WEBM) | Giới hạn dung lượng/duration; trích frame theo mốc thờii gian để phân tích |
| **Webcam** | Stream trực tiếp từ webcam qua trình duyệt | Phân tích real-time hoặc near real-time; FPS tối thiểu ~10; hiển thị kết quả overlay lên video |

## 3. Đầu ra (Output)

| Dạng đầu ra | Mô tả chi tiết |
|---|---|
| **Biểu đồ** | - Biểu đồ cột/tròn: tỉ lệ từng cảm xúc (happy, sad, angry, surprise, fear, disgust, neutral) trong phiên phân tích<br>- Biểu đồ đường: diễn biến cảm xúc theo thờii gian (đối với video/webcam)<br>- Dashboard tổng quan |
| **Báo cáo file** | - Xuất file **PDF** hoặc **Excel (xlsx)**: tổng hợp số liệu, thống kê tỉ lệ % từng cảm xúc, thờii điểm nổi bật<br>- File đính kèm: video/ảnh đã gắn nhãn cảm xúc (nếu có) |
| **Lịch sử phiên** | Danh sách các lần phân tích, xem lại kết quả chi tiết theo từng phiên |

## 4. Chức năng chính
1. Tạo phiên phân tích mới (upload ảnh/video hoặc bật webcam).
2. Chạy DeepFace phân tích: nhận diện khuôn mặt → gán điểm số 7 cảm xúc cho từng khuôn mặt.
3. Lưu kết quả vào database (metadata, timestamp, tọa độ mặt, điểm số cảm xúc).
4. Hiển thị kết quả: biểu đồ trực quan + bảng chi tiết.
5. Xuất báo cáo file (PDF/Excel).
6. Xem lịch sử và xóa phiên phân tích.

## 5. Yêu cầu phi chức năng
- **Hiệu năng**: video dài được trích frame định kỳ (mỗi 0.5–1 giây) thay vì từng frame.
- **Bảo mật**: file upload và ảnh/frame lưu cục bộ, không gửi ra ngoài.
- **Khả dụng**: giao diện web thân thiện, hỗ trợ tiếng Việt.
- **Mở rộng**: dễ thay đổi model phân tích (DeepFace hỗ trợ VGG-Face, Facenet, OpenFace, DeepID, Dlib, ArcFace...).

## 6. Công nghệ đề xuất (phù hợp với cấu trúc repo hiện có)
- **Backend**: Python (FastAPI/Flask), DeepFace, tf-keras, OpenCV.
- **Frontend**: React/Vue hoặc HTML + JavaScript (nhận stream webcam qua WebRTC/getUserMedia).
- **Database**: SQLite (dev) → PostgreSQL/MySQL (production).
- **Thư mục dự án**: `backend/` (API, xử lý), `frontend/` (giao diện), `data/` (ảnh, video, frame), `deepface-env/` (môi trường), `outputs/` (báo cáo xuất ra).
