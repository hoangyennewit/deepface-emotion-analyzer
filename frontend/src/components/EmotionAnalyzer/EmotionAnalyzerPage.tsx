import { useState } from "react";
import { colors, font } from "../../theme";
import SessionUploader from "./SessionUploader";
import WebcamAnalyzer from "./WebcamAnalyzer";

type Mode = "upload" | "webcam";

function EmotionAnalyzerPage() {
  const [mode, setMode] = useState<Mode>("upload");

  return (
    <div style={{ minHeight: "100vh", background: colors.bg }}>
      <div style={{ background: colors.accent, padding: "56px 24px 64px", textAlign: "center" }}>
        <h1 style={{ fontFamily: font.display, fontSize: 36, fontWeight: 600, color: "#FFFFFF", margin: 0 }}>
          Phân tích cảm xúc khuôn mặt
        </h1>
        <p
          style={{
            fontFamily: font.ui,
            fontSize: 15,
            color: "rgba(255,255,255,0.78)",
            marginTop: 10,
            maxWidth: 460,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          Tải lên ảnh/video, hoặc bật camera để xem cảm xúc theo thời gian thực.
        </p>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px 56px" }}>
        <div
          style={{
            marginTop: -32,
            background: colors.surface,
            borderRadius: 16,
            boxShadow: "0 8px 24px rgba(30,33,29,0.08)",
            padding: 8,
            display: "flex",
            gap: 6,
            marginBottom: 28,
          }}
        >
          {(["upload", "webcam"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                padding: "12px 0",
                border: "none",
                borderRadius: 10,
                cursor: "pointer",
                fontFamily: font.ui,
                fontSize: 14,
                fontWeight: 600,
                background: mode === m ? colors.accentSoft : "transparent",
                color: mode === m ? colors.accent : colors.textSecondary,
              }}
            >
              {m === "upload" ? "Tải ảnh / video" : "Camera trực tiếp"}
            </button>
          ))}
        </div>

        {mode === "upload" ? <SessionUploader /> : <WebcamAnalyzer />}
      </div>
    </div>
  );
}

export default EmotionAnalyzerPage;