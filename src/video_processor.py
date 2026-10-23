import logging
from dataclasses import dataclass
from typing import Iterator, Optional

import cv2
import numpy as np

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


@dataclass
class Frame:
    """Đại diện cho 1 frame đã được lấy mẫu từ video."""
    image: np.ndarray
    frame_index: int
    timestamp: float  # giây, tính từ đầu video


class VideoProcessor:
    """
    Tách frame từ video theo tốc độ lấy mẫu (frames_per_second),
    không phụ thuộc FPS gốc của video.
    """

    def __init__(
        self,
        video_path: str,
        frames_per_second: float = 2.0,
        resize_to: Optional[tuple[int, int]] = None,
    ):
        if frames_per_second <= 0:
            raise ValueError("frames_per_second phải > 0")

        self.video_path = video_path
        self.frames_per_second = frames_per_second
        self.resize_to = resize_to  # (width, height), None = giữ nguyên

    def extract_frames(self) -> Iterator[Frame]:
        cap = cv2.VideoCapture(self.video_path)
        if not cap.isOpened():
            raise ValueError(f"Không mở được video: {self.video_path}")

        try:
            original_fps = cap.get(cv2.CAP_PROP_FPS)
            if not original_fps or original_fps <= 0:
                logger.warning("Không đọc được FPS gốc, dùng mặc định 25")
                original_fps = 25.0

            frame_step = max(1, round(original_fps / self.frames_per_second))
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            logger.info(
                "Video: %s | FPS gốc: %.2f | tổng frame: %d | frame_step: %d",
                self.video_path, original_fps, total_frames, frame_step,
            )

            frame_index = 0
            extracted_count = 0
            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                if frame_index % frame_step == 0:
                    if self.resize_to is not None:
                        frame = cv2.resize(frame, self.resize_to)

                    yield Frame(
                        image=frame,
                        frame_index=frame_index,
                        timestamp=round(frame_index / original_fps, 2),
                    )
                    extracted_count += 1

                frame_index += 1

            logger.info("Hoàn tất: %d frame đã được trích xuất", extracted_count)
        finally:
            cap.release()