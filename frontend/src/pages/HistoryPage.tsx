import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  deleteHistoryItem,
  formatDateTime,
  getHistory,
  mediaUrl,
  type HistoryItem,
  type HistoryType,
} from "../services/historyApi";
import { EMOTIONS, emotionStyle } from "../constants/emotionStyle";

type Tab = "all" | HistoryType;
type Sort = "newest" | "oldest" | "positive";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "image", label: "Hình ảnh" },
  { key: "video", label: "Video" },
  { key: "webcam", label: "Webcam" },
];
const TYPE_ICON: Record<HistoryType, string> = { image: "🖼️", video: "🎥", webcam: "📹" };

const card: React.CSSProperties = {
  backgroundColor: "#FFFFFF",
  borderRadius: 16,
  border: "1px solid #E2E8F0",
};

function RatioBar({ summary }: { summary: Record<string, number> }) {
  const total = EMOTIONS.reduce((sum, e) => sum + (summary[e] ?? 0), 0);
  return (
    <div style={{ display: "flex", height: 8, borderRadius: 6, overflow: "hidden", background: "#E2E8F0" }}>
      {total > 0 &&
        EMOTIONS.map((e) =>
          summary[e] ? (
            <div
              key={e}
              title={`${emotionStyle(e).label} ${summary[e].toFixed(0)}%`}
              style={{ width: `${(summary[e] / total) * 100}%`, background: emotionStyle(e).color }}
            />
          ) : null
        )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ ...card, padding: "16px 20px", flex: "1 1 180px" }}>
      <div style={{ fontSize: 12, color: "#64748B" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#0F254A", marginTop: 4 }}>{value}</div>
    </div>
  );
}

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // Luôn tải toàn bộ lịch sử một lần, việc lọc theo tab làm ở frontend
  useEffect(() => {
    let cancelled = false;
    getHistory("all")
      .then((data) => {
        if (cancelled) return;
        setItems(data);
        setError("");
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const changeTab = (next: Tab) => setTab(next);
  const refresh = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  // Danh sách đã lọc theo tab, dùng cho cả thống kê lẫn hiển thị
  const tabItems = useMemo(
    () => (tab === "all" ? items : items.filter((i) => i.type === tab)),
    [items, tab]
  );

  const stats = useMemo(() => {
    const done = tabItems.filter((i) => i.status === "completed" && i.total_faces > 0);
    const counts: Record<string, number> = {};
    done.forEach((i) => (counts[i.dominant_emotion] = (counts[i.dominant_emotion] ?? 0) + 1));
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const avg = done.length ? done.reduce((s, i) => s + i.positive_rate, 0) / done.length : 0;
    return { total: tabItems.length, top, avg };
  }, [tabItems]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = tabItems.filter(
      (i) =>
        !q ||
        i.filename.toLowerCase().includes(q) ||
        emotionStyle(i.dominant_emotion).label.toLowerCase().includes(q)
    );
    return [...list].sort((a, b) =>
      sort === "positive"
        ? b.positive_rate - a.positive_rate
        : sort === "oldest"
        ? Date.parse(a.created_at) - Date.parse(b.created_at)
        : Date.parse(b.created_at) - Date.parse(a.created_at)
    );
  }, [tabItems, search, sort]);

  const handleDelete = async (item: HistoryItem) => {
    if (!window.confirm(`Xóa "${item.filename}"? Ảnh/video đã lưu cũng bị xóa vĩnh viễn.`)) return;
    try {
      await deleteHistoryItem(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không xóa được bản ghi");
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0F254A" }}>Lịch sử phân tích</h1>
        <button
          onClick={refresh}
          disabled={loading}
          style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #CBD5E1", background: "#FFF", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#334155" }}
        >
          {loading ? "Đang tải..." : "Làm mới"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <StatCard label="Tổng số phiên" value={String(stats.total)} />
        <StatCard
          label="Cảm xúc phổ biến nhất"
          value={stats.top ? `${emotionStyle(stats.top).emoji} ${emotionStyle(stats.top).label}` : "—"}
        />
        <StatCard label="Tỉ lệ tích cực trung bình" value={`${stats.avg.toFixed(0)}%`} />
      </div>

      {error && (
        <div style={{ padding: "12px 16px", background: "#FEE2E2", color: "#DC2626", borderRadius: 8, fontSize: 14 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 6, background: "#EFF6FF", padding: 4, borderRadius: 10 }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => changeTab(t.key)}
              style={{
                padding: "8px 18px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                background: tab === t.key ? "#2563EB" : "transparent",
                color: tab === t.key ? "#FFF" : "#64748B",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13, background: "#FFF" }}
          >
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="positive">Tích cực nhất</option>
          </select>
          <input
            type="text"
            placeholder="Tìm theo tên file hoặc cảm xúc..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 260, padding: "9px 14px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13, outline: "none" }}
          />
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "#64748B" }}>Đang tải lịch sử...</div>
      ) : visible.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: 48, color: "#64748B" }}>
          {tabItems.length === 0
            ? items.length === 0
              ? "Chưa có phiên phân tích nào. Hãy phân tích ảnh, video hoặc bật webcam."
              : "Chưa có phiên phân tích nào ở mục này."
            : "Không có phiên nào khớp bộ lọc."}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {visible.map((item) => {
            const hasFaces = item.status === "completed" && item.total_faces > 0;
            const style = emotionStyle(item.dominant_emotion);
            const thumb = mediaUrl(item.thumbnail_url);
            return (
              <div
                key={item.id}
                onClick={() => navigate(`/history/${item.id}`)}
                style={{ ...card, overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column" }}
              >
                <div style={{ position: "relative", height: 150, background: "#0F172A" }}>
                  {thumb ? (
                    <img src={thumb} alt={item.filename} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>
                      {TYPE_ICON[item.type]}
                    </div>
                  )}
                  <span style={{ position: "absolute", top: 10, left: 10, padding: "3px 10px", borderRadius: 6, background: "rgba(15,23,42,0.75)", color: "#FFF", fontSize: 12, fontWeight: 600 }}>
                    {TYPE_ICON[item.type]} {item.type_label}
                  </span>
                  {item.type !== "image" && (
                    <span style={{ position: "absolute", bottom: 10, right: 10, padding: "2px 8px", borderRadius: 6, background: "rgba(15,23,42,0.75)", color: "#FFF", fontSize: 12 }}>
                      {item.duration}
                    </span>
                  )}
                </div>

                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.filename}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: hasFaces ? style.color : "#64748B" }}>
                      {hasFaces ? `${style.emoji} ${style.label}` : item.quick_result}
                    </span>
                    {hasFaces && (
                      <span style={{ fontSize: 12, color: "#16A34A", fontWeight: 600 }}>
                        {item.positive_rate.toFixed(0)}% tích cực
                      </span>
                    )}
                  </div>

                  <RatioBar summary={item.emotion_summary} />

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
                    <span style={{ fontSize: 12, color: "#64748B" }}>
                      {formatDateTime(item.created_at)}
                      {hasFaces ? ` — ${item.total_faces} người` : ""}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete(item);
                      }}
                      style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "#FEE2E2", color: "#DC2626", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};