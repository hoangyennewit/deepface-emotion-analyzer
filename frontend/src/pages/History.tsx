import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock,
  Film,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import {
  deleteHistoryItem,
  getHistory,
  getHistoryDetail,
} from "../api/emotionApi";
import type { HistoryRecord } from "../types/emotion";
import { getEmotionMeta } from "../constants/emotions";
import { EmotionBars } from "../components/EmotionBars";

// ============================================================
// Màn hình Lịch sử phân tích — kết nối GET/DELETE /emotion/history
// ============================================================

type HistoryFilter = "all" | "image" | "video";

export const History = () => {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<HistoryRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHistory("all");
      setRecords(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getHistory("all");
        if (!cancelled) setRecords(data);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? records : records.filter((r) => r.type === filter)),
    [records, filter]
  );

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteHistoryItem(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  const openDetail = async (id: string) => {
    try {
      const detail = await getHistoryDetail(id);
      setSelected(detail);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Lịch sử phân tích</h1>
          <p className="text-slate-500 text-sm mt-1">
            Toàn bộ phiên phân tích ảnh và video đã lưu trên hệ thống
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Làm mới
        </button>
      </div>

      {/* Bộ lọc */}
      <div className="flex gap-2">
        {(
          [
            { key: "all", label: "Tất cả" },
            { key: "image", label: "Ảnh" },
            { key: "video", label: "Video" },
          ] as const
        ).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-blue-600 text-white shadow"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Nội dung */}
      {loading ? (
        <div className="flex items-center justify-center gap-3 py-20 text-slate-400">
          <Loader2 size={24} className="animate-spin" />
          Đang tải lịch sử...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          Chưa có bản ghi lịch sử nào. Hãy phân tích ảnh hoặc video trước.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((r) => {
            const meta = getEmotionMeta(r.dominant_emotion);
            const Icon = r.type === "image" ? ImageIcon : Film;
            return (
              <div
                key={r.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => void openDetail(r.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${meta.bg} bg-opacity-10`}
                      style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
                    >
                      <Icon size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm truncate max-w-[180px]">
                        {r.filename}
                      </p>
                      <p className="text-xs text-slate-400">{r.type_label}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDelete(r.id);
                    }}
                    disabled={deletingId === r.id}
                    className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="Xóa bản ghi"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <span className="text-2xl">{meta.emoji}</span>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: meta.color }}>
                      {r.quick_result}
                    </p>
                    <p className="text-xs text-slate-400">{r.total_faces} khuôn mặt</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <CalendarDays size={13} /> {r.created_at}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={13} /> {r.duration}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal chi tiết */}
      {selected && <HistoryDetailModal record={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

// ============================================================
// Modal chi tiết một bản ghi lịch sử
// ============================================================
function HistoryDetailModal({
  record,
  onClose,
}: {
  record: HistoryRecord;
  onClose: () => void;
}) {
  const meta = getEmotionMeta(record.dominant_emotion);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="text-3xl">{meta.emoji}</span> {record.filename}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {record.type_label} · {record.created_at} · Thời lượng {record.duration}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tổng quan */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 p-3 text-center">
            <p className="text-xs text-slate-500">Cảm xúc chủ đạo</p>
            <p className="font-bold mt-1" style={{ color: meta.color }}>
              {meta.label}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-3 text-center">
            <p className="text-xs text-slate-500">Số khuôn mặt</p>
            <p className="font-bold text-slate-800 mt-1">{record.total_faces}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-3 text-center">
            <p className="text-xs text-slate-500">Tỉ lệ tích cực</p>
            <p className="font-bold text-green-600 mt-1">{record.positive_rate}%</p>
          </div>
        </div>

        {/* Timeline */}
        {record.timeline.length > 0 && (
          <div>
            <h3 className="font-semibold text-slate-700 text-sm mb-3">Diễn biến cảm xúc</h3>
            <div className="flex items-end gap-1 h-40">
              {record.timeline.map((point, idx) => {
                const top = Object.entries(point.emotions).sort(
                  (a, b) => b[1] - a[1]
                )[0];
                const m = getEmotionMeta(top?.[0]);
                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center gap-1 group relative"
                    title={`${point.time}s: ${m.label} ${Math.round(top?.[1] ?? 0)}%`}
                  >
                    <div
                      className="w-full rounded-t-md min-h-[4px] group-hover:opacity-80 transition-opacity"
                      style={{
                        height: `${Math.max(4, top?.[1] ?? 4)}%`,
                        backgroundColor: m.color,
                      }}
                    />
                    <span className="text-[10px] text-slate-400">{point.time}s</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Khuôn mặt */}
        {record.faces.length > 0 && (
          <div>
            <h3 className="font-semibold text-slate-700 text-sm mb-3">Khuôn mặt phát hiện</h3>
            <div className="relative aspect-video bg-slate-100 rounded-xl overflow-hidden">
              {record.faces.map((f) => {
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

        {/* Tổng hợp điểm cảm xúc */}
        <div>
          <h3 className="font-semibold text-slate-700 text-sm mb-3">Tổng hợp điểm cảm xúc</h3>
          <EmotionBars scores={record.emotion_summary} showAll={false} />
        </div>
      </div>
    </div>
  );
}
