import { useState } from "react";
import type { FrameAnalysis } from "../../types/api";
import { colors, font, emotionMeta } from "../../theme";
import EmotionBar from "./EmotionBar";

interface Props {
  frames: FrameAnalysis[];
}

function FrameTimeline({ frames }: Props) {
  const [selectedId, setSelectedId] = useState<number>(frames[0]?.id);
  const selected = frames.find((f) => f.id === selectedId);

  return (
    <div>
      {/* Dải khung hình kiểu phim, mỗi khung tô màu theo cảm xúc chủ đạo */}
      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          padding: "4px 4px 16px",
          marginBottom: 20,
        }}
      >
        {frames.map((frame) => {
          const dominant = frame.faces[0]?.emotions.find((e) => e.is_dominant);
          const dotColor = dominant ? emotionMeta[dominant.emotion].color : colors.border;
          const active = frame.id === selectedId;

          return (
            <button
              key={frame.id}
              onClick={() => setSelectedId(frame.id)}
              style={{
                flexShrink: 0,
                width: 64,
                padding: "10px 0 8px",
                borderRadius: 8,
                border: `1px solid ${active ? colors.accent : colors.border}`,
                background: active ? colors.accentSoft : colors.surface,
                cursor: "pointer",
                fontFamily: font.ui,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: dotColor,
                }}
              />
              <span style={{ fontSize: 11, color: colors.textSecondary }}>
                {frame.timestamp_sec}s
              </span>
            </button>
          );
        })}
      </div>

      {/* Chi tiết khung hình đang chọn */}
      {selected && (
        <div>
          {selected.faces.length === 0 && (
            <p
              style={{
                fontFamily: font.ui,
                fontSize: 14,
                color: colors.textSecondary,
                fontStyle: "italic",
              }}
            >
              Không phát hiện khuôn mặt ở khung hình này
            </p>
          )}

          {selected.faces.map((face) => (
            <div
              key={face.id}
              style={{
                marginBottom: 16,
                padding: 20,
                background: colors.surface,
                borderRadius: 12,
                border: `1px solid ${colors.border}`,
              }}
            >
              <div
                style={{
                  fontFamily: font.ui,
                  fontSize: 13,
                  fontWeight: 600,
                  color: colors.textPrimary,
                  marginBottom: 14,
                }}
              >
                Khuôn mặt #{face.id}
                {face.face_confidence != null && (
                  <span
                    style={{
                      fontWeight: 400,
                      color: colors.textSecondary,
                    }}
                  >
                    {"  —  độ tin cậy "}
                    {(face.face_confidence * 100).toFixed(0)}%
                  </span>
                )}
              </div>
              <EmotionBar emotions={face.emotions} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FrameTimeline;