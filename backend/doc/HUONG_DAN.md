# Phần 3.7 theo schema SQL 6 bảng

## Chép file

Chép thư mục backend trong gói vào thư mục backend dự án, giữ đúng các đường dẫn. Đây là bộ file khác bản ORM UUID đã gửi trước; không đăng ký đồng thời cả hai API reports.

## Cài thư viện

Kích hoạt môi trường Python backend hiện tại, chạy:

```powershell
python -m pip install "openpyxl>=3.1,<4"
```

Thêm `openpyxl>=3.1,<4` vào backend/requirements.txt.

## Test riêng trước khi merge

1. Trong pgAdmin tạo database riêng, ví dụ emotion_report_test.
2. Trong database này chạy schema 6 bảng, rồi SQL seed của nhóm. Dòng tiêu đề schema phải bắt đầu bằng --. Không chạy schema này vào DB đang chứa ORM UUID.
3. Tại thư mục gốc dự án, đặt kết nối trong terminal (thay user/password/port bằng cấu hình của bạn; không commit mật khẩu):

```powershell
$env:REPORT_DATABASE_URL = "postgresql+asyncpg://USER:PASSWORD@localhost:5432/emotion_report_test"
python -m uvicorn backend.src.report_test_app:app --reload --port 8001
```

Nếu password có ký tự đặc biệt, cần URL-encode phần password trong URL.
Ứng dụng dùng settings của backend qua import get_session; nếu settings yêu cầu DATABASE_URL, cấu hình biến đó theo .env.example của nhóm. Kết nối truy vấn báo cáo khi test luôn dùng REPORT_DATABASE_URL.

4. Mở http://127.0.0.1:8001/docs.
5. Chọn POST /reports/{session_id}/excel, nhập ID số nguyên của phiên completed, Execute rồi tải file.
6. Kiểm tra bảng reports trong pgAdmin:

```sql
SELECT * FROM reports ORDER BY id DESC;
```

File được lưu trong outputs/reports (hoặc REPORT_OUTPUT_DIR nếu đặt). Bảng reports lưu đường dẫn tuyệt đối của file trên máy backend. Đây không phải URL cloud. POST lặp lại tạo báo cáo mới và bản ghi mới.

## Tích hợp router khi nhóm thống nhất database

Trong backend/src/api/router.py thêm:

```python
from backend.src.api.routes.sql_reports import router as sql_reports_router
api_router.include_router(sql_reports_router, prefix="/reports", tags=["Reports"])
```

Chỉ tích hợp khi get_session kết nối đúng database schema 6 bảng. Không đổi DATABASE_URL của cả backend sang schema này khi các chức năng còn dùng ORM UUID. Ứng dụng test riêng không cần sửa main.py hoặc relationship của ORM.

## Kiểm tra

- Phiên completed có dữ liệu: Excel có thông tin, tổng kết, chi tiết, hướng dẫn; reports có bản ghi.
- Không có session: 404; đang pending/processing/failed: 409; ID <=0: 422.
- Phiên completed không có metrics/mặt: vẫn xuất và ghi rõ thiếu metrics.
- Chi tiết giữ frame không phát hiện mặt bằng LEFT JOIN.
- Điểm score giữ nguyên thang DB; không tự tính stress/confidence hoặc thay đổi metrics.
- Nếu ghi reports thất bại: rollback và xóa file vừa tạo.
- Các chuỗi đầu vào bắt đầu bằng ký tự công thức được ghi dưới dạng văn bản trong Excel.

Bản này hỗ trợ Excel, chưa có PDF. Kiểm tra trên PostgreSQL thực tế của bạn trước khi push. Khi có đăng nhập, bổ sung kiểm tra chủ sở hữu phiên giống API của nhóm trước khi dùng chung.

Không commit .env, file Excel sinh ra hoặc môi trường Python. Thêm `outputs/reports/` vào .gitignore của thư mục gốc.

## Push

```powershell
git add backend/src/services/sql_report_service.py backend/src/api/routes/sql_reports.py backend/src/report_test_app.py backend/requirements.txt .gitignore
git commit -m "feat: export Excel reports using six-table SQL schema"
git push -u origin feature/export-report
```
