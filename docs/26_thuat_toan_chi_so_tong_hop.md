# 2.6. Thuật toán tính chỉ số tổng hợp cảm xúc

## 1. Tỷ lệ % cảm xúc chủ đạo

- Với mỗi khuôn mặt trong mỗi frame, lấy cảm xúc có điểm số cao nhất (dominant emotion — đúng cột `is_dominant` trong bảng `emotion_scores`).
- Đếm số phiếu của từng cảm xúc trên toàn bộ video, chia cho tổng số khuôn mặt:

```
ty_le(e) = so_khuon_mat_chu_dao(e) / tong_so_khuon_mat × 100%
```

Ví dụ: video có 200 khuôn mặt phân tích được, 110 khuôn mặt dominant là `happy` → happy = 55%.

## 2. Chỉ số căng thẳng (Stress Index, thang 0–100)

Căng thẳng là tổ hợp có trọng số của các cảm xúc tiêu cực:

```
stress_khuon_mat = Σ (diem_so_cx × trong_so_cx)
Stress_Index = trung_binh(stress_khuon_mat) × 100   (clamp 0–100)
```

| Cảm xúc | Trọng số | Lý do |
|---|---|---|
| fear | +0.30 | Sợ hãi — dấu hiệu căng thẳng mạnh nhất |
| angry | +0.30 | Tức giận — căng thẳng cao |
| sad | +0.20 | Buồn |
| disgust | +0.15 | Khó chịu |
| surprise | +0.05 | Ngạc nhiên hơi tăng |
| neutral | −0.05 | Bình tĩnh làm giảm nhẹ |
| happy | −0.15 | Vui vẻ làm giảm rõ rệt |

## 3. Chỉ số tự tin (Confidence Index, thang 0–100)

Từng khuôn mặt:

```
emo = clamp01( (happy×0.55 + neutral×0.25 + surprise×0.10) / 0.90
              - (sad×0.50 + fear×0.60 + angry×0.30 + disgust×0.30) )
conf_khuon_mat = 0.8 × emo + 0.2 × face_confidence
Confidence_Index = trung_binh(conf_khuon_mat) × 100
```

- Phần cảm xúc (80%): vui/bình tĩnh/ngạc nhiên làm tăng (đã chuẩn hóa về 0–1),
  buồn/sợ/tức/khó chịu bị trừ điểm.
- Phần kỹ thuật (20%): `face_confidence` từ bảng `detected_faces` — khuôn mặt
  càng rõ nét càng đáng tin.

## 4. Dữ liệu đầu vào (theo Database Schema 1.2)

```sql
SELECT s.emotion, s.score, s.is_dominant, f.face_confidence
FROM emotion_scores s
JOIN detected_faces f ON f.id = s.face_id
JOIN frame_analyses  fr ON fr.id = f.frame_id
WHERE fr.session_id = ?;        -- ? = id phiên cần tổng hợp
```

## 5. Cách dùng trong code

Xem file `src/emotion_metrics.py` — hàm `summarize_session(records, face_confidences)`
trả về toàn bộ chỉ số để lưu DB hoặc xuất báo cáo PDF/Excel.

## 6. Lưu ý

- Trọng số ở bảng trên là **khuyến nghị ban đầu**, nhóm có thể tinh chỉnh sau khi thử nghiệm trên video thật.
- Nếu video không phát hiện được khuôn mặt nào → mọi chỉ số = 0 (tránh chia cho 0).
- Các chỉ số này nên lưu vào bảng mới `session_metrics` hoặc thêm cột vào `analysis_sessions` nếu nhóm đồng ý.
