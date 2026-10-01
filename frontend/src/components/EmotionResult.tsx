import type { FaceEmotion } from "../types/emotion";
import { colors, font, emotionMeta, hexToRgba } from "../theme";

interface Props {
  face: FaceEmotion;
  index: number;
}

function EmotionResult({ face, index }: Props) {
  const dominantMeta = emotionMeta[face.dominate_emotion] ?? {
    label: face.dominate_emotion,
    color: colors.textSecondary,
  };

  const sortedEmotions = Object.entries(face.emotion).sort(([, a], [, b]) => b - a);

  return (
    <div
      style={{
        background: colors.surface,
        borderRadius: 16,
        padding: 24,
        boxShadow: "0 4px 16px rgba(30, 33, 29, 0.06)",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontFamily: font.ui,
          fontSize: 13,
          color: colors.textSecondary,
          marginBottom: 16,
        }}
      >
        Khuôn mặt #{index + 1}
        {"  —  độ tin cậy "}
        {face.confidence.toFixed(1)}%
      </div>

      {/* Cảm xúc chủ đạo — điểm nhấn chính */}
      <div
        style={{
          background: hexToRgba(dominantMeta.color, 0.12),
          borderRadius: 12,
          padding: "18px 22px",
          marginBottom: 20,
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontFamily: font.display,
            fontSize: 26,
            fontWeight: 600,
            color: dominantMeta.color,
          }}
        >
          {dominantMeta.label}
        </span>
      </div>

      {/* Chi tiết 7 cảm xúc */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sortedEmotions.map(([emotion, score]) => {
          const meta = emotionMeta[emotion] ?? { label: emotion, color: colors.textSecondary };
          const clampedScore = Math.min(score, 100); // phòng trường hợp làm tròn dư nhẹ
          return (
            <div
              key={emotion}
              style={{
                display: "grid",
                gridTemplateColumns: "92px 1fr 46px",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ fontFamily: font.ui, fontSize: 13, color: colors.textPrimary }}>
                {meta.label}
              </span>
              <div
                style={{
                  height: 6,
                  background: colors.accentSoft,
                  borderRadius: 999,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${clampedScore}%`,
                    background: meta.color,
                    borderRadius: 999,
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
              <span
                style={{
                  fontFamily: font.ui,
                  fontSize: 12,
                  color: colors.textSecondary,
                  textAlign: "right",
                }}
              >
                {score.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default EmotionResult;