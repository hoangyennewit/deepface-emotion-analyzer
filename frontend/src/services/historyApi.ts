const API_BASE: string = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export type HistoryType = "image" | "video" | "webcam";

export interface TimelinePoint {
  time: number;
  emotions: Record<string, number>;
}

export interface HistoryFace {
  id: number;
  dominantEmotion: string;
  confidence: number;
  x: number; // % theo chiều ngang
  y: number;
  width: number;
  height: number;
}

export interface HistoryItem {
  id: string;
  created_at: string;
  type: HistoryType;
  type_label: string;
  status: "processing" | "completed" | "failed";
  filename: string;
  quick_result: string;
  dominant_emotion: string;
  duration: string;
  duration_seconds: number;
  total_faces: number;
  positive_rate: number;
  emotion_summary: Record<string, number>;
  media_url: string | null;
  thumbnail_url: string | null;
  timeline: TimelinePoint[];
  faces: HistoryFace[];
}

export interface WebcamSampleFace {
  track_id: number | null;
  dominant_emotion: string;
  confidence: number;
  emotion: Record<string, number>;
  bbox: number[] | null;
}
export interface WebcamSample {
  time: number;
  faces: WebcamSampleFace[];
}
export interface WebcamSessionMeta {
  name?: string;
  duration: number;
  samples: WebcamSample[];
}

export const mediaUrl = (path: string | null): string | null =>
  path ? `${API_BASE}${path}` : null;

export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

export const formatClock = (seconds: number): string => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    let detail = `Lỗi server (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      /* giữ thông báo mặc định */
    }
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

export const getHistory = (type: "all" | HistoryType = "all") =>
  request<HistoryItem[]>(`/emotion/history?source_type=${type}`);

export const getHistoryDetail = (id: string) =>
  request<HistoryItem>(`/emotion/history/${id}`);

export const deleteHistoryItem = (id: string) =>
  request<{ success: boolean }>(`/emotion/history/${id}`, { method: "DELETE" });

export function saveWebcamSession(video: Blob, meta: WebcamSessionMeta) {
  const form = new FormData();
  form.append("video", video, video.type.includes("mp4") ? "webcam.mp4" : "webcam.webm");
  form.append("meta", JSON.stringify(meta));
  return request<{ success: boolean; session_id: string }>("/emotion/webcam/session", {
    method: "POST",
    body: form,
  });
}
// ---- Phân tích 1 frame webcam (khớp đúng response của backend) ----
export interface WebcamFrameFace {
  track_id: number | null;
  dominate_emotion: string; // backend viết "dominate"
  confidence: number; // 0..100
  emotion: Record<string, number>; // 7 điểm, 0..100
  bbox: number[] | null; // [x, y, w, h] theo pixel của frame gửi lên
}

export interface WebcamFrameResult {
  success: boolean;
  total_faces: number;
  faces: WebcamFrameFace[];
}

/** Frame không có mặt thì server trả 400 (ApiError.status === 400) */
export function analyzeWebcamFrameLive(frame: Blob) {
  const form = new FormData();
  form.append("file", frame, "frame.jpg");
  return request<WebcamFrameResult>("/emotion/webcam", { method: "POST", body: form });
}