import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  deleteHistoryItem,
  formatClock,
  formatDateTime,
  getHistoryDetail,
  mediaUrl,
  type HistoryItem,
} from "../services/historyApi";
import { EMOTIONS, emotionStyle } from "../constants/emotionStyle";

/* Dữ liệu từng người do backend trả thêm cho video / webcam */
type Person = {
  id: number;
  appearance_rate: number;
  dominant_emotion: string;
  positive_rate: number;
  emotion_summary: Record<string, number>;
  timeline: HistoryItem["timeline"];
};
type FaceBox = {
  id: number;
  dominantEmotion: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
};
type Sample = { time: number; faces: FaceBox[] };
type DetailRecord = HistoryItem & { people?: Person[]; samples?: Sample[] };

const card: React.CSSProperties = {
  backgroundColor: "#FFFFFF",
  borderRadius: 16,
  padding: 20,
  border: "1px solid #E2E8F0",
};
const cardTitle: React.CSSProperties = { margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: "#0F254A" };

const topEmotion = (emotions: Record<string, number>) =>
  Object.entries(emotions).sort((a, b) => b[1] - a[1])[0]?.[0];

const personLabel = (id: number) => `Người ${id + 1}`;

// Mẫu phân tích chỉ có ở mốc có mặt người, quá ngần này giây thì ẩn khung.
const MAX_SAMPLE_GAP = 2.5;
const facesAt = (samples: Sample[], time: number): FaceBox[] => {
  for (let i = samples.length - 1; i >= 0; i--) {
    if (samples[i].time <= time + 0.05) {
      return time - samples[i].time <= MAX_SAMPLE_GAP ? samples[i].faces : [];
    }
  }
  return [];
};

function MiniRatioBar({ summary }: { summary: Record<string, number> }) {
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

export const HistoryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [record, setRecord] = useState<DetailRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(0);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<number | null>(null); // null = tất cả

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getHistoryDetail(id)
      .then((data) => !cancelled && setRecord(data))
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const people = useMemo(() => record?.people ?? [], [record]);
  const person = useMemo(() => people.find((p) => p.id === selected) ?? null, [people, selected]);
  const timeline = useMemo(() => (person ? person.timeline : record?.timeline ?? []), [person, record]);
  const chartData = useMemo(() => timeline.map((p) => ({ time: p.time, ...p.emotions })), [timeline]);

  if (loading) {
    return <div style={{ textAlign: "center", padding: 60, color: "#64748B" }}>Đang tải chi tiết...</div>;
  }
  if (error || !record) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <p style={{ color: "#DC2626", marginBottom: 16 }}>{error || "Không tìm thấy bản ghi."}</p>
        <button
          onClick={() => navigate("/history")}
          style={{ padding: "8px 16px", background: "#2563EB", color: "#FFF", borderRadius: 8, border: "none", cursor: "pointer" }}
        >
          Quay lại lịch sử
        </button>
      </div>
    );
  }

  const url = mediaUrl(record.media_url);
  const isImage = record.type === "image";
  const hasVideo = !isImage && !!url;
  const hasFaces = record.total_faces > 0;

  // Số liệu đang hiển thị: của người được chọn, hoặc tổng thể
  const view = person ?? {
    dominant_emotion: record.dominant_emotion,
    positive_rate: record.positive_rate,
    emotion_summary: record.emotion_summary,
  };
  const dominant = emotionStyle(view.dominant_emotion);
  const currentFaces = hasVideo ? facesAt(record.samples ?? [], now) : [];

  const seek = (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setNow(time);
    void video.play().catch(() => undefined);
  };

  const toggle = (emotion: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(emotion)) next.delete(emotion);
      else next.add(emotion);
      return next;
    });

  const pickPerson = (personId: number) => setSelected((cur) => (cur === personId ? null : personId));

  const handleDelete = async () => {
    if (!window.confirm("Xóa phiên này? Ảnh/video đã lưu cũng bị xóa vĩnh viễn.")) return;
    try {
      await deleteHistoryItem(record.id);
      navigate("/history");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không xóa được bản ghi");
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button
          onClick={() => navigate("/history")}
          style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#64748B" }}
        >
          ←
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0F254A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {record.filename}
          </h1>
          <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
            {record.type_label} — {formatDateTime(record.created_at)}
          </div>
        </div>
        <button
          onClick={() => void handleDelete()}
          style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#FEE2E2", color: "#DC2626", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
        >
          Xóa phiên
        </button>
      </div>

      {/* Chọn người xem: chỉ hiện khi có từ 2 người trở lên */}
      {people.length > 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: "#64748B", marginRight: 4 }}>Xem theo:</span>
          {[{ key: null as number | null, label: "Tất cả", color: "#2563EB" }, ...people.map((p) => ({
            key: p.id as number | null,
            label: personLabel(p.id),
            color: emotionStyle(p.dominant_emotion).color,
          }))].map((chip) => {
            const active = selected === chip.key;
            return (
              <button
                key={String(chip.key)}
                onClick={() => setSelected(chip.key)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  border: `1px solid ${chip.color}`,
                  background: active ? chip.color : "#FFF",
                  color: active ? "#FFF" : chip.color,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 24, alignItems: "start" }}>
        {/* Cột trái: media và diễn biến */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={card}>
            {isImage && url ? (
              <div style={{ position: "relative", lineHeight: 0 }}>
                <img src={url} alt={record.filename} style={{ width: "100%", display: "block", borderRadius: 10 }} />
                {record.faces
                  .filter((f) => f.width > 0)
                  .map((f) => {
                    const st = emotionStyle(f.dominantEmotion);
                    return (
                      <div
                        key={f.id}
                        style={{ position: "absolute", left: `${f.x}%`, top: `${f.y}%`, width: `${f.width}%`, height: `${f.height}%`, border: `2px solid ${st.color}`, borderRadius: 6, boxSizing: "border-box" }}
                      >
                        <span style={{ position: "absolute", top: -22, left: -2, background: st.color, color: "#FFF", fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 4, whiteSpace: "nowrap", lineHeight: "18px" }}>
                          {st.emoji} {st.label}
                        </span>
                      </div>
                    );
                  })}
              </div>
            ) : hasVideo ? (
              <div style={{ position: "relative", lineHeight: 0 }}>
                <video
                  ref={videoRef}
                  src={url}
                  controls
                  preload="metadata"
                  onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
                  style={{ width: "100%", display: "block", borderRadius: 10, background: "#000" }}
                />
                {/* Khung mặt theo thời gian, bấm vào khung để xem riêng người đó */}
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", borderRadius: 10 }}>
                  {currentFaces.map((f) => {
                    const st = emotionStyle(f.dominantEmotion);
                    const isSelected = selected === f.id;
                    const dimmed = selected !== null && !isSelected;
                    return (
                      <div
                        key={f.id}
                        onClick={() => pickPerson(f.id)}
                        title={`${personLabel(f.id)} — bấm để ${isSelected ? "xem tất cả" : "xem riêng"}`}
                        style={{
                          position: "absolute",
                          left: `${f.x}%`,
                          top: `${f.y}%`,
                          width: `${f.width}%`,
                          height: `${f.height}%`,
                          border: `${isSelected ? 3 : 2}px solid ${st.color}`,
                          borderRadius: 6,
                          boxSizing: "border-box",
                          cursor: "pointer",
                          pointerEvents: "auto",
                          opacity: dimmed ? 0.45 : 1,
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            top: f.y < 8 ? 2 : -22,
                            left: -2,
                            background: st.color,
                            color: "#FFF",
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: 4,
                            whiteSpace: "nowrap",
                            lineHeight: "18px",
                          }}
                        >
                          {personLabel(f.id)} · {st.emoji} {st.label} {Math.round(f.confidence)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8", background: "#F8FAFC", borderRadius: 10, fontSize: 14 }}>
                Không có bản lưu {isImage ? "ảnh" : "video"} cho phiên này
              </div>
            )}
          </div>

          {!isImage && record.timeline.length > 0 && (
            <div style={card}>
              <h3 style={cardTitle}>
                Diễn biến cảm xúc{person ? ` — ${personLabel(person.id)}` : ""}
              </h3>

              <div style={{ display: "flex", gap: 1, marginBottom: 4 }}>
                {timeline.map((point, i) => {
                  const top = topEmotion(point.emotions);
                  const nextTime = timeline[i + 1]?.time ?? Infinity;
                  const active = hasVideo && now >= point.time && now < nextTime;
                  return (
                    <button
                      key={i}
                      onClick={() => seek(point.time)}
                      title={`${formatClock(point.time)} — ${emotionStyle(top).label}`}
                      style={{
                        flex: 1,
                        minWidth: 3,
                        height: 30,
                        padding: 0,
                        border: "none",
                        cursor: hasVideo ? "pointer" : "default",
                        background: emotionStyle(top).color,
                        opacity: active || !hasVideo ? 1 : 0.55,
                        outline: active ? "2px solid #0F254A" : "none",
                      }}
                    />
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94A3B8", marginBottom: 16 }}>
                <span>0:00</span>
                <span>{formatClock(record.duration_seconds)}</span>
              </div>

              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis
                      dataKey="time"
                      type="number"
                      domain={[0, "dataMax"]}
                      tickFormatter={(v) => formatClock(Number(v))}
                    />
                    <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      labelFormatter={(label) => formatClock(Number(label))}
                      formatter={(value, name) => [`${Number(value).toFixed(0)}%`, emotionStyle(String(name)).label]}
                    />
                    {EMOTIONS.filter((e) => !hidden.has(e)).map((e) => (
                      <Line
                        key={e}
                        type="monotone"
                        dataKey={e}
                        stroke={emotionStyle(e).color}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    ))}
                    {hasVideo && <ReferenceLine x={now} stroke="#0F254A" strokeDasharray="4 2" />}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                {EMOTIONS.map((e) => {
                  const st = emotionStyle(e);
                  const off = hidden.has(e);
                  return (
                    <button
                      key={e}
                      onClick={() => toggle(e)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        border: `1px solid ${st.color}`,
                        background: off ? "#FFF" : st.color,
                        color: off ? st.color : "#FFF",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Cột phải: tổng quan */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ ...card, background: hasFaces ? `${dominant.color}1A` : "#FFF", borderColor: hasFaces ? dominant.color : "#E2E8F0" }}>
            <div style={{ fontSize: 12, color: "#64748B" }}>
              Cảm xúc chủ đạo{person ? ` — ${personLabel(person.id)}` : ""}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: hasFaces ? dominant.color : "#64748B", marginTop: 4 }}>
              {hasFaces ? `${dominant.emoji} ${dominant.label}` : record.quick_result}
            </div>
          </div>

          <div style={card}>
            <h3 style={cardTitle}>Tổng quan</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {[
                person
                  ? { label: "Xuất hiện", value: `${person.appearance_rate}%`, bg: "#EFF6FF", fg: "#2563EB" }
                  : { label: "Khuôn mặt", value: String(record.total_faces), bg: "#EFF6FF", fg: "#2563EB" },
                { label: "Tích cực", value: `${view.positive_rate.toFixed(0)}%`, bg: "#DCFCE7", fg: "#16A34A" },
                { label: "Thời lượng", value: isImage ? "—" : record.duration, bg: "#F1F5F9", fg: "#475569" },
              ].map((m) => (
                <div key={m.label} style={{ background: m.bg, borderRadius: 10, padding: 14, textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: m.fg }}>{m.value}</div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* So sánh nhanh từng người, bấm để xem riêng */}
          {people.length > 1 && (
            <div style={card}>
              <h3 style={cardTitle}>So sánh từng người</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {people.map((p) => {
                  const st = emotionStyle(p.dominant_emotion);
                  const isSelected = selected === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => pickPerson(p.id)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        cursor: "pointer",
                        border: `1px solid ${isSelected ? st.color : "#E2E8F0"}`,
                        background: isSelected ? `${st.color}1A` : "#FFF",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                        <span style={{ fontWeight: 600, color: "#0F172A" }}>{personLabel(p.id)}</span>
                        <span style={{ color: st.color, fontWeight: 700 }}>
                          {st.emoji} {st.label}
                        </span>
                        <span style={{ color: "#16A34A", fontWeight: 600, fontSize: 12 }}>
                          {p.positive_rate.toFixed(0)}% tích cực
                        </span>
                      </div>
                      <MiniRatioBar summary={p.emotion_summary} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={card}>
            <h3 style={cardTitle}>
              {person ? `Tỉ lệ cảm xúc — ${personLabel(person.id)}` : "Tỉ lệ cảm xúc tổng thể"}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {EMOTIONS.map((e) => {
                const value = view.emotion_summary[e] ?? 0;
                const st = emotionStyle(e);
                return (
                  <div key={e} style={{ display: "grid", gridTemplateColumns: "100px 1fr 44px", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: st.color }}>{st.label}</span>
                    <div style={{ height: 8, background: "#E2E8F0", borderRadius: 6, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(100, value)}%`, background: st.color, borderRadius: 6 }} />
                    </div>
                    <span style={{ fontSize: 12, color: "#64748B", textAlign: "right" }}>{Math.round(value)}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {isImage && record.faces.length > 0 && (
            <div style={card}>
              <h3 style={cardTitle}>Khuôn mặt phát hiện ({record.faces.length})</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {record.faces.map((f) => {
                  const st = emotionStyle(f.dominantEmotion);
                  return (
                    <div key={f.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: `${st.color}1A`, fontSize: 13 }}>
                      <span style={{ fontWeight: 600, color: "#0F172A" }}>Người {f.id + 1}</span>
                      <span style={{ color: st.color, fontWeight: 700 }}>
                        {st.emoji} {st.label} {Math.round(f.confidence)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};