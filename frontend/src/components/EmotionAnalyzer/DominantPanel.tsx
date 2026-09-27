import type { EmotionScore } from "../../types/api";
import { colors, font, emotionMeta, hexToRgba } from "../../theme";

interface Props {
  emotions: EmotionScore[];
}

function DominantPanel({ emotions }: Props) {
  const dominant = emotions.find((e) => e.is_dominant) ?? emotions[0];
  const meta = emotionMeta[dominant.emotion];

  return (
    <div
      style={{
        background: hexToRgba(meta.color, 0.12),
        borderRadius: 12,
        padding: "20px 24px",
        marginBottom: 20,
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
      }}
    >
      <span
        style={{
          fontFamily: font.display,
          fontSize: 28,
          fontWeight: 600,
          color: meta.color,
        }}
      >
        {meta.label}
      </span>
      <span
        style={{
          fontFamily: font.ui,
          fontSize: 15,
          color: colors.textSecondary,
        }}
      >
        {(dominant.score * 100).toFixed(0)}% mức độ
      </span>
    </div>
  );
}

export default DominantPanel;