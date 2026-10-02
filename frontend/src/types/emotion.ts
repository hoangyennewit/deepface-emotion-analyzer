// ============================================================
// Types dùng chung cho kết quả phân tích cảm xúc (map với Backend)
// ============================================================

export const EMOTION_KEYS = [
  "happy",
  "sad",
  "angry",
  "fear",
  "disgust",
  "surprise",
  "neutral",
] as const;

export type EmotionKey = (typeof EMOTION_KEYS)[number];

/** Thông tin một khuôn mặt được phát hiện trong ảnh */
export interface FaceEmotion {
  track_id: number | null;
  dominate_emotion: string;
  confidence: number; // 0..1
  emotion: Record<string, number>; // điểm 7 cảm xúc (0..100)
  bbox: number[] | null; // [x, y, w, h] theo pixel
}

/** Response của POST /emotion/image */
export interface AnalysisResponse {
  success: boolean;
  total_faces: number;
  face_emotions: FaceEmotion[];
  error: ErrorResponse | null;
}

export interface ErrorResponse {
  error_code: string;
  message: string;
}

/** Một khuôn mặt cho overlay webcam (response POST /emotion/webcam) */
export interface WebcamFace {
  track_id?: number | null;
  dominate_emotion: string;
  confidence: number; // 0..1
  bbox: number[] | null; // [x, y, w, h] theo pixel của frame
  emotion: Record<string, number>;
}

export interface WebcamResponse {
  success: boolean;
  total_faces: number;
  faces: WebcamFace[];
  message?: string;
}

/** Bản ghi lịch sử phân tích (GET /emotion/history) */
export interface HistoryRecord {
  id: string;
  created_at: string;
  type: "image" | "video";
  type_label: string;
  filename: string;
  quick_result: string;
  dominant_emotion: string;
  duration: string;
  total_faces: number;
  positive_rate: number;
  emotion_summary: Record<string, number>;
  timeline: TimelinePoint[];
  faces: HistoryFace[];
}

export interface HistoryFace {
  id: number;
  dominantEmotion: string;
  confidence: number;
  x: number; // % theo chiều ngang
  y: number; // % theo chiều dọc
  width: number; // %
  height: number; // %
}

export interface TimelinePoint {
  time: number;
  emotions: Record<string, number>;
}

/** Job phân tích video ngầm (BackgroundTasks) */
export interface VideoJob {
  job_id: string;
  status: "processing" | "completed" | "failed";
  progress: number;
  filename: string;
  created_at: string;
  result: VideoResult | null;
  error: string | null;
  processing_time: number | null;
  completed_at?: string;
}

export interface VideoResult {
  duration: number;
  totalFrames: number;
  processedFrames: number;
  totalFaces: number;
  emotionSummary: Record<string, number>;
  faces: HistoryFace[];
  timeline: TimelinePoint[];
  filename?: string;
}
