import logging
from dataclasses import dataclass
from typing import Iterator, Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class Frame:
    """Một frame đã được lấy mẫu từ video."""
    image: np.ndarray
    frame_index: int
    timestamp: float


class VideoProcessor:
    """
    Tách frame từ video theo frames_per_second,
    không phụ thuộc FPS gốc của video.
    """

    def __init__(
        self,
        video_path: str,
        frames_per_second: float = 1.0,
        resize_to: Optional[tuple[int, int]] = None,
    ):
        if frames_per_second <= 0:
            raise ValueError(
                "frames_per_second phải > 0"
            )

        self.video_path = video_path
        self.frames_per_second = frames_per_second
        self.resize_to = resize_to

    def get_metadata(
        self,
    ) -> dict[str, float | int]:
        """
        [THÊM] Lấy metadata tại VideoProcessor để emotion_service
        không phải thao tác OpenCV trực tiếp.
        """
        capture = cv2.VideoCapture(
            self.video_path
        )

        if not capture.isOpened():
            raise ValueError(
                f"Không mở được video: {self.video_path}"
            )

        try:
            fps = float(
                capture.get(
                    cv2.CAP_PROP_FPS
                )
                or 0.0
            )

            if fps <= 0:
                logger.warning(
                    "Không đọc được FPS gốc, dùng mặc định 25"
                )
                fps = 25.0

            total_frames = int(
                capture.get(
                    cv2.CAP_PROP_FRAME_COUNT
                )
                or 0
            )

            duration = (
                round(total_frames / fps, 2)
                if total_frames > 0
                else 0.0
            )

            return {
                "fps": fps,
                "total_frames": total_frames,
                "duration": duration,
            }

        finally:
            capture.release()

    def extract_frames(
        self,
    ) -> Iterator[Frame]:
        capture = cv2.VideoCapture(
            self.video_path
        )

        if not capture.isOpened():
            raise ValueError(
                f"Không mở được video: {self.video_path}"
            )

        try:
            original_fps = float(
                capture.get(
                    cv2.CAP_PROP_FPS
                )
                or 0.0
            )

            if original_fps <= 0:
                logger.warning(
                    "Không đọc được FPS gốc, dùng mặc định 25"
                )
                original_fps = 25.0

            frame_step = max(
                1,
                round(
                    original_fps
                    / self.frames_per_second
                ),
            )

            total_frames = int(
                capture.get(
                    cv2.CAP_PROP_FRAME_COUNT
                )
                or 0
            )

            logger.info(
                (
                    "Video: %s | FPS gốc: %.2f | "
                    "tổng frame: %d | frame_step: %d"
                ),
                self.video_path,
                original_fps,
                total_frames,
                frame_step,
            )

            frame_index = 0
            extracted_count = 0

            while True:
                success, frame = capture.read()

                if not success:
                    break

                if frame_index % frame_step == 0:
                    if self.resize_to is not None:
                        frame = cv2.resize(
                            frame,
                            self.resize_to,
                        )

                    yield Frame(
                        image=frame,
                        frame_index=frame_index,
                        timestamp=round(
                            frame_index / original_fps,
                            2,
                        ),
                    )

                    extracted_count += 1

                frame_index += 1

            logger.info(
                "Hoàn tất: %d frame đã được trích xuất",
                extracted_count,
            )

        finally:
            capture.release()
