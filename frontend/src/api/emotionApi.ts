import type { AnalysisResponse, HistoryRecord, VideoJob, WebcamResponse } from '../types/emotion';
const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');
export const API_BASE_URL = API_URL;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try { res = await fetch(`${API_URL}${path}`, init); }
  catch { throw new Error('Không kết nối được máy chủ. Hãy kiểm tra backend FastAPI tại ' + API_URL); }
  if (!res.ok) {
    let detail = `Lỗi HTTP ${res.status}`;
    try { const body = await res.json(); if (typeof body?.detail === 'string') detail = body.detail; }
    catch { /* Response lỗi có thể không phải JSON. */ }
    throw new Error(detail);
  }
  const content = await res.text();
  if (!content.trim()) return undefined as T;
  return JSON.parse(content) as T;
}
function toFormData(file: Blob | File, filename?: string): FormData {
  const form = new FormData();
  form.append('file', file, filename ?? (file instanceof File ? file.name : 'frame.jpg'));
  return form;
}
export async function checkHealth(): Promise<{ status: string }> { return request('/health'); }
export async function analyzeImage(file: File): Promise<AnalysisResponse> {
  return request('/emotion/image', { method: 'POST', body: toFormData(file) });
}
export async function analyzeWebcamFrame(blob: Blob): Promise<WebcamResponse> {
  return request('/emotion/webcam', { method: 'POST', body: toFormData(blob, 'frame.jpg') });
}
export async function analyzeVideo(file: File): Promise<VideoJob['result']> {
  return request('/emotion/video', { method: 'POST', body: toFormData(file) });
}
export async function submitVideoBackground(file: File): Promise<VideoJob> {
  return request('/emotion/video/background', { method: 'POST', body: toFormData(file) });
}
export async function getVideoJobStatus(jobId: string): Promise<VideoJob> {
  return request(`/emotion/video/status/${encodeURIComponent(jobId)}`);
}
export async function pollVideoJob(jobId: string, intervalMs = 1500, shouldStop?: () => boolean): Promise<VideoJob> {
  for (;;) {
    if (shouldStop?.()) throw new Error('Đã hủy theo dõi job');
    const job = await getVideoJobStatus(jobId);
    if (job.status === 'completed' || job.status === 'failed') return job;
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
}
export async function getHistory(type: 'all' | 'image' | 'video' = 'all'): Promise<HistoryRecord[]> {
  return request(`/emotion/history${type === 'all' ? '' : `?type=${type}`}`);
}
export async function getHistoryDetail(id: string): Promise<HistoryRecord> {
  return request(`/emotion/history/${encodeURIComponent(id)}`);
}
export async function deleteHistoryItem(id: string): Promise<void> {
  await request<void>(`/emotion/history/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
