import type { AnalysisSession } from "../types/api";

/**
 * Dữ liệu giả lập, khớp đúng schema DB, dùng để dựng UI
 * trong lúc chờ backend hoàn thành API thật.
 * Xóa file này khi backend đã sẵn sàng.
 */
export function getMockSession(): AnalysisSession {
  return {
    id: 1,
    session_name: "demo_video.mp4",
    input_type: "video",
    status: "completed",
    duration_seconds: 12.5,
    fps: 30,
    frames: [
      {
        id: 1,
        frame_index: 0,
        timestamp_sec: 0,
        faces: [
          {
            id: 1,
            bbox_x: 120,
            bbox_y: 80,
            bbox_width: 150,
            bbox_height: 150,
            face_confidence: 0.98,
            emotions: [
              { emotion: "happy", score: 0.72, is_dominant: true },
              { emotion: "neutral", score: 0.15, is_dominant: false },
              { emotion: "surprise", score: 0.06, is_dominant: false },
              { emotion: "sad", score: 0.03, is_dominant: false },
              { emotion: "angry", score: 0.02, is_dominant: false },
              { emotion: "fear", score: 0.01, is_dominant: false },
              { emotion: "disgust", score: 0.01, is_dominant: false },
            ],
          },
        ],
      },
      {
        id: 2,
        frame_index: 15,
        timestamp_sec: 0.5,
        faces: [
          {
            id: 2,
            bbox_x: 118,
            bbox_y: 82,
            bbox_width: 152,
            bbox_height: 148,
            face_confidence: 0.97,
            emotions: [
              { emotion: "neutral", score: 0.55, is_dominant: true },
              { emotion: "sad", score: 0.2, is_dominant: false },
              { emotion: "happy", score: 0.1, is_dominant: false },
              { emotion: "angry", score: 0.08, is_dominant: false },
              { emotion: "fear", score: 0.04, is_dominant: false },
              { emotion: "surprise", score: 0.02, is_dominant: false },
              { emotion: "disgust", score: 0.01, is_dominant: false },
            ],
          },
        ],
      },
    ],
  };
}   