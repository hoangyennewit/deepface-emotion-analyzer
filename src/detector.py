import logging
from typing import Optional

from deepface import DeepFace

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


class EmotionDetector:
    """Wrapper quanh DeepFace để phân tích cảm xúc trên từng frame."""

    def __init__(self, detector_backend: str = "opencv"):
        # detector_backend: opencv (nhanh) | retinaface (chính xác hơn, chậm hơn) | mtcnn ...
        self.detector_backend = detector_backend

    def analyze(self, image) -> Optional[dict]:
        """
        Trả về dict kết quả DeepFace (gồm 'emotion', 'dominant_emotion'),
        hoặc None nếu không phát hiện được khuôn mặt / có lỗi.
        """
        try:
            results = DeepFace.analyze(
                img_path=image,
                actions=["emotion"],
                detector_backend=self.detector_backend,
                enforce_detection=True,  # bắt buộc phải detect được mặt
            )
            return results[0] if results else None
        except ValueError:
            # Không tìm thấy mặt trong frame -> bỏ qua, không phải lỗi hệ thống
            return None
        except Exception as e:
            logger.error("Lỗi phân tích cảm xúc: %s", e)
            return None