# Giao diện phân tích cảm xúc — Task 4.3

Xây dựng giao diện phân tích ảnh/video và hiển thị kết quả, sử dụng React + TypeScript (Vite). Đây là phần việc thuộc **nhiệm vụ 4.3**: "Xây dựng giao diện phân tích ảnh và hiển thị kết quả" trong đồ án DeepFace Emotion Analyzer.

## Tổng quan

Giao diện có 2 chế độ:

1. **Tải ảnh/video** — người dùng upload file, hệ thống xử lý (có thể mất thời gian với video dài), hiển thị kết quả cảm xúc theo từng khung hình dưới dạng dải "phim" có thể chọn xem.
2. **Camera trực tiếp** — bật webcam, mỗi giây gửi 1 khung hình để phân tích, hiển thị kết quả gần như tức thời.

Hiện tại giao diện đang chạy với **dữ liệu giả (mock)** vì backend chưa hoàn thành. Phần dưới giải thích chi tiết cách chuyển sang dùng API thật khi backend xong.

## Cài đặt & chạy

```bash
npm install
npm run dev
```

Yêu cầu Node.js 18+.
```
## Cấu trúc thư mục
src/
├── theme.ts # Token thiết kế dùng chung: màu, font, nhãn/màu cảm xúc
├── App.tsx # Entry point
├── types/
│ └── api.ts # Định nghĩa kiểu dữ liệu (Session, Frame, Face, Emotion...)
├── api/
│ ├── sessionApi.ts # Gọi API thật — chế độ upload
│ ├── mockApi.ts # Dữ liệu giả — chế độ upload (XÓA khi có backend)
│ ├── realtimeApi.ts # Gọi API thật — chế độ webcam
│ └── mockRealtime.ts # Dữ liệu giả — chế độ webcam (XÓA khi có backend)
└── components/EmotionAnalyzer/
├── EmotionAnalyzerPage.tsx # Trang cha: tab "Tải ảnh/video" ↔ "Camera trực tiếp"
├── SessionUploader.tsx # UI + logic upload, theo dõi tiến trình xử lý
├── WebcamAnalyzer.tsx # UI + logic bật camera, chụp & gửi frame định kỳ
├── FrameTimeline.tsx # Dải khung hình "phim", chọn xem chi tiết từng frame
├── DominantPanel.tsx # Ô hiển thị cảm xúc chủ đạo (to, nổi bật)
└── EmotionBar.tsx # Thanh bar hiển thị % từng cảm xúc, sắp xếp giảm dần
```

## Thiết kế giao diện

### Bảng màu & font (`theme.ts`)

| Token | Giá trị | Dùng cho |
|---|---|---|
| `colors.bg` | `#F1F2EE` | Nền trang |
| `colors.surface` | `#FFFFFF` | Nền card |
| `colors.accent` | `#1F6F63` | Hero band, nút chính, tab đang chọn |
| `colors.highlight` | `#D6963A` | Điểm nhấn phụ |
| `colors.danger` | `#C24B3F` | Thông báo lỗi, nút tắt camera |
| `font.display` | Fraunces (serif) | Tiêu đề |
| `font.ui` | Inter (sans-serif) | Nội dung, nhãn, nút |

Mỗi cảm xúc (`emotionMeta` trong `theme.ts`) có **1 màu riêng cố định** — dùng xuyên suốt ở mọi nơi hiển thị (thanh bar, chấm màu trên timeline, khung bao quanh mặt trong camera) để người dùng nhận diện nhất quán mà không cần đọc chữ.

### Nguyên tắc bố cục

- Chỉ 1 điểm nhấn màu đậm (dải màu `accent` ở đầu trang) — phần còn lại giữ trung tính để **dữ liệu cảm xúc là thứ nổi bật nhất**, không phải giao diện.
- Cảm xúc chủ đạo (`DominantPanel`) luôn hiển thị to, có nền tint theo đúng màu cảm xúc đó — không chỉ là 1 dòng chữ nhỏ trong danh sách.

## Luồng hoạt động

```
### Chế độ Tải ảnh/video
Người dùng chọn file
│
▼
createSession(file, type) → backend trả về { id }
│
▼
pollSession(id, callback) → gọi lại getSession(id) mỗi 2 giây
│
▼
status: pending → processing → completed
│
▼
Hiển thị FrameTimeline (dải khung hình + chi tiết cảm xúc)

Vì video dài cần thời gian xử lý (DeepFace chạy qua từng frame), giao diện **không chờ 1 request duy nhất** mà dùng cơ chế polling — hỏi lại định kỳ cho tới khi xử lý xong.

### Chế độ Camera trực tiếp
Bấm "Bật camera"
│
▼
getUserMedia() → hiển thị video preview
│
▼
setInterval mỗi 1000ms:

Vẽ frame hiện tại lên canvas ẩn
Gửi canvas.toBlob() lên backend
Nhận kết quả, cập nhật UI ngay
│
▼
Bấm "Tắt camera" → dừng interval + dừng mọi track của stream
```
**Lưu ý quan trọng:** khi tắt camera, bắt buộc gọi `stream.getTracks().forEach(track => track.stop())` — nếu thiếu bước này, đèn camera trên máy vẫn sáng dù giao diện đã ẩn video.

## API contract (backend cần triển khai đúng theo đây)

### Chế độ upload — xử lý bất đồng bộ, có lưu DB
```
POST /api/sessions
Content-Type: multipart/form-data
Body: { file: File, input_type: "image" | "video" }
Response: { id: number, status: "pending" }

GET /api/sessions/:id
Response: {
id, session_name, input_type, status,
duration_seconds, fps,
frames: [
{
id, frame_index, timestamp_sec,
faces: [
{
id, bbox_x, bbox_y, bbox_width, bbox_height, face_confidence,
emotions: [
{ emotion: "happy", score: 0.82, is_dominant: true },
... (đủ 7 cảm xúc)
]
}
]
}
]
}
```

Format này khớp trực tiếp với schema DB (`analysis_sessions` → `frame_analyses` → `detected_faces` → `emotion_scores`), nên backend có thể trả gần như nguyên bản kết quả JOIN từ 4 bảng này.

### Chế độ webcam — xử lý đồng bộ, KHÔNG nên lưu DB mỗi request
```
POST /api/realtime/analyze
Content-Type: multipart/form-data
Body: { frame: Blob (JPEG) }
Response: {
faces: [
{ bbox_x, bbox_y, bbox_width, bbox_height, face_confidence, emotions: [...] }
]
}
```

Route này bị gọi liên tục (mỗi giây), nên backend cần trả kết quả nhanh — tránh ghi `INSERT` vào DB đồng bộ trong request này vì sẽ làm bảng `frame_analyses` phình rất nhanh và làm chậm phản hồi. Nếu cần lưu lịch sử webcam, nên đẩy việc ghi log sang tiến trình nền (background task/queue), không chặn response.

## Cần làm gì khi backend viết xong (checklist)

Giao diện hiện đang chạy hoàn toàn bằng dữ liệu giả để không phải chờ backend. Khi backend đã có API thật:

- [ ] **Xóa 2 file mock**: `src/api/mockApi.ts`, `src/api/mockRealtime.ts`
- [ ] **Đổi cờ `USE_MOCK`**: tìm và sửa `const USE_MOCK = true` → `false` ở 2 file `SessionUploader.tsx` và `WebcamAnalyzer.tsx`, xóa luôn nhánh code `if (USE_MOCK) {...}` bên trong
- [ ] **Cập nhật địa chỉ backend**: sửa `API_BASE_URL` trong `sessionApi.ts` và `realtimeApi.ts` (khuyến khích chuyển sang biến môi trường `.env` thay vì hard-code, xem mục bên dưới)
- [ ] **Đối chiếu response thật với `types/api.ts`**: gọi thử API bằng Postman/curl, so sánh field-by-field với `AnalysisSession`, `FrameAnalysis`, `DetectedFace`, `EmotionScore` — nếu backend đặt tên field khác (VD `x` thay vì `bbox_x`), chỉ cần sửa hàm gọi API trong `sessionApi.ts`/`realtimeApi.ts` để chuyển đổi định dạng, **không cần sửa bất kỳ component nào** (đây là lý do tách riêng lớp `api/`)
- [ ] **Xác nhận backend đã bật CORS** cho origin của Vite (`http://localhost:5173`), nếu không sẽ gặp lỗi `CORS policy blocked` dù backend chạy đúng
- [ ] **Kiểm tra tốc độ route `/api/realtime/analyze`**: nếu backend xử lý 1 frame mất hơn 1 giây, tăng `ANALYZE_INTERVAL_MS` trong `WebcamAnalyzer.tsx` (hiện đang là `1000`) để tránh dồn request

### Dùng biến môi trường cho API URL (khuyến nghị)

Tạo file `.env` ở gốc `frontend/`:

VITE_API_BASE_URL=http://localhost:5000


Sửa trong `sessionApi.ts` và `realtimeApi.ts`:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";
```

### Ví dụ chuyển đổi format nếu backend trả khác cấu trúc

Nếu backend trả `emotion_scores` dạng object (`{ happy: 0.8, sad: 0.1, ... }`) thay vì mảng như `types/api.ts` đang định nghĩa, chỉ cần sửa trong `sessionApi.ts`:

```typescript
export async function getSession(id: number): Promise<AnalysisSession> {
  const res = await fetch(`${API_BASE_URL}/api/sessions/${id}`);
  if (!res.ok) throw new Error(`Không lấy được kết quả: ${res.status}`);
  const raw = await res.json();

  return {
    ...raw,
    frames: raw.frames.map((f: any) => ({
      ...f,
      faces: f.faces.map((face: any) => ({
        ...face,
        emotions: Object.entries(face.emotion_scores).map(([emotion, score]) => ({
          emotion,
          score,
          is_dominant: emotion === face.dominant_emotion,
        })),
      })),
    })),
  };
}
```

Component (`FrameTimeline.tsx`, `EmotionBar.tsx`...) không cần đổi gì — vẫn nhận đúng shape `EmotionScore[]` như đã định nghĩa.

## Giới hạn hiện tại / điều cần lưu ý cho backend

- Giao diện giả định mỗi frame chỉ hiển thị khuôn mặt đầu tiên (`faces[0]`) trong khung camera — nếu backend trả về nhiều khuôn mặt trong 1 frame, phần `WebcamAnalyzer.tsx` cần mở rộng để vẽ nhiều khung bao cùng lúc.
- Nếu backend dùng `enforce_detection=False` (DeepFace), các frame không có mặt người có thể trả về kết quả cảm xúc "rác". Giao diện đã xử lý sẵn trường hợp `faces: []` (hiện thông báo "Không phát hiện khuôn mặt") — backend nên trả `faces: []` thay vì cố tạo 1 khuôn mặt giả khi không detect được.
- Kích thước khung hình gửi lên từ webcam cố định `640×480` (khai báo trong `WebcamAnalyzer.tsx` qua `CAPTURE_WIDTH`/`CAPTURE_HEIGHT`) — nếu backend cần resize khác, có thể xử lý phía server, không ảnh hưởng tới frontend.

## Công nghệ sử dụng

- React 18 + TypeScript
- Vite (dev server, build tool)
- Inline style (CSS-in-TS) — không dùng file `.css` riêng, toàn bộ style nằm trong từng component
- Web API: `MediaDevices.getUserMedia`, `Canvas`, `fetch`