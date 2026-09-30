import { useCallback, useEffect, useRef, useState } from "react";
import { useWebcamStream } from "./useWebcamStream";
import { analyzeWebcamFrame } from "../api/emotionApi";
import type { WebcamFace } from "../types/emotion";
import { ScoreSmoother, EmotionSmoother } from "../utils/smoothing";
import { normalizeEmotionKey } from "../constants/emotions";

// ============================================================
// Hook trung tâm của trang Webcam realtime:
// - Vòng lặp phân tích: chụp frame -> POST /emotion/webcam -> overlay
// - Nhịp gửi tự điều chỉnh: request chưa xong thì bỏ qua nhịp kế
// - Làm mịn nhãn (đa số phiếu) và điểm cảm xúc (EMA) để giảm nhấp nháy
// - Đo FPS thực tế + độ trễ request và tổng hợp thống kê cả phiên
// ============================================================

export interface OverlayFace {
  id: number;
  emotion: string; // đã chuẩn hóa: happy, sad, angry, fear, disgust, surprise, neutral
  confidence: number; // 0..100
  xPct: number; // bbox theo % kích thước khung hình
  yPct: number;
  wPct: number;
  hPct: number;
  scores: Record<string, number>;
}

const SEND_INTERVAL_MS = 400; // ~2.5 frame/giây — đủ mượt mà không dội request
const MAX_LATENCY_HISTORY = 30;

export function useWebcamEmotion(enabled: boolean) {
  const { videoRef, isActive, isLoading, error, start, stop, captureFrame } =
    useWebcamStream();

  const [currentFaces, setCurrentFaces] = useState<OverlayFace[]>([]);
  const [smoothedScores, setSmoothedScores] = useState<Record<string, number>>({});
  const [smoothedEmotion, setSmoothedEmotion] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [fps, setFps] = useState(0);
  const [sessionStats, setSessionStats] = useState({
    snapshots: 0,
    detections: 0,
    emotionCounts: {} as Record<string, number>,
  });

  const emotionSmootherRef = useRef(new EmotionSmoother(7));
  const scoreSmootherRef = useRef(new ScoreSmoother(0.35));
  const inFlightRef = useRef(false);
  const runningRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const statsRef = useRef({
    snapshots: 0,
    detections: 0,
    emotionCounts: {} as Record<string, number>,
  });
  const latencyHistoryRef = useRef<number[]>([]);
  const lastFpsTickRef = useRef<number>(0);
  const fpsCounterRef = useRef(0);

  /** Chuyển response backend thành overlay faces theo % khung hình */
  const mapFaces = useCallback(
    (faces: WebcamFace[], videoW: number, videoH: number): OverlayFace[] => {
      return faces.map((f, i) => {
        const bbox = f.bbox ?? [0, 0, 0, 0];
        return {
          id: f.track_id ?? i,
          emotion: normalizeEmotionKey(f.dominant_emotion),
          confidence: Math.round((f.confidence ?? 0) * 100),
          xPct: (bbox[0] / Math.max(1, videoW)) * 100,
          yPct: (bbox[1] / Math.max(1, videoH)) * 100,
          wPct: (bbox[2] / Math.max(1, videoW)) * 100,
          hPct: (bbox[3] / Math.max(1, videoH)) * 100,
          scores: f.emotion_scores ?? {},
        };
      });
    },
    []
  );

  /** Một nhịp phân tích: chụp frame -> gọi API -> cập nhật state + thống kê */
  const analyzeTick = useCallback(async () => {
    if (!runningRef.current || inFlightRef.current) return;
    const blob = captureFrame(0.75);
    if (!blob) return;

    inFlightRef.current = true;
    const sentAt = performance.now();
    try {
      const res = await analyzeWebcamFrame(blob);
      const video = videoRef.current;
      const vw = video?.videoWidth ?? 1;
      const vh = video?.videoHeight ?? 1;

      if (runningRef.current) {
        const faces = mapFaces(res.faces ?? [], vw, vh);
        setCurrentFaces(faces);

        const primary = res.faces?.[0];
        const rawLabel = primary ? normalizeEmotionKey(primary.dominant_emotion) : null;
        setSmoothedEmotion(emotionSmootherRef.current.smooth(rawLabel));

        if (primary) {
          setSmoothedScores(scoreSmootherRef.current.smooth(primary.emotion_scores ?? {}));
        }

        // Thống kê phiên
        statsRef.current.snapshots += 1;
        if (res.total_faces > 0) statsRef.current.detections += 1;
        if (rawLabel) {
          const counts = statsRef.current.emotionCounts;
          counts[rawLabel] = (counts[rawLabel] ?? 0) + 1;
        }

        // Đo độ trễ (trung bình động)
        const rtt = performance.now() - sentAt;
        const hist = latencyHistoryRef.current;
        hist.push(rtt);
        if (hist.length > MAX_LATENCY_HISTORY) hist.shift();
        setLatency(Math.round(hist.reduce((a, b) => a + b, 0) / hist.length));
      }
    } catch {
      // Mất kết nối tạm thời: giữ nguyên overlay cũ, không crash vòng lặp
    } finally {
      inFlightRef.current = false;
      fpsCounterRef.current += 1;
      const now = performance.now();
      if (lastFpsTickRef.current === 0) lastFpsTickRef.current = now;
      if (now - lastFpsTickRef.current >= 1000) {
        setFps(Math.round((fpsCounterRef.current * 1000) / (now - lastFpsTickRef.current)));
        fpsCounterRef.current = 0;
        lastFpsTickRef.current = now;
      }
    }
  }, [captureFrame, mapFaces, videoRef]);

  /** Bật vòng lặp phân tích khi camera đang hoạt động; dừng khi camera tắt */
  useEffect(() => {
    if (!enabled || !isActive) return;

    runningRef.current = true;
    timerRef.current = window.setInterval(() => {
      void analyzeTick();
    }, SEND_INTERVAL_MS);

    return () => {
      runningRef.current = false;
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, isActive, analyzeTick]);

  /** Reset toàn bộ kết quả + thống kê (gọi khi bật hoặc tắt camera) */
  const resetSession = useCallback(() => {
    runningRef.current = false;
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCurrentFaces([]);
    setSmoothedScores({});
    setSmoothedEmotion(null);
    setLatency(null);
    setFps(0);
    statsRef.current = { snapshots: 0, detections: 0, emotionCounts: {} };
    setSessionStats({ snapshots: 0, detections: 0, emotionCounts: {} });
    emotionSmootherRef.current.reset();
    scoreSmootherRef.current.reset();
  }, []);

  /** Đồng bộ snapshot thống kê ra state định kỳ (tránh re-render mỗi tick) */
  useEffect(() => {
    const t = window.setInterval(() => {
      setSessionStats({ ...statsRef.current });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const startCamera = useCallback(async () => {
    resetSession();
    await start();
  }, [resetSession, start]);

  return {
    videoRef,
    isActive,
    isLoading,
    error,
    startCamera,
    stop,
    currentFaces,
    smoothedScores,
    smoothedEmotion,
    isAnalyzing: enabled && isActive,
    latency,
    fps,
    sessionStats,
  };
}
