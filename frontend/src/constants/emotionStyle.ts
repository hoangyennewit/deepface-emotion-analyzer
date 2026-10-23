export const EMOTIONS = ["happy", "surprise", "neutral", "sad", "fear", "angry", "disgust"] as const;

export const EMOTION_STYLE: Record<string, { label: string; color: string; emoji: string }> = {
  happy: { label: "Hạnh phúc", color: "#22C55E", emoji: "😄" },
  surprise: { label: "Ngạc nhiên", color: "#F59E0B", emoji: "😲" },
  neutral: { label: "Bình thường", color: "#3B82F6", emoji: "😐" },
  sad: { label: "Buồn", color: "#6366F1", emoji: "😢" },
  fear: { label: "Sợ hãi", color: "#9333EA", emoji: "😨" },
  angry: { label: "Giận dữ", color: "#EF4444", emoji: "😠" },
  disgust: { label: "Ghê tởm", color: "#84CC16", emoji: "🤢" },
};

export const emotionStyle = (key?: string) =>
  EMOTION_STYLE[key ?? ""] ?? { label: key ?? "Không rõ", color: "#94A3B8", emoji: "❔" };