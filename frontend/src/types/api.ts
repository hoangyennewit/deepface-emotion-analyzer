export type InputType = "image" | "video" | "webcam";
export type SessionStatus = "pending" | "processing" | "completed" | "failed";
export type Emotion =
  | "angry" | "disgust" | "fear" | "happy" | "sad" | "surprise" | "neutral";

export interface EmotionScore {
  emotion: Emotion;
  score: number;
  is_dominant: boolean;
}

export interface DetectedFace {
  id: number;
  bbox_x: number;
  bbox_y: number;
  bbox_width: number;
  bbox_height: number;
  face_confidence: number | null;
  emotions: EmotionScore[];
}

export interface FrameAnalysis {
  id: number;
  frame_index: number;
  timestamp_sec: number;
  faces: DetectedFace[];
}

export interface AnalysisSession {
  id: number;
  session_name: string;
  input_type: InputType;
  status: SessionStatus;
  duration_seconds: number | null;
  fps: number | null;
  frames: FrameAnalysis[];
}
export interface RealtimeFace {
  bbox_x: number;
  bbox_y: number;
  bbox_width: number;
  bbox_height: number;
  face_confidence: number | null;
  emotions: EmotionScore[];
}

export interface RealtimeAnalysisResponse {
  faces: RealtimeFace[];
}