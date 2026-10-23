import { useEffect, useRef, useState } from "react";
import { analyzeFrame } from "../../api/realtimeApi";
import { getMockRealtimeFrame } from "../../api/mockRealtime";
import type { RealtimeFace } from "../../types/api";
import { colors, font, emotionMeta, hexToRgba } from "../../theme";
import DominantPanel from "./DominantPanel";
import EmotionBar from "./EmotionBar";

const USE_MOCK = true;
const CAPTURE_WIDTH = 640;
const CAPTURE_HEIGHT = 480;
const ANALYZE_INTERVAL_MS = 1000;

function WebcamAnalyzer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isActive, setIsActive] = useState(false);
  const [faces, setFaces] = useState<RealtimeFace[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const captureAndAnalyze = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);

    try {
      if (USE_MOCK) {
        const result = getMockRealtimeFrame();
        setFaces(result.faces);
        return;
      }
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const result = await analyzeFrame(blob);
        setFaces(result.faces);
      }, "image/jpeg", 0.8);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Lỗi phân tích khung hình");
    }
  };

  const startCamera = async () => {
    setErrorMessage("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: CAPTURE_WIDTH, height: CAPTURE_HEIGHT },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsActive(true);
      intervalRef.current = setInterval(captureAndAnalyze, ANALYZE_INTERVAL_MS);
    } catch {
      setErrorMessage("Không truy cập được camera. Kiểm tra quyền truy cập trình duyệt.");
    }
  };

  const stopCamera = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsActive(false);
    setFaces([]);
  };

  useEffect(() => stopCamera, []);

  const primaryFace = faces[0];

  return (
    <div>
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: `${CAPTURE_WIDTH} / ${CAPTURE_HEIGHT}`,
          background: "#0F1115",
          borderRadius: 16,
          overflow: "hidden",
          marginBottom: 20,
        }}
      >
        <video
          ref={videoRef}
          muted
          playsInline
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: isActive ? "block" : "none",
          }}
        />

        {!isActive && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: font.ui,
              color: "rgba(255,255,255,0.7)",
              fontSize: 14,
            }}
          >
            Camera đang tắt
          </div>
        )}

        {/* Khung bao quanh khuôn mặt, tô theo màu cảm xúc chủ đạo */}
        {isActive && primaryFace && (
          <div
            style={{
              position: "absolute",
              left: `${(primaryFace.bbox_x / CAPTURE_WIDTH) * 100}%`,
              top: `${(primaryFace.bbox_y / CAPTURE_HEIGHT) * 100}%`,
              width: `${(primaryFace.bbox_width / CAPTURE_WIDTH) * 100}%`,
              height: `${(primaryFace.bbox_height / CAPTURE_HEIGHT) * 100}%`,
              border: `2px solid ${
                emotionMeta[primaryFace.emotions.find((e) => e.is_dominant)?.emotion ?? "neutral"].color
              }`,
              borderRadius: 8,
              transition: "all 0.2s ease",
            }}
          />
        )}

        <canvas
          ref={canvasRef}
          width={CAPTURE_WIDTH}
          height={CAPTURE_HEIGHT}
          style={{ display: "none" }}
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <button
          onClick={isActive ? stopCamera : startCamera}
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            fontFamily: font.ui,
            fontSize: 14,
            fontWeight: 600,
            background: isActive ? colors.danger : colors.accent,
            color: "#FFFFFF",
          }}
        >
          {isActive ? "Tắt camera" : "Bật camera"}
        </button>
      </div>

      {errorMessage && (
        <p
          style={{
            fontFamily: font.ui,
            fontSize: 14,
            color: colors.danger,
            background: hexToRgba(colors.danger, 0.1),
            padding: "10px 14px",
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          {errorMessage}
        </p>
      )}

      {isActive && !primaryFace && (
        <p style={{ fontFamily: font.ui, fontSize: 14, color: colors.textSecondary, fontStyle: "italic" }}>
          Chưa phát hiện khuôn mặt trong khung hình
        </p>
      )}

      {primaryFace && (
        <div
          style={{
            padding: 24,
            background: colors.surface,
            borderRadius: 16,
            boxShadow: "0 4px 16px rgba(30, 33, 29, 0.06)",
          }}
        >
          <DominantPanel emotions={primaryFace.emotions} />
          <EmotionBar emotions={primaryFace.emotions} />
        </div>
      )}
    </div>
  );
}

export default WebcamAnalyzer;