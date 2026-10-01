import { useEffect, useRef, useState } from 'react';
import { Loader2, Save, Settings as SettingsIcon, Video } from 'lucide-react';
import { getSystemSettings, getWebcamSettings, saveSystemSettings, saveWebcamSettings } from '../api/settingsApi';
import type { SystemSettings, WebcamSettings } from '../api/settingsApi';

const inputClass = 'mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm disabled:bg-slate-50 disabled:text-slate-500';
const errorText = (value: unknown) => value instanceof Error ? value.message : 'Không xử lý được cài đặt.';

export const Settings = () => {
  const [system, setSystem] = useState<SystemSettings | null>(null);
  const [webcam, setWebcam] = useState<WebcamSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [saving, setSaving] = useState<'system' | 'webcam' | null>(null);
  const [notice, setNotice] = useState<{ section: 'system' | 'webcam'; ok: boolean; text: string } | null>(null);
  const lock = useRef(false);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      setLoading(true); setLoadError(''); setNotice(null);
      try {
        const [s, w] = await Promise.all([getSystemSettings(controller.signal), getWebcamSettings(controller.signal)]);
        if (!controller.signal.aborted) { setSystem(s); setWebcam(w); }
      } catch (cause) {
        if (!controller.signal.aborted) setLoadError(errorText(cause));
      } finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [reload]);

  async function save(section: 'system' | 'webcam') {
    if (lock.current || !system || !webcam) return;
    if (section === 'webcam' && (!Number.isInteger(webcam.fps) || webcam.fps < 1 || webcam.fps > 60 || !webcam.camera_id.trim())) {
      setNotice({ section, ok: false, text: 'Camera không được để trống; FPS phải là số nguyên từ 1 đến 60.' }); return;
    }
    lock.current = true; setSaving(section); setNotice(null);
    try {
      if (section === 'system') {
        const result = await saveSystemSettings(system);
        if (!result.success) throw new Error('Backend chưa xác nhận lưu cài đặt hệ thống.');
        if (mounted.current) setSystem(result.settings);
      } else {
        const result = await saveWebcamSettings({ ...webcam, camera_id: webcam.camera_id.trim() });
        if (!result.success) throw new Error('Backend chưa xác nhận lưu cài đặt webcam.');
        if (mounted.current) setWebcam(result.webcam_settings);
      }
      if (mounted.current) setNotice({ section, ok: true, text: 'Đã lưu cài đặt trên backend.' });
    } catch (cause) {
      if (mounted.current) setNotice({ section, ok: false, text: errorText(cause) });
    } finally { lock.current = false; if (mounted.current) setSaving(null); }
  }

  if (loading) return <p role="status" className="flex items-center gap-2 p-6 text-slate-500"><Loader2 className="animate-spin" />Đang tải cài đặt...</p>;
  if (loadError || !system || !webcam) return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
    <p>{loadError || 'Không có dữ liệu cài đặt.'}</p><button onClick={() => setReload(value => value + 1)} className="mt-3 rounded-lg border px-4 py-2">Thử lại</button></div>;

  const noticeFor = (section: 'system' | 'webcam') => notice?.section === section &&
    <p role={notice.ok ? 'status' : 'alert'} className={`rounded-lg p-3 text-sm ${notice.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{notice.text}</p>;
  const saveButton = (section: 'system' | 'webcam') => <button type="submit" disabled={saving !== null}
    className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
    {saving === section ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}{saving === section ? 'Đang lưu...' : 'Lưu cài đặt'}</button>;

  return <div className="max-w-5xl space-y-6">
    <header><h1 className="text-2xl font-bold text-slate-800">Cài đặt</h1><p className="mt-1 text-sm text-slate-500">Quản lý tùy chọn hệ thống và phân tích webcam.</p></header>
    <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Cài đặt hiện lưu tạm trên máy chủ và được đặt lại khi backend khởi động lại.</p>
    <form onSubmit={event => { event.preventDefault(); void save('system'); }} className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-slate-800"><SettingsIcon size={20} />Cài đặt hệ thống</h2>
      <fieldset disabled={saving !== null} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">Ngôn ngữ
            <select className={inputClass} value={system.language} onChange={event => setSystem({ ...system, language: event.target.value })}>
              {[...new Set([system.language, 'Tiếng Việt', 'English'])].map(value => <option key={value} value={value}>{value}</option>)}
            </select></label>
          <label className="text-sm font-medium text-slate-700">Giao diện
            <select className={inputClass} value={system.theme} onChange={event => setSystem({ ...system, theme: event.target.value })}>
              {[...new Set([system.theme, 'Sáng', 'Tối'])].map(value => <option key={value} value={value}>{value}</option>)}
            </select></label>
          <label className="text-sm font-medium text-slate-700">Mô hình phát hiện khuôn mặt<input readOnly className={inputClass} value={system.face_detector_model} /></label>
          <label className="text-sm font-medium text-slate-700">Mô hình phân tích cảm xúc<input readOnly className={inputClass} value={system.emotion_analysis_model} /></label>
        </div>
        <Toggle label="Tự động lưu kết quả" checked={system.auto_save} onChange={value => setSystem({ ...system, auto_save: value })} />
        <p className="text-xs text-slate-500">Trang này lưu tùy chọn. Đổi ngôn ngữ hoặc giao diện cần được các trang khác áp dụng để có hiệu lực.</p>
        {noticeFor('system')}{saveButton('system')}
      </fieldset>
    </form>
    <form onSubmit={event => { event.preventDefault(); void save('webcam'); }} className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-slate-800"><Video size={20} />Cài đặt webcam</h2>
      <fieldset disabled={saving !== null} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-3">
          <label className="text-sm font-medium text-slate-700">ID camera<input required className={inputClass} value={webcam.camera_id} onChange={event => setWebcam({ ...webcam, camera_id: event.target.value })} /><span className="text-xs text-slate-500">Dùng default cho camera mặc định.</span></label>
          <label className="text-sm font-medium text-slate-700">Độ phân giải<select className={inputClass} value={webcam.resolution} onChange={event => setWebcam({ ...webcam, resolution: event.target.value })}>
            {[...new Set([webcam.resolution, '480p', '720p', '1080p'])].map(value => <option key={value} value={value}>{value}</option>)}
          </select></label>
          <label className="text-sm font-medium text-slate-700">FPS<input required type="number" min={1} max={60} step={1} className={inputClass} value={Number.isFinite(webcam.fps) ? webcam.fps : ''} onChange={event => setWebcam({ ...webcam, fps: event.target.valueAsNumber })} /></label>
        </div>
        <Toggle label="Hiển thị khung khuôn mặt" checked={webcam.show_face_box} onChange={value => setWebcam({ ...webcam, show_face_box: value })} />
        <Toggle label="Hiển thị điểm cảm xúc" checked={webcam.show_emotion_rate} onChange={value => setWebcam({ ...webcam, show_emotion_rate: value })} />
        <Toggle label="Tự động lưu kết quả webcam" checked={webcam.auto_save} onChange={value => setWebcam({ ...webcam, auto_save: value })} />
        <p className="text-xs text-slate-500">Thông số thực tế phụ thuộc camera. Trang Webcam cần đọc các tùy chọn đã lưu để áp dụng.</p>
        {noticeFor('webcam')}{saveButton('webcam')}
      </fieldset>
    </form>
  </div>;
};
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-100 p-3 text-sm text-slate-700"><span>{label}</span>
    <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="h-5 w-5 accent-blue-600" /></label>;
}
