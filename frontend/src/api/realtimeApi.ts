import type { RealtimeAnalysisResponse } from "../types/api";

const API_BASE_URL = "http://localhost:8000";

export async function analyzeFrame(blob: Blob): Promise<RealtimeAnalysisResponse> {
  const formData = new FormData();
  formData.append("frame", blob, "frame.jpg");

  const res = await fetch(`${API_BASE_URL}/api/realtime/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error(`Lỗi phân tích: ${res.status}`);
  return res.json();
}