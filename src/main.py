import argparse
import json
import logging

import numpy as np

from video_processor import VideoProcessor
from detector import EmotionDetector

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def to_serializable(obj):
    """Convert numpy types sang kiểu Python thường để json.dump không lỗi."""
    if isinstance(obj, dict):
        return {k: to_serializable(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [to_serializable(v) for v in obj]
    if isinstance(obj, (np.floating, np.integer)):
        return obj.item()
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj


def analyze_video(video_path: str, frames_per_second: float = 2.0) -> list[dict]:
    processor = VideoProcessor(video_path, frames_per_second=frames_per_second)
    detector = EmotionDetector()

    results = []
    for frame in processor.extract_frames():
        analysis = detector.analyze(frame.image)
        if analysis is None:
            continue

        entry = {
            "timestamp": frame.timestamp,
            "frame_index": frame.frame_index,
            "dominant_emotion": analysis["dominant_emotion"],
            "emotion_scores": analysis["emotion"],
        }
        results.append(entry)
        logger.info("[%ss] -> %s", frame.timestamp, analysis["dominant_emotion"])

    return to_serializable(results)


def main():
    parser = argparse.ArgumentParser(description="Phân tích cảm xúc từ video")
    parser.add_argument("video_path", help="Đường dẫn tới file video")
    parser.add_argument("--fps", type=float, default=2.0, help="Số frame lấy mẫu mỗi giây")
    parser.add_argument("--output", default="result.json", help="File JSON lưu kết quả")
    args = parser.parse_args()

    results = analyze_video(args.video_path, frames_per_second=args.fps)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    logger.info("Đã lưu kết quả vào %s (%d entries)", args.output, len(results))


if __name__ == "__main__":
    main()