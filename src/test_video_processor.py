import numpy as np
import pytest
import cv2

from video_processor import VideoProcessor


@pytest.fixture
def fake_video(tmp_path):
    path = str(tmp_path / "fake.mp4")
    fps, total_frames, size = 30, 90, (64, 64)

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(path, fourcc, fps, size)
    for i in range(total_frames):
        frame = np.full((size[1], size[0], 3), fill_value=i % 256, dtype=np.uint8)
        writer.write(frame)
    writer.release()

    return path


def test_extract_frames_count(fake_video):
    frames = list(VideoProcessor(fake_video, frames_per_second=2.0).extract_frames())
    assert 5 <= len(frames) <= 7


def test_timestamp_increasing(fake_video):
    frames = list(VideoProcessor(fake_video, frames_per_second=2.0).extract_frames())
    timestamps = [f.timestamp for f in frames]
    assert timestamps == sorted(timestamps)


def test_invalid_path():
    with pytest.raises(ValueError):
        list(VideoProcessor("khong_ton_tai.mp4").extract_frames())


def test_invalid_fps_value():
    with pytest.raises(ValueError):
        VideoProcessor("dummy.mp4", frames_per_second=0)


def test_resize_option(fake_video):
    frames = list(VideoProcessor(fake_video, frames_per_second=2.0, resize_to=(32, 32)).extract_frames())
    assert frames[0].image.shape[:2] == (32, 32)


def test_higher_fps_more_frames(fake_video):
    low = list(VideoProcessor(fake_video, frames_per_second=1.0).extract_frames())
    high = list(VideoProcessor(fake_video, frames_per_second=5.0).extract_frames())
    assert len(high) > len(low)