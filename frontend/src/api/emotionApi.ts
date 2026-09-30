import type {
  AnalysisResponse,
  HistoryRecord,
  VideoJob,
  WebcamResponse,
} from "../types/emotion";

// ============================================================
// API client gọi Backend FastAPI
// Base URL lấy từ biến môi trường VITE_API_URL (xem .env.example)
// ============================================================

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export const API_BASE_URL = API_URL;

/** Các lỗi HTTP/network được gói lại thành thông điệp tiếng Việt */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new Error(
      "Không kết nối được máy chủ. Hãy chắc chắn backend FastAPI đang chạy tại " +
        API_URL
    );
  }
  if (!res.ok) {
    let detail = `Lỗi HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      /* bỏ qua body không parse được */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

function toFormData(file: Blob | File, filename?: string): FormData {
  const fd = new FormData();
  const name = filename ?? (file instanceof File ? file.name : "frame.jpg");
  fd.append("file", file, name);
  return fd;
}

// ---------- Health ----------
export async function checkHealth(): Promise<{ status: string }> {
  return request("/health");
}

// ---------- Ảnh tĩnh (Task 2 — đã có) ----------
export async function analyzeImage(file: File): Promise<AnalysisResponse> {
  return request("/emotion/image", {
    method: "POST",
    body: toFormData(file),
  });
}

// ---------- Webcam realtime ----------
export async function analyzeWebcamFrame(blob: Blob): Promise<WebcamResponse> {
  return request("/emotion/webcam", {
    method: "POST",
    body: toFormData(blob, "frame.jpg"),
 });
}

// ---------- Video (đồng bộ) ----------
export async function analyzeVideo(file: File): Promise<VideoJob["result"]> {
  return request("/emotion/video", {
    method: "POST",
    body: toFormData(file),
  });
}

// ---------- Video xử lý ngầm (BackgroundTasks) ----------
export async function submitVideoBackground(file: File): Promise<VideoJob> {
  return request("/emotion/video/background", {
    method: "POST",
    body: toFormData(file),
  });
}

export async function getVideoJobStatus(jobId: string): Promise<VideoJob> {
  return request(`/emotion/video/status/${jobId}`);
}

/** Poll trạng thái job tới khi completed/failed, có khoảng nghỉ giữa các lần */
export async function pollVideoJob(
  jobId: string,
  intervalMs = 1500,
  shouldStop?: () => boolean
): Promise<VideoJob> {
  // vòng lặp vô hạn có chủ đích: dừng khi job xong hoặc shouldStop() true
  for (;;) {
    if (shouldStop?.()) throw new Error("Đã hủy theo dõi job");
    const job = await getVideoJobStatus(jobId);
    if (job.status === "completed" || job.status === "failed") return job;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

// ---------- Lịch sử ----------
export async function getHistory(
  type: "all" | "image" | "video" = "all"
): Promise<HistoryRecord[]> {
  const query = type !== "all" ? `?type=${type}` : "";
  return request(`/emotion/history${query}`);
}

export async function getHistoryDetail(id: string): Promise<HistoryRecord> {
  return request(`/emotion/history/${id}`);
}

export async function deleteHistoryItem(id: string): Promise<void> {
  await request(`/emotion/history/${id}`, { method: "DELETE" });
}
