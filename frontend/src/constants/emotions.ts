import { EMOTION_KEYS } from "../types/emotion";
import type { EmotionKey } from "../types/emotion";

// Re-export để các component import EMOTION_KEYS từ 1 nơi duy nhất
export { EMOTION_KEYS };

// ============================================================
// Hằng số hiển thị cho 7 cảm xúc của DeepFace
// ============================================================

export interface EmotionMeta {
  key: EmotionKey;
  label: string; // Nhãn tiếng Việt
  emoji: string;
  color: string; // Màu hex cho chart/overlay
  tailwind: string; // Class Tailwind cho text
  bg: string; // Class Tailwind cho nền
}

export const EMOTION_META: Record<EmotionKey, EmotionMeta> = {
  happy: { key: "happy", label: "Vui vẻ", emoji: "😊", color: "#22c55e", tailwind: "text-green-500", bg: "bg-green-500" },
  sad: { key: "sad", label: "Buồn", emoji: "😢", color: "#3b82f6", tailwind: "text-blue-500", bg: "bg-blue-500" },
  angry: { key: "angry", label: "Giận dữ", emoji: "😠", color: "#ef4444", tailwind: "text-red-500", bg: "bg-red-500" },
  fear: { key: "fear", label: "Sợ hãi", emoji: "😨", color: "#a855f7", tailwind: "text-purple-500", bg: "bg-purple-500" },
  disgust: { key: "disgust", label: "Ghê tởm", emoji: "🤢", color: "#84cc16", tailwind: "text-lime-500", bg: "bg-lime-500" },
  surprise: { key: "surprise", label: "Ngạc nhiên", emoji: "😲", color: "#f59e0b", tailwind: "text-amber-500", bg: "bg-amber-500" },
  neutral: { key: "neutral", label: "Bình thường", emoji: "😐", color: "#64748b", tailwind: "text-slate-500", bg: "bg-slate-500" },
};

/** Chuẩn hóa key từ backend ('surprise'/'fear'/'disgust') sang key chuẩn */
export function normalizeEmotionKey(raw: string | undefined | null): EmotionKey {
  const map: Record<string, EmotionKey> = {
    happy: "happy",
    sad: "sad",
    angry: "angry",
    fear: "fear",
    fearful: "fear",
    disgust: "disgust",
    disgusted: "disgust",
    surprise: "surprise",
    surprised: "surprise",
    neutral: "neutral",
  };
  const k = (raw ?? "").toLowerCase();
  return map[k] ?? "neutral";
}

/** Lấy meta hiển thị cho một cảm xúc bất kỳ từ backend */
export function getEmotionMeta(raw: string | undefined | null): EmotionMeta {
  return EMOTION_META[normalizeEmotionKey(raw)];
}

/** Chuyển điểm cảm xúc Record -> mảng đã sort theo EMOTION_KEYS để vẽ chart */
export function toEmotionArray(scores: Record<string, number> | undefined): Array<{ key: EmotionKey; value: number }> {
  return EMOTION_KEYS.map((key) => ({
    key,
    value: Math.round(scores?.[key] ?? 0),
  })).sort((a, b) => b.value - a.value);
}
