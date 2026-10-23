import type { RealtimeAnalysisResponse } from "../types/api";

const emotions = ["angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"] as const;

export function getMockRealtimeFrame(): RealtimeAnalysisResponse {
  const raw = emotions.map(() => Math.random());
  const sum = raw.reduce((a, b) => a + b, 0);
  const scores = raw.map((v) => v / sum);
  const maxIndex = scores.indexOf(Math.max(...scores));

  return {
    faces: [
      {
        bbox_x: 180 + Math.random() * 20,
        bbox_y: 80 + Math.random() * 20,
        bbox_width: 260,
        bbox_height: 280,
        face_confidence: 0.9 + Math.random() * 0.09,
        emotions: emotions.map((emotion, i) => ({
          emotion,
          score: scores[i],
          is_dominant: i === maxIndex,
        })),
      },
    ],
  };
}