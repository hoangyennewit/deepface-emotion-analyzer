import cv2
from deepface import DeepFace
from collections import deque, Counter

class EmotionSmoother:
    def __init__(self, window_size=5):
        """Khởi tạo cửa sổ trượt chứa 5 kết quả gần nhất"""
        self.emotion_window = deque(maxlen=window_size)

    def smooth(self, current_emotion):
        if not current_emotion:
            return None
        # Thêm kết quả mới, đẩy kết quả cũ nhất ra ngoài
        self.emotion_window.append(current_emotion)
        # Tìm cảm xúc xuất hiện nhiều nhất trong cửa sổ
        counts = Counter(self.emotion_window)
        return counts.most_common(1)[0][0]

def run_webcam_test():
    # Khởi tạo camera và bộ làm mịn
    cap = cv2.VideoCapture(0)
    smoother = EmotionSmoother(window_size=7) # Dùng 7 frames cho mượt
    
    print("Đang mở Webcam... Bấm phím 'q' trên cửa sổ camera để thoát.")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        try:
            # Dùng DeepFace phân tích cảm xúc (nhanh, không ép buộc phải có mặt)
            results = DeepFace.analyze(frame, actions=['emotion'], enforce_detection=False, detector_backend='skip')
            raw_emotion = results[0]['dominant_emotion']
            
            # Đưa qua hàm làm mịn
            smoothed_emotion = smoother.smooth(raw_emotion)

            # In kết quả lên màn hình video để so sánh
            cv2.putText(frame, f"Raw: {raw_emotion}", (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            cv2.putText(frame, f"Smoothed: {smoothed_emotion}", (30, 100), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

        except Exception as e:
            print("Lỗi nhận diện:", e)  # Thay chữ 'pass' bằng dòng này
        # Hiển thị video
        cv2.imshow("Test Thuat Toan Smoothing", frame)

        # Bấm 'q' để thoát
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    run_webcam_test()