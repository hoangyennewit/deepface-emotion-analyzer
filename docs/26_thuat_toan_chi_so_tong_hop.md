# Thuật toán phân tích cảm xúc ảnh và video

Tài liệu này mô tả phiên bản đang chạy trong `backend/src/services/image_analyzer.py`
và `backend/src/services/emotion_service.py`.

## 1. Kiến trúc chung

Hệ thống tách thành hai bước:

1. Phát hiện khuôn mặt và lấy bounding box.
2. Cắt từng khuôn mặt rồi chạy DeepFace để suy luận cảm xúc.

```text
Ảnh/frame -> resize -> detector -> lọc/gom box -> crop margin 15%
          -> DeepFace.analyze(actions=["emotion"], detector_backend="skip")
          -> dominant emotion, confidence, scores, bbox
```

## 2. Ảnh tĩnh: chế độ chính xác

`/emotion/image` gọi `analyze_static_image(..., fast=False)`.

### 2.1. Tiền xử lý và phát hiện

- Ảnh lớn được thu nhỏ về cạnh dài tối đa `1600` pixel; ảnh nhỏ được phóng lên
  tối thiểu `640` pixel.
- Detector chạy trên ảnh gốc và ảnh tăng sáng CLAHE.
- Các detector mặc định là `retinaface`, `mtcnn` và `centerface`.
- Candidate bị loại nếu confidence dưới `0.85`, box gần bằng toàn ảnh, quá nhỏ
  (dưới `3%` cạnh ngắn), hoặc có tỷ lệ rộng/cao ngoài khoảng `0.5..1.8`.

Các box được gom khi `IoU >= 0.3` hoặc `IoMin >= 0.6`. Một cluster cần tối
thiểu `2` phiếu từ các cặp `(detector, biến thể ảnh)`; candidate có confidence
`>= 0.97` được giữ dù chỉ có một phiếu. Box cuối là trung bình có trọng số theo
confidence của cluster.

### 2.2. Phân tích cảm xúc

Mỗi box được nới margin `15%`, sau đó crop được đưa vào:

```python
DeepFace.analyze(
    img_path=face_crop,
    actions=["emotion"],
    detector_backend="skip",
    enforce_detection=False,
)
```

Detector được bỏ qua ở bước này vì khuôn mặt đã được phát hiện trước. Kết quả
gồm `dominant_emotion`, toàn bộ `emotion` scores, `confidence`, `bbox` và
`face_confidence`.

## 3. Video: chế độ nhanh

`/emotion/video` lấy mẫu video ở `VIDEO_FPS = 1.0`, resize frame về `640 x 360`
và gọi `analyze_static_image(..., fast=True)`.

Chế độ nhanh dùng một detector nhẹ trên một biến thể ảnh:

```python
FAST_DETECTOR = "yunet"
FAST_FALLBACK_DETECTOR = "retinaface"
```

Nếu YuNet lỗi, hệ thống chuyển sang RetinaFace. Cạnh dài ảnh trong chế độ này
không vượt quá `960` pixel và không chạy align.

### 3.1. Cache frame tương tự

Frame được thu nhỏ về `64 x 36`, chuyển xám và tạo chữ ký pixel. Nếu sai khác
trung bình so với frame trước nhỏ hơn `SIMILAR_FRAME_THRESHOLD = 2.0`, hệ thống
dùng lại kết quả trước thay vì chạy model lại. Cách này giảm thời gian xử lý ở
những đoạn video gần như đứng yên.

### 3.2. Tổng hợp video

Với mỗi frame có mặt, service cộng emotion scores, lưu bản ghi cùng timestamp và
tạo điểm trung bình cho `timeline`. Bounding box có confidence cao nhất được
giữ làm đại diện cho từng `track_id`.

Để loại kết quả nhiễu, một `track_id` phải xuất hiện ít nhất `30%` số frame có
khuôn mặt. `totalFaces` là số khuôn mặt đại diện còn lại sau bộ lọc này, không
phải số khuôn mặt tại đúng thời điểm video đang phát.

Tỷ lệ tổng hợp hiện dùng tổng điểm cảm xúc, không dùng số phiếu dominant:

```text
emotion_summary(e) = tổng điểm e / tổng điểm mọi cảm xúc × 100
```

## 4. Webcam

Webcam hiện sử dụng nhánh tương thích `analyze_webcam_image()`:

- detector chính là OpenCV;
- nếu không có kết quả thì thử RetinaFace;
- mỗi request chứa một frame JPEG;
- DeepFace phân tích trực tiếp frame với `actions=["emotion"]`.

Đây là thuật toán cũ, khác với multi-detector của ảnh tĩnh và detector nhanh
của video. Frontend gửi tuần tự từng frame, không gửi request mới khi request
trước chưa hoàn tất để tránh xếp hàng frame cũ.

## 5. Tham số quan trọng

| Tham số | Giá trị | Tác động |
|---|---:|---|
| `MIN_FACE_CONFIDENCE` | `0.85` | Ngưỡng loại khuôn mặt yếu |
| `MIN_VOTES` | `2` | Số phiếu cần cho ảnh tĩnh |
| `CROP_MARGIN` | `0.15` | Vùng đệm quanh khuôn mặt |
| `VIDEO_FPS` | `1.0` | Tần suất lấy mẫu video |
| `SIMILAR_FRAME_THRESHOLD` | `2.0` | Ngưỡng tái sử dụng kết quả frame |
| `MIN_APPEARANCE_RATIO` | `0.3` | Ngưỡng giữ khuôn mặt trong video |

Các chỉ số `Stress Index`, `Confidence Index` và truy vấn bảng
`emotion_scores` trong bản tài liệu cũ hiện chưa được service sử dụng; không nên
dùng chúng để đối chiếu kết quả API nếu chưa triển khai thêm logic tương ứng.
