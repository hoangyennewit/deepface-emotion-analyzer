# Webcam thời gian thực: MediaPipe + trạng thái học tập

Tài liệu này mô tả nhánh xử lý webcam mới trong
`backend/src/services/webcam_analyzer.py` và endpoint `POST /emotion/webcam`.
Ảnh tĩnh (`/emotion/image`) và video (`/emotion/video`) vẫn dùng DeepFace như
mô tả trong `26_thuat_toan_chi_so_tong_hop.md`.

## 1. Vì sao thay DeepFace ở webcam

Cách cũ gọi `DeepFace.analyze()` cho **từng khung hình**:

```text
frame JPEG -> OpenCV detect -> crop -> mạng CNN phân loại cảm xúc -> response
```

Mỗi request phải chạy lại cả bộ phát hiện khuôn mặt và mạng phân loại, tốn
khoảng 0,5 – 1,5 giây trên CPU. Kết quả là webcam chỉ cập nhật được 1–2
khung/giây, overlay bị "đứng hình" và các trạng thái như buồn ngủ không thể
tính được vì thiếu mẫu.

Nhánh mới thay bằng **MediaPipe FaceLandmarker**:

* model chỉ ~3,7 MB, chạy CPU, một lần suy luận ~10–30 ms;
* trả về 478 điểm mốc khuôn mặt, 52 hệ số blendshape (tương đương Action Unit
  theo FACS) và ma trận biến đổi 4×4 để suy ra góc đầu;
* giữ được `track_id` giữa các request nhờ bộ theo dõi tâm khuôn mặt.

Thời gian đo trên máy thử (Python 3.15, CPU, frame 1280×720, 2 khuôn mặt):

| Bước | Thời gian |
|---|---:|
| Nạp model lần đầu (mỗi tiến trình) | ~750 ms |
| Phân tích mỗi frame (2 mặt) | 20–30 ms |
| Trung bình sau khi đã nạp model | ~36 ms |

So với ~500–1500 ms của DeepFace, đây là lý do chính khiến webcam mượt hơn.

## 2. Luồng xử lý

```text
Trình duyệt (400 ms/frame)
  -> canvas.toBlob(JPEG 0.8)
  -> POST /emotion/webcam
  -> webcam_analyzer.analyze_webcam_frame(bytes)
       -> resize cạnh rộng 640
       -> FaceLandmarker.detect_for_video()   (chế độ VIDEO có tracking)
       -> blendshape + EAR + góc đầu
       -> cập nhật track (EMA), tính cảm xúc + trạng thái
  -> JSON: faces[] + summary
```

Frontend gửi frame mới sau 400 ms và bỏ nhịp nếu request trước chưa xong
(`busyRef`), nên không bao giờ dồn hàng đợi frame cũ.

## 3. Cảm xúc cơ bản

7 cảm xúc (`happy`, `sad`, `angry`, `surprise`, `fear`, `disgust`, `neutral`)
được tính từ blendshape bằng tổ hợp có trọng số các Action Unit đặc trưng:

| Cảm xúc | Tín hiệu chính |
|---|---|
| `happy` | `mouthSmileLeft/Right`, `cheekSquint*`, trừ `mouthFrown*` |
| `sad` | `browInnerUp`, `mouthFrown*`, `mouthLowerDown*` |
| `angry` | `browDown*`, `noseSneer*`, `mouthPress*` |
| `surprise` | `browOuterUp*`, `jawOpen`, `eyeWide*` |
| `fear` | `browInnerUp`, `browOuterUp*`, `eyeWide*`, `mouthStretch*` |
| `disgust` | `noseSneer*`, `mouthUpperUp*`, `browDown*` |
| `neutral` | không có tín hiệu mạnh nào ở trên |

Điểm thô được cắt về `[0, 1]`, chuẩn hoá mềm (power 1.15) để tổng bằng 1, rồi
nhân 100 khi trả về API cho khớp định dạng điểm cảm xúc cũ. Xác suất được làm
mượt EMA 0,5 giữa các frame để nhãn không nhấp nháy. Nếu xác suất lớn nhất
dưới 34 %, nhãn được đổi thành `neutral`.

## 4. Trạng thái giám sát lớp học

Hệ thống trả thêm 4 trạng thái hành vi (không phải lớp của mạng nơ-ron):

| Trạng thái | Ý nghĩa | Cách tính |
|---|---|---|
| `focused` | Tập trung | mặc định khi không thoả các điều kiện dưới |
| `distracted` | Mất tập trung | `attention < 0.45` hoặc quay đầu `|yaw| > 30°`, `|pitch| > 32°` |
| `tired` | Mệt mỏi / buồn ngủ | `fatigue ≥ 0.55` sau ít nhất 2 giây quan sát |
| `confused` | Bối rối / khó hiểu | `confusion ≥ 0.62`, chú ý vẫn cao, sau 2 giây |

### 4.1. Mức chú ý (attention)

```text
head  = clamp(1 - max(0, |yaw| - 10)/32) × clamp(1 - max(0, |pitch| - 12)/30)
gaze  = clamp(1 - lệch mắt ngang/0.55) × clamp(1 - lệch mắt dọc/0.65)
attention = 0.5 × head + 0.3 × gaze + 0.2 × độ mở mắt
```

Hướng mắt lấy trực tiếp từ các blendshape `eyeLookIn/Out/Up/Down`. Giá trị được
làm mượt EMA 0,35 và trả về thang 0–100.

### 4.2. Mức mệt mỏi (fatigue)

Ba tín hiệu, kết hợp theo trọng số:

```text
perclos      = clamp((tỉ lệ mẫu nhắm mắt trong 20 s - 0.25) / 0.45)
microsleep   = 1 nếu 2 mẫu liên tiếp đều nhắm mắt
yawn         = 1 nếu vừa ngáp trong 12 s

fatigue = 0.40 × perclos + 0.30 × microsleep + 0.30 × yawn
```

* Mắt nhắm được xác định bằng **EAR** (Eye Aspect Ratio) từ điểm mốc mắt, có
  baseline thích nghi theo từng người nên ít bị ảnh hưởng bởi hình dáng mắt
  hay kính.
* Ngáp khi `jawOpen > 0.45` kèm `mouthStretch/mouthFunnel` kéo dài hơn 0,6 s.
* Vì webcam gửi 2,5 frame/giây, PERCLOS ở đây là tỉ lệ trên **các mẫu đã lấy**,
  không phải trên mọi khung hình video. Vì vậy trạng thái `tired` cần bằng
  chứng lặp lại (nhắm mắt liên tục, ngáp) trước khi bật, tránh báo nhầm khi
  người dùng chỉ chớp mắt.

### 4.3. Bối rối (confusion)

```text
confusion = 0.42 × cau mày (browDown) + 0.28 × nhíu trong (browInnerUp)
          + 0.15 × mím/mếu môi + 0.15 × nghiêng đầu
```

Chỉ gán `confused` khi mức chú ý vẫn ≥ 0,5 — tức là người học đang nhìn bài
nhưng mặt căng thẳng, khác với trường hợp quay đi.

## 5. Theo dõi khuôn mặt (track)

* MediaPipe không trả ID người, nên mỗi khuôn mặt được ghép với track cũ theo
  khoảng cách tâm chia cho kích thước mặt (ngưỡng 1,0).
* Track biến mất quá 2 giây bị xoá; nếu người dùng dừng webcam quá 2,5 giây,
  toàn bộ track được reset và ID đánh lại từ 1 cho phiên mới.
* Blendshape, cảm xúc và các chỉ số được làm mượt EMA để ổn định qua các
  request rời rạc.

## 6. Response của `POST /emotion/webcam`

```json
{
  "success": true,
  "engine": "mediapipe",
  "total_faces": 1,
  "faces": [
    {
      "track_id": 1,
      "dominate_emotion": "happy",
      "dominant_emotion": "happy",
      "confidence": 91.2,
      "emotion": {"happy": 91.2, "neutral": 4.8, "...": 0.0},
      "emotion_label": "Vui vẻ",
      "bbox": [200, 238, 192, 236],
      "state": "focused",
      "state_label": "Tập trung",
      "attention": 65.0,
      "fatigue": 0.0,
      "is_yawning": false,
      "yaw": -6.2,
      "pitch": 1.5
    }
  ],
  "summary": {
    "states": {"focused": 1, "distracted": 0, "tired": 0, "confused": 0},
    "attention": 65.0,
    "fatigue": 0.0,
    "alert": false
  }
}
```

Khung hình không có khuôn mặt trả HTTP **400** với
`{"detail": "Không tìm thấy dữ liệu khuôn mặt."}` như hành vi cũ.

## 7. Dự phòng và giới hạn

* Nếu máy chưa cài `mediapipe`, service tự quay về DeepFace (chậm hơn) và log
  cảnh báo; response vẫn giữ các trường cũ, các trường trạng thái nhận giá trị
  mặc định.
* Model được tải tự động lần đầu về `models/face_landmarker.task` (đã nằm
  trong `.gitignore`). Có thể tải trước bằng:

  ```bash
  cd backend
  python -m src.services.webcam_analyzer
  ```

  hoặc đặt biến môi trường `WEBCAM_MODEL_PATH` trỏ tới file `.task` khác.
* Cảm xúc từ blendshape phù hợp cho giám sát tương tác, không dùng để kết luận
  tâm lý. Ảnh tĩnh/video vẫn dùng DeepFace để giữ độ chính xác và tương thích
  dữ liệu lịch sử.
* Trạng thái được tính realtime nhưng **chưa lưu vào bảng lịch sử**; phiên
  webcam hiện chỉ lưu cảm xúc như trước. Nếu cần thống kê trạng thái theo
  phiên, phải mở rộng schema `WebcamFaceSample` và bảng `face_analysic`.

## 8. Tham số có thể chỉnh

| Tham số | Giá trị | Tác dụng |
|---|---:|---|
| `MAX_INFER_WIDTH` | `640` | chiều rộng frame đưa vào model; giảm còn 480 nếu máy yếu |
| `MAX_FACES` | `5` | số khuôn mặt tối đa mỗi khung |
| `RESET_IDLE_SECONDS` | `2.5` | thời gian nghỉ để coi là phiên mới |
| `FATIGUE_TIRED` | `0.55` | ngưỡng bật trạng thái mệt mỏi |
| `ATTENTION_DISTRACTED` | `0.45` | ngưỡng mất tập trung theo mức chú ý |
| `CONFUSION_CONFUSED` | `0.62` | ngưỡng bật trạng thái bối rối |
| `ANALYSIS_INTERVAL_MS` (frontend) | `400` | nhịp gửi frame webcam |
