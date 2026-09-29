export interface FaceEmotion {
  track_id: number | null;
  dominate_emotion: string;
  confidence: number;
  emotion: Record<string, number>;
}

export interface AnalysisError {
  error_code: string;
  message: string;
}

export interface AnalysisResponse {
  success: boolean;
  total_faces: number;
  face_emotions: FaceEmotion[];
  error: AnalysisError | null;
}