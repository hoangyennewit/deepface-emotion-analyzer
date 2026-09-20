# Video Frame Extraction — Task 2.3

Hàm tách frame từ video, dùng cho pipeline phân tích cảm xúc bằng DeepFace. Đây là phần việc thuộc **nhiệm vụ 2.3**: viết hàm phân tách video, sử dụng OpenCV, có cài đặt bước nhảy frame.

## Cấu trúc

```
src/
├── video_processor.py # Hàm chính: tách frame từ video
├── test_video_processor.py # Unit test (pytest)
└── test_manual.py # Test thủ công, xem trực quan frame đã tách
```



## Cài đặt

```bash
pip install opencv-python numpy pytest
```

## Cách dùng

```python
from video_processor import VideoProcessor

processor = VideoProcessor("video.mp4", frames_per_second=2.0)

for frame in processor.extract_frames():
    print(frame.frame_index, frame.timestamp, frame.image.shape)
```

### Tham số

| Tham số | Mặc định | Ý nghĩa |
|---|---|---|
| `video_path` | (bắt buộc) | Đường dẫn file video |
| `frames_per_second` | `2.0` | Số frame muốn lấy mẫu **mỗi giây** — không phải FPS gốc của video |
| `resize_to` | `None` | Tuple `(width, height)` nếu muốn resize frame trước khi trả về |

### Kết quả trả về

`extract_frames()` là generator, mỗi lần trả về 1 object `Frame`:

```python
@dataclass
class Frame:
    image: np.ndarray      # ảnh frame (BGR)
    frame_index: int       # thứ tự frame trong video gốc
    timestamp: float       # giây, tính từ đầu video
```

## Cách hoạt động — bước nhảy frame (frame_step)

Video gốc thường có FPS cao (VD 30fps), nhưng phân tích cảm xúc không cần lấy dày như vậy. Hàm tính ra **bước nhảy frame**:

frame_step = round(FPS gốc / frames_per_second)


Ví dụ: video 30fps, muốn lấy 2 frame/giây → `frame_step = 15` → cứ 15 frame gốc thì giữ lại 1 frame, bỏ qua 14 frame còn lại.

Tính theo tỉ lệ này (thay vì hard-code 1 con số cố định) giúp tốc độ lấy mẫu **luôn ổn định** dù video đầu vào có FPS khác nhau (25fps, 30fps, 60fps...).

## Vì sao dùng generator (`yield`) thay vì trả về `list`?

Với video dài (vài phút → hàng chục nghìn frame), load hết vào RAM cùng lúc rất tốn bộ nhớ. Dùng generator giúp chỉ giữ 1 frame trong bộ nhớ tại 1 thời điểm, phù hợp để nối trực tiếp với bước xử lý phía sau (phân tích cảm xúc) theo kiểu streaming.

## Chạy test

```bash
cd src
pytest test_video_processor.py -v
```

Test bao gồm:
- Số frame tách ra đúng công thức (`frames_per_second`)
- Timestamp tăng dần đều
- Báo lỗi đúng khi path video sai hoặc tham số không hợp lệ
- Tùy chọn resize hoạt động đúng
- Tốc độ lấy mẫu cao hơn → số frame tách ra nhiều hơn

## Xem trực quan (test thủ công)

```bash
cd src
python test_manual.py
```

Cần có sẵn file video mẫu (mặc định `sample_video.mp4` trong cùng thư mục, hoặc sửa path trong file). Script in thông tin từng frame và hiện popup 5 frame đầu để kiểm tra bằng mắt.