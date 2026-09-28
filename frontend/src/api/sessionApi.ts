import type { AnalysisSession } from "../types/api";

const API_BASE_URL = "http://localhost:5000"; // sửa lại khi backend có endpoint thật

export async function createSession(
  file: File,
  inputType: "image" | "video"
): Promise<{ id: number }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("input_type", inputType);

  const res = await fetch(`${API_BASE_URL}/api/sessions`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error(`Upload thất bại: ${res.status}`);
  return res.json();
}

export async function getSession(id: number): Promise<AnalysisSession> {
  const res = await fetch(`${API_BASE_URL}/api/sessions/${id}`);
  if (!res.ok) throw new Error(`Không lấy được kết quả: ${res.status}`);
  return res.json();
}

/**
 * Poll liên tục cho tới khi session.status thành "completed" hoặc "failed".
 * Dùng khi video cần thời gian xử lý phía backend (không trả kết quả ngay).
 */
export function pollSession(
  id: number,
  onUpdate: (session: AnalysisSession) => void,
  intervalMs = 2000
): () => void {
  let stopped = false;

  const tick = async () => {
    if (stopped) return;
    try {
      const session = await getSession(id);
      onUpdate(session);
      if (session.status === "pending" || session.status === "processing") {
        setTimeout(tick, intervalMs);
      }
    } catch (err) {
      console.error("Lỗi khi poll session:", err);
      setTimeout(tick, intervalMs);
    }
  };

  tick();
  return () => {
    stopped = true;
  };
}