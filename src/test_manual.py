import cv2
from video_processor import VideoProcessor


def test_manual(video_path: str, frames_per_second: float = 2.0):
    processor = VideoProcessor(video_path, frames_per_second)

    count = 0
    for frame in processor.extract_frames():
        print(f"Frame #{frame.frame_index} | timestamp: {frame.timestamp}s | shape: {frame.image.shape}")
        count += 1

        if count <= 5:
            cv2.imshow(f"Frame {frame.frame_index}", frame.image)
            cv2.waitKey(500)

    cv2.destroyAllWindows()
    print(f"\n✅ Tổng số frame đã lấy: {count}")


if __name__ == "__main__":
    test_manual("sample_video.mp4", frames_per_second=2.0)