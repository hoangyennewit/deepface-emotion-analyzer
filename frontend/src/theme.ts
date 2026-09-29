export const colors = {
  bg: "#F1F2EE",
  surface: "#FFFFFF",
  border: "#E2E3DC",
  textPrimary: "#1E211D",
  textSecondary: "#6E7166",
  accent: "#1F6F63",
  accentSoft: "#E4EFEC",
  highlight: "#D6963A",
  danger: "#C24B3F",
};

export const font = {
  display: '"Fraunces", serif',
  ui: '"Inter", sans-serif',
};

export const emotionMeta: Record<string, { label: string; color: string }> = {
  angry: { label: "Giận dữ", color: "#C24B3F" },
  disgust: { label: "Ghê tởm", color: "#6B5B95" },
  fear: { label: "Sợ hãi", color: "#3E4C59" },
  happy: { label: "Vui vẻ", color: "#D6963A" },
  sad: { label: "Buồn bã", color: "#3B7DBF" },
  surprise: { label: "Ngạc nhiên", color: "#DD7A3F" },
  neutral: { label: "Bình thường", color: "#8C8E85" },
};

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}