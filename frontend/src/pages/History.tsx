import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Film, Image as ImageIcon, Loader2, RefreshCw, Trash2, X } from 'lucide-react';
import { deleteHistoryItem, getHistory, getHistoryDetail } from '../api/emotionApi';
import type { HistoryRecord } from '../types/emotion';
import { getEmotionMeta } from '../constants/emotions';
import { EmotionBars } from '../components/EmotionBars';

type Filter = 'all' | 'image' | 'video';
const message = (error: unknown) => error instanceof Error ? error.message : 'Có lỗi xảy ra. Vui lòng thử lại.';
const dateText = (value: string) => Number.isNaN(Date.parse(value)) ? value : new Date(value).toLocaleString('vi-VN');
const timeValue = (value: string) => Number.isNaN(Date.parse(value)) ? 0 : Date.parse(value);

export const History = () => {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [selected, setSelected] = useState<HistoryRecord | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const detailLock = useRef(false);
  const deleteLock = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getHistory('all');
        if (active) setRecords(data);
      } catch (cause) {
        if (active) setError(message(cause));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [refresh]);

  const filtered = useMemo(() => records.filter(record =>
    (filter === 'all' || record.type === filter) &&
    record.filename.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'))
  ).sort((a, b) => sort === 'newest'
    ? timeValue(b.created_at) - timeValue(a.created_at)
    : timeValue(a.created_at) - timeValue(b.created_at)), [records, filter, search, sort]);

  async function openDetail(id: string) {
    if (detailLock.current) return;
    detailLock.current = true;
    setDetailId(id);
    setError(null);
    try {
      const data = await getHistoryDetail(id);
      if (mounted.current) setSelected(data);
    } catch (cause) {
      if (mounted.current) setError(message(cause));
    } finally {
      detailLock.current = false;
      if (mounted.current) setDetailId(null);
    }
  }

  async function remove(record: HistoryRecord) {
    if (deleteLock.current || !window.confirm(`Xóa lịch sử "${record.filename}"?`)) return;
    deleteLock.current = true;
    setDeletingId(record.id);
    setError(null);
    try {
      await deleteHistoryItem(record.id);
      if (mounted.current) {
        setRecords(previous => previous.filter(item => item.id !== record.id));
        setSelected(previous => previous?.id === record.id ? null : previous);
      }
    } catch (cause) {
      if (mounted.current) setError(message(cause));
    } finally {
      deleteLock.current = false;
      if (mounted.current) setDeletingId(null);
    }
  }

  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-slate-800">Lịch sử phân tích</h1>
        <p className="mt-1 text-sm text-slate-500">Xem lại kết quả phân tích ảnh và video đã lưu.</p></div>
      <button onClick={() => setRefresh(value => value + 1)} disabled={loading || deletingId !== null}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm disabled:opacity-50">
        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />Làm mới
      </button>
    </header>
    <div className="flex flex-col gap-3 sm:flex-row">
      <input type="search" aria-label="Tìm kiếm theo tên file" placeholder="Tìm tên ảnh hoặc video..." value={search}
        onChange={event => setSearch(event.target.value)}
        className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-blue-200" />
      <select aria-label="Sắp xếp lịch sử" value={sort} onChange={event => setSort(event.target.value as 'newest' | 'oldest')}
        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
        <option value="newest">Mới nhất trước</option><option value="oldest">Cũ nhất trước</option>
      </select>
    </div>
    <div className="flex flex-wrap gap-2">
      {([{ key: 'all', label: 'Tất cả' }, { key: 'image', label: 'Ảnh' }, { key: 'video', label: 'Video' }] as const).map(item =>
        <button key={item.key} aria-pressed={filter === item.key} onClick={() => setFilter(item.key)}
          className={`rounded-full px-4 py-2 text-sm ${filter === item.key ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>
          {item.label}</button>)}
      <span className="self-center text-sm text-slate-500">{filtered.length} phiên</span>
    </div>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {detailId && <p role="status" className="flex items-center gap-2 text-sm text-blue-600"><Loader2 size={18} className="animate-spin" />Đang tải chi tiết...</p>}
    {loading ? <p role="status" className="flex justify-center gap-2 py-16 text-slate-500"><Loader2 className="animate-spin" />Đang tải lịch sử...</p>
      : filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-500">
        {records.length === 0 ? (error ? 'Chưa tải được lịch sử. Hãy thử làm mới.' : 'Chưa có lịch sử. Hãy phân tích ảnh hoặc video trước.') : 'Không có kết quả phù hợp với tìm kiếm và bộ lọc.'}
      </div> : <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map(record => {
          const meta = getEmotionMeta(record.dominant_emotion);
          const Icon = record.type === 'image' ? ImageIcon : Film;
          return <article key={record.id} className="rounded-2xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3"><Icon size={22} className="shrink-0 text-blue-600" />
                <div className="min-w-0"><h2 className="truncate font-semibold text-slate-800" title={record.filename}>{record.filename}</h2>
                  <p className="text-xs text-slate-500">{record.type_label}</p></div></div>
              <button aria-label={`Xóa ${record.filename}`} disabled={deletingId !== null || loading || detailId !== null}
                onClick={() => void remove(record)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                {deletingId === record.id ? <Loader2 size={17} className="animate-spin" /> : <Trash2 size={17} />}</button>
            </div>
            <p className="mt-4 font-semibold" style={{ color: meta.color }}>{meta.emoji} {record.quick_result || meta.label}</p>
            <p className="mt-1 text-sm text-slate-500">{record.total_faces} lượt khuôn mặt · {record.duration}</p>
            <p className="mt-4 flex items-center gap-1 border-t border-slate-100 pt-3 text-xs text-slate-500"><CalendarDays size={13} />{dateText(record.created_at)}</p>
            <button disabled={detailId !== null || deletingId !== null} onClick={() => void openDetail(record.id)}
              className="mt-4 w-full rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50">Xem chi tiết</button>
          </article>;
        })}
      </div>}
    {selected && <HistoryDetailModal record={selected} onClose={() => setSelected(null)} />}
  </div>;
};

function HistoryDetailModal({ record, onClose }: { record: HistoryRecord; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const meta = getEmotionMeta(record.dominant_emotion);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); };
  }, []);
  return <dialog ref={dialog} aria-labelledby="history-detail-title" onCancel={onClose}
    className="m-auto max-h-[85vh] w-[calc(100%-2rem)] max-w-3xl rounded-2xl border-0 bg-white p-6 text-slate-800 shadow-xl backdrop:bg-black/50">
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4"><div>
        <h2 id="history-detail-title" className="break-all text-lg font-bold">{meta.emoji} {record.filename}</h2>
        <p className="mt-1 text-sm text-slate-500">{record.type_label} · {dateText(record.created_at)} · {record.duration}</p>
      </div><button autoFocus aria-label="Đóng chi tiết" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100"><X size={20} /></button></header>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-500">Cảm xúc chủ đạo</p><p className="mt-1 font-bold" style={{ color: meta.color }}>{meta.label}</p></div>
        <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-500">Lượt khuôn mặt</p><p className="mt-1 font-bold">{record.total_faces}</p></div>
        <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-500">Tỷ lệ tích cực</p><p className="mt-1 font-bold text-green-600">{record.positive_rate}%</p></div>
      </div>
      <section><h3 className="mb-3 font-semibold">Tổng hợp điểm cảm xúc</h3><EmotionBars scores={record.emotion_summary} showAll={true} /></section>
      <section><h3 className="mb-3 font-semibold">Diễn biến cảm xúc</h3>
        {record.timeline.length === 0 ? <p className="text-sm text-slate-500">Không có dữ liệu diễn biến cảm xúc.</p>
          : <div className="overflow-x-auto rounded-xl border border-slate-200 p-4"><div className="flex items-end gap-3">
            {record.timeline.map((point, index) => {
              const top = Object.entries(point.emotions).filter(([, score]) => Number.isFinite(score)).sort((a, b) => b[1] - a[1])[0];
              const emotion = getEmotionMeta(top?.[0] ?? 'neutral');
              const score = Math.min(100, Math.max(0, top?.[1] ?? 0));
              return <div key={`${point.time}-${index}`} className="min-w-10 flex-1 text-center" title={`${point.time}s: ${emotion.label} ${score.toFixed(1)}%`}>
                <div className="flex h-32 items-end"><div className="w-full rounded-t-md" style={{ height: `${score}%`, backgroundColor: emotion.color }} /></div>
                <p className="mt-2 text-xs text-slate-500">{point.time}s</p></div>;
            })}</div></div>}
      </section>
      <section><h3 className="mb-3 font-semibold">Chi tiết khuôn mặt</h3>
        {record.faces.length === 0 ? <p className="text-sm text-slate-500">Không có dữ liệu khuôn mặt.</p>
          : <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full text-left text-sm">
            <thead className="bg-slate-50"><tr><th className="p-3">ID mặt</th><th className="p-3">Cảm xúc</th><th className="p-3">Confidence (gốc)</th></tr></thead>
            <tbody>{record.faces.map(face => { const emotion = getEmotionMeta(face.dominantEmotion); return <tr key={face.id} className="border-t border-slate-100">
              <td className="p-3">#{face.id}</td><td className="p-3" style={{ color: emotion.color }}>{emotion.emoji} {emotion.label}</td>
              <td className="p-3">{Number.isFinite(face.confidence) ? face.confidence.toFixed(2) : '—'}</td></tr>; })}</tbody>
          </table></div>}
      </section>
    </div>
  </dialog>;
}
