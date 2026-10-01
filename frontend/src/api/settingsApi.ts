import { API_BASE_URL } from './emotionApi';
export interface SystemSettings {
  language: string; theme: string; auto_save: boolean;
  face_detector_model: string; emotion_analysis_model: string;
}
export interface WebcamSettings {
  camera_id: string; resolution: string; fps: number;
  show_face_box: boolean; show_emotion_rate: boolean; auto_save: boolean;
}
async function call<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: body === undefined ? 'GET' : 'POST', signal,
      ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('Không kết nối được backend. Vui lòng kiểm tra máy chủ.');
  }
  if (!response.ok) {
    let detail = `Không xử lý được cài đặt (HTTP ${response.status}).`;
    try { const value = await response.json(); if (typeof value.detail === 'string') detail = value.detail; } catch { /* Không có JSON */ }
    throw new Error(detail);
  }
  return response.json() as Promise<T>;
}
export const getSystemSettings = (signal?: AbortSignal) => call<SystemSettings>('/settings/', undefined, signal);
export const getWebcamSettings = (signal?: AbortSignal) => call<WebcamSettings>('/settings/webcam', undefined, signal);
export const saveSystemSettings = (settings: SystemSettings) => call<{ success: boolean; settings: SystemSettings }>('/settings/', settings);
export const saveWebcamSettings = (settings: WebcamSettings) => call<{ success: boolean; webcam_settings: WebcamSettings }>('/settings/webcam', settings);
