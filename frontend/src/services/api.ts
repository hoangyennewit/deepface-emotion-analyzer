import type { EmotionType } from '../types/video';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export interface EmotionScores {
  happy: number;
  neutral: number;
  sad: number;
  angry: number;
  surprise?: number;
  surprised?: number;
  fear?: number;
  fearful?: number;
  disgust?: number;
  disgusted?: number;
}

export interface FaceItem {
  id: number;
  dominantEmotion: EmotionType;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  emotion_scores?: Record<string, number>;
}

export interface ImageAnalysisResult {
  success: boolean;
  total_faces: number;
  face_emotions: Array<{
    track_id: number;
    dominate_emotion: string;
    confidence: number;
    emotion: Record<string, number>;
    bbox: [number, number, number, number] | null;
  }>;
  error?: { error_code: string; message: string } | null;
}

export interface VideoTimelineItem {
  time: number;
  emotions: Record<string, number>;
}

export interface VideoAnalysisResult {
  duration: number;
  totalFrames: number;
  processedFrames: number;
  totalFaces: number;
  emotionSummary: Record<string, number>;
  faces: FaceItem[];
  timeline: VideoTimelineItem[];
}

export interface HistoryItem {
  id: string;
  created_at: string;
  type: 'image' | 'video' | 'webcam';
  type_label: string;
  filename: string;
  quick_result: string;
  dominant_emotion: string;
  duration: string;
  total_faces: number;
  positive_rate: number;
  emotion_summary: Record<string, number>;
  timeline?: VideoTimelineItem[];
  faces?: FaceItem[];
}

export interface UserProfile {
  name: string;
  email: string;
  avatar: string;
  role: string;
}

export interface SystemSettings {
  language: string;
  theme: string;
  auto_save: boolean;
  face_detector_model: string;
  emotion_analysis_model: string;
}

export interface WebcamSettings {
  camera_id: string;
  resolution: string;
  fps: number;
  show_face_box: boolean;
  show_emotion_rate: boolean;
  auto_save: boolean;
}

// ================= API CALLS ================= //

export async function analyzeImage(file: File): Promise<ImageAnalysisResult> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/emotion/image`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    let msg = 'Lỗi khi phân tích ảnh.';
    try {
      const err = await res.json();
      if (err?.detail) msg = err.detail;
    } catch {}
    throw new Error(msg);
  }

  return res.json();
}

export async function analyzeVideo(file: File): Promise<VideoAnalysisResult> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/emotion/video`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    let msg = 'Lỗi khi phân tích video.';
    try {
      const err = await res.json();
      if (err?.detail) msg = err.detail;
    } catch {}
    throw new Error(msg);
  }

  return res.json();
}

export async function analyzeWebcamFrame(blob: Blob): Promise<{
  success: boolean;
  total_faces: number;
  faces: Array<{
    dominant_emotion: string;
    confidence: number;
    bbox: [number, number, number, number];
    emotion_scores: Record<string, number>;
  }>;
}> {
  const formData = new FormData();
  formData.append('file', blob, 'frame.jpg');

  const res = await fetch(`${API_BASE_URL}/emotion/webcam`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error('Không phân tích được frame webcam');
  }

  return res.json();
}

export async function getHistory(type?: string): Promise<HistoryItem[]> {
  const url = type && type !== 'all' 
    ? `${API_BASE_URL}/emotion/history?type=${type}`
    : `${API_BASE_URL}/emotion/history`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Không lấy được lịch sử phân tích');
  return res.json();
}

export async function getHistoryDetail(id: string): Promise<HistoryItem> {
  const res = await fetch(`${API_BASE_URL}/emotion/history/${id}`);
  if (!res.ok) throw new Error('Không tìm thấy chi tiết lịch sử');
  return res.json();
}

export async function deleteHistoryItem(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/emotion/history/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Xóa bản ghi thất bại');
  return true;
}

export async function getUserProfile(): Promise<UserProfile> {
  const res = await fetch(`${API_BASE_URL}/user/profile`);
  if (!res.ok) throw new Error('Không lấy được thông tin người dùng');
  return res.json();
}

export async function updateUserProfile(data: Partial<UserProfile>): Promise<UserProfile> {
  const res = await fetch(`${API_BASE_URL}/user/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Không cập nhật được hồ sơ');
  const json = await res.json();
  return json.profile;
}

export async function getSystemSettings(): Promise<SystemSettings> {
  const res = await fetch(`${API_BASE_URL}/settings/`);
  if (!res.ok) throw new Error('Không lấy được cài đặt hệ thống');
  return res.json();
}

export async function updateSystemSettings(data: Partial<SystemSettings>): Promise<SystemSettings> {
  const res = await fetch(`${API_BASE_URL}/settings/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Không lưu được cài đặt');
  const json = await res.json();
  return json.settings;
}

export async function getWebcamSettings(): Promise<WebcamSettings> {
  const res = await fetch(`${API_BASE_URL}/settings/webcam`);
  if (!res.ok) throw new Error('Không lấy được cài đặt webcam');
  return res.json();
}

export async function updateWebcamSettings(data: Partial<WebcamSettings>): Promise<WebcamSettings> {
  const res = await fetch(`${API_BASE_URL}/settings/webcam`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Không lưu được cài đặt webcam');
  const json = await res.json();
  return json.webcam_settings;
}
