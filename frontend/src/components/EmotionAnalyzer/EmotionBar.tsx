import type { EmotionScore } from "../../types/api";
import { colors, font, emotionMeta } from "../../theme";

interface Props {
  emotions: EmotionScore[];
}

function EmotionBar({ emotions }: Props) {
  const sorted = [...emotions].sort((a, b) => b.score - a.score);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {sorted.map((e) => {
        const meta = emotionMeta[e.emotion];
        return (
          <div
            key={e.emotion}
            style={{
              display: "grid",
              gridTemplateColumns: "92px 1fr 46px",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span
              style={{
                fontFamily: font.ui,
                fontSize: 13,
                color: colors.textPrimary,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {meta.label}
              {e.is_dominant && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: colors.highlight,
                    display: "inline-block",
                  }}
                />
              )}
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
                  width: `${e.score * 100}%`,
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
              {(e.score * 100).toFixed(0)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default EmotionBar;