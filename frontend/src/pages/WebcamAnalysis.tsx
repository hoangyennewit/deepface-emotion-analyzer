import { useEffect, useMemo, useState } from "react";
import { Camera, CameraOff, Gauge, ScanFace, Timer, Users } from "lucide-react";
import { useWebcamEmotion } from "../hooks/useWebcamEmotion";
import { FaceOverlay } from "../components/FaceOverlay";
import { EmotionBars } from "../components/EmotionBars";
import { getEmotionMeta } from "../constants/emotions";

// ============================================================
// Màn hình Phân tích Webcam trực tiếp (Task 2)
// Bật camera -> chụp frame -> gửi backend /emotion/webcam -> overlay realtime
// ============================================================

export const WebcamAnalysis = () => {
  const {
    videoRef,
    isActive,
    isLoading,
    error,
    startCamera,
    stop,
    currentFaces,
    smoothedScores,
    smoothedEmotion,
    isAnalyzing,
    latency,
    fps,
    sessionStats,
  } = useWebcamEmotion(true);

  const [showOverlay, setShowOverlay] = useState(true);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);

  // Đồng hồ phiên: tick mỗi giây khi camera bật
  useEffect(() => {
    if (!isActive) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [isActive]);

  const sessionDuration = useMemo(() => {
    if (!sessionStartedAt || !isActive) return "00:00";
    const sec = Math.floor((now - sessionStartedAt) / 1000);
    return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
  }, [sessionStartedAt, now, isActive]);

  const primaryFace = currentFaces[0];
  const meta = smoothedEmotion ? getEmotionMeta(smoothedEmotion) : null;
  const detectionRate =
    sessionStats.snapshots > 0
      ? Math.round((sessionStats.detections / sessionStats.snapshots) * 100)
      : 0;

  const handleToggleCamera = () => {
    if (isActive) {
      stop();
      setSessionStartedAt(null);
    } else {
      setNow(Date.now());
      void startCamera();
      setSessionStartedAt(Date.now());
    }
  };

  return (
    <div className="space-y-6">
      {/* Tiêu đề */}
      <div>
        <h1
          style={{
            margin: "0 0 20px 0",
            fontSize: "26px",
            fontWeight: 700,
          }}
        >
          Phân tích Webcam trực tiếp
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Bật camera để nhận diện cảm xúc khuôn mặt theo thời gian thực bằng DeepFace
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Cột trái: video + điều khiển + chỉ số */}
        <div className="xl:col-span-2 space-y-4">
          <div className="relative bg-slate-900 rounded-2xl overflow-hidden aspect-video shadow-lg">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
              muted
              playsInline
            />

            {showOverlay && isActive && <FaceOverlay faces={currentFaces} mirrored />}

            {/* Trạng thái camera tắt */}
            {!isActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400">
                <CameraOff size={48} />
                <p className="text-sm">{error ?? "Camera đang tắt"}</p>
                <button
                  onClick={handleToggleCamera}
                  disabled={isLoading}
                  className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium transition-colors shadow"
                >
                  <Camera size={18} />
                  {isLoading ? "Đang mở camera..." : "Bật camera"}
                </button>
              </div>
            )}

            {/* Overlay điều khiển khi camera bật */}
            {isActive && (
              <>
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 text-white text-xs font-medium backdrop-blur">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isAnalyzing ? "bg-green-400 animate-pulse" : "bg-red-400"
                      }`}
                    />
                    {isAnalyzing ? "Đang phân tích" : "Tạm dừng"}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-black/60 text-white text-xs backdrop-blur">
                    {currentFaces.length} mặt
                  </span>
                </div>

                <div className="absolute top-3 right-3 flex gap-2">
                  <button
                    onClick={() => setShowOverlay((v) => !v)}
                    className="px-2.5 py-1 rounded-full bg-black/60 hover:bg-black/70 text-white text-xs backdrop-blur transition-colors"
                  >
                    {showOverlay ? "Ẩn khung" : "Hiện khung"}
                  </button>
                  <button
                    onClick={handleToggleCamera}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/90 hover:bg-red-600 text-white text-xs font-medium backdrop-blur transition-colors"
                  >
                    <CameraOff size={14} />
                    Tắt camera
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Hàng chỉ số hiệu năng */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Gauge size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500">Phân tích</p>
                <p className="text-lg font-bold text-slate-800 tabular-nums">{fps}/s</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Timer size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500">Độ trễ</p>
                <p className="text-lg font-bold text-slate-800 tabular-nums">
                  {latency !== null ? `${latency} ms` : "—"}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                <ScanFace size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500">Tỉ lệ nhận diện</p>
                <p className="text-lg font-bold text-slate-800 tabular-nums">{detectionRate}%</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Users size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500">Số mặt hiện tại</p>
                <p className="text-lg font-bold text-slate-800 tabular-nums">{currentFaces.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cột phải: kết quả */}
        <div className="space-y-4">
          {/* Cảm xúc hiện tại */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4">Cảm xúc hiện tại</h2>
            {meta ? (
              <div className="flex items-center gap-4">
                <span className="text-6xl">{meta.emoji}</span>
                <div>
                  <p className={`text-2xl font-bold ${meta.tailwind}`}>{meta.label}</p>
                  <p className="text-sm text-slate-500">
                    {primaryFace ? `Độ tin cậy: ${primaryFace.confidence}%` : ""}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-slate-400 text-sm py-6 text-center">
                {isActive ? "Đang tìm khuôn mặt..." : "Bật camera để bắt đầu"}
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <EmotionBars scores={smoothedScores} />
            </div>
          </div>

          {/* Thống kê phiên */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4">Thống kê phiên</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Thời lượng</span>
                <span className="font-semibold text-slate-700 tabular-nums">{sessionDuration}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Frame đã phân tích</span>
                <span className="font-semibold text-slate-700 tabular-nums">{sessionStats.snapshots}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Lần phát hiện mặt</span>
                <span className="font-semibold text-slate-700 tabular-nums">{sessionStats.detections}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cảm xúc chủ đạo</span>
                <span className="font-semibold text-slate-700">
                  {smoothedEmotion ? getEmotionMeta(smoothedEmotion).label : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Tần suất cảm xúc trong phiên */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4">Tần suất cảm xúc (cả phiên)</h2>
            <EmotionBars scores={sessionStats.emotionCounts} showAll={false} />
            {sessionStats.snapshots === 0 && (
              <p className="text-xs text-slate-400 mt-3 text-center">
                Chưa có dữ liệu — hãy bật camera và nhìn vào ống kính
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
