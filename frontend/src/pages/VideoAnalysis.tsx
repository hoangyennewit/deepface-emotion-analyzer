import { useEffect, useMemo, useRef, useState } from "react";
import { Film, Loader2, UploadCloud, X } from "lucide-react";
import {
  getVideoJobStatus,
  submitVideoBackground,
} from "../api/emotionApi";
import type { VideoJob, VideoResult } from "../types/emotion";
import { getEmotionMeta } from "../constants/emotions";
import { EmotionBars } from "../components/EmotionBars";

// ============================================================
// Màn hình Phân tích Video — dùng xử lý ngầm (BackgroundTasks):
// 1. POST /emotion/video/background -> nhận job_id ngay
// 2. Poll GET /emotion/video/status/{job_id} tới khi xong
// 3. Hiển thị kết quả: tổng hợp cảm xúc + timeline + khuôn mặt
// ============================================================

export const VideoAnalysis = () => {
  const [file, setFile] = useState<File | null>(null);
  const [job, setJob] = useState<VideoJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const pollTimerRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);
  const stopPollingRef = useRef(false);

  // Dọn dẹp polling khi rời trang
  useEffect(() => {
    return () => {
      stopPollingRef.current = true;
      if (pollTimerRef.current !== null) clearTimeout(pollTimerRef.current);
      if (tickRef.current !== null) clearInterval(tickRef.current);
    };
  }, []);

  const startJob = async (selected: File) => {
    setError(null);
    setSubmitting(true);
    setJob(null);
    setElapsed(0);
    stopPollingRef.current = false;

    try {
      const initial = await submitVideoBackground(selected);
      setJob(initial);
      setSubmitting(false);

      // Đồng hồ đếm thời gian chờ
      const startedAt = Date.now();
      tickRef.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAt) / 1000));
      }, 1000);

      // Poll trạng thái job từ backend
      const poll = async () => {
        try {
          const current = await getVideoJobStatus(initial.job_id);
          setJob(current);
          if (current.status === "completed" || current.status === "failed") {
            if (tickRef.current !== null) clearInterval(tickRef.current);
            return;
          }
        } catch (e) {
          setError((e as Error).message);
          if (tickRef.current !== null) clearInterval(tickRef.current);
          return;
        }
        if (!stopPollingRef.current) {
          pollTimerRef.current = window.setTimeout(poll, 2000);
        }
      };
      pollTimerRef.current = window.setTimeout(poll, 2000);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleReset = () => {
    stopPollingRef.current = true;
    if (pollTimerRef.current !== null) clearTimeout(pollTimerRef.current);
    if (tickRef.current !== null) clearInterval(tickRef.current);
    setFile(null);
    setJob(null);
    setElapsed(0);
    setError(null);
  };

  const processing = submitting || job?.status === "processing";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Phân tích Video</h1>
        <p className="text-slate-500 text-sm mt-1">
          Tải video lên — hệ thống phân tích ngầm (BackgroundTasks) và trả kết quả khi hoàn tất
        </p>
      </div>

      {/* Vùng chọn file */}
      {!file && (
        <label className="flex flex-col items-center justify-center gap-3 py-16 border-2 border-dashed border-slate-300 rounded-2xl bg-white cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
          <UploadCloud size={44} className="text-slate-300" />
          <p className="text-slate-600 text-sm font-medium">
            Nhấn để chọn video (MP4, AVI, MOV...)
          </p>
          <p className="text-xs text-slate-400">Video sẽ được phân tích ngầm trên máy chủ</p>
          <input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
        </label>
      )}

      {file && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Film size={20} />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">{file.name}</p>
                <p className="text-xs text-slate-400">
                  {(file.size / (1024 * 1024)).toFixed(1)} MB
                </p>
              </div>
            </div>
            {!processing && (
              <button
                onClick={handleReset}
                className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Chọn video khác"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Nút bắt đầu */}
          {!job && !submitting && (
            <button
              onClick={() => void startJob(file)}
              className="mt-4 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
            >
              Bắt đầu phân tích
            </button>
          )}

          {/* Đang xử lý ngầm */}
          {processing && (
            <div className="mt-4 flex flex-col items-center gap-2 py-6">
              <Loader2 size={28} className="animate-spin text-blue-600" />
              <p className="text-sm font-medium text-slate-700">
                Đang phân tích video trên máy chủ...
              </p>
              <p className="text-xs text-slate-400">
                Đã chờ {elapsed}s — server xử lý ngầm, bạn có thể giữ trang này mở
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Kết quả */}
      {job?.status === "completed" && job.result && (
        <VideoResultView result={job.result} onReset={handleReset} />
      )}

      {job?.status === "failed" && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm">
          Phân tích thất bại: {job.error ?? "lỗi không xác định"}
        </div>
      )}
    </div>
  );
};

// ============================================================
// Hiển thị kết quả video
// ============================================================
function VideoResultView({
  result,
  onReset,
}: {
  result: VideoResult;
  onReset: () => void;
}) {
  const topEmotion = useMemo(() => {
    const entries = Object.entries(result.emotionSummary).sort((a, b) => b[1] - a[1]);
    return entries[0]?.[0] ?? "neutral";
  }, [result.emotionSummary]);

  const meta = getEmotionMeta(topEmotion);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{meta.emoji}</span>
            <div>
              <p className="text-xl font-bold" style={{ color: meta.color }}>
                {meta.label} {Math.round(result.emotionSummary[topEmotion] ?? 0)}%
              </p>
              <p className="text-xs text-slate-400">
                {result.filename} · {result.duration}s · {result.processedFrames}/{result.totalFrames} frame · {result.totalFaces} khuôn mặt
              </p>
            </div>
          </div>
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700"
          >
            Phân tích video khác
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-800 mb-4">Tổng hợp cảm xúc toàn video</h2>
        <EmotionBars scores={result.emotionSummary} showAll={false} />
      </div>

      {/* Timeline */}
      {result.timeline.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Diễn biến cảm xúc theo thời gian</h2>
          <div className="flex items-end gap-1 h-48">
            {result.timeline.map((point, idx) => {
              const top = Object.entries(point.emotions).sort((a, b) => b[1] - a[1])[0];
              const m = getEmotionMeta(top?.[0]);
              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center gap-1 group relative min-w-[6px]"
                  title={`${point.time}s: ${m.label} ${Math.round(top?.[1] ?? 0)}%`}
                >
                  <div
                    className="w-full rounded-t-md min-h-[4px] group-hover:opacity-80 transition-opacity"
                    style={{
                      height: `${Math.max(4, top?.[1] ?? 4)}%`,
                      backgroundColor: m.color,
                    }}
                  />
                  {result.timeline.length <= 20 && (
                    <span className="text-[10px] text-slate-400">{point.time}s</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Khuôn mặt */}
      {result.faces.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Khuôn mặt phát hiện</h2>
          <div className="relative aspect-video bg-slate-100 rounded-xl overflow-hidden">
            {result.faces.map((f) => {
              const m = getEmotionMeta(f.dominantEmotion);
              return (
                <div
                  key={f.id}
                  className="absolute border-2 rounded-lg"
                  style={{
                    left: `${f.x}%`,
                    top: `${f.y}%`,
                    width: `${f.width}%`,
                    height: `${f.height}%`,
                    borderColor: m.color,
                  }}
                >
                  <span
                    className="absolute -top-6 left-0 whitespace-nowrap px-1.5 py-0.5 rounded text-[10px] font-semibold text-white"
                    style={{ backgroundColor: m.color }}
                  >
                    #{f.id} {m.emoji} {Math.round(f.confidence)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
