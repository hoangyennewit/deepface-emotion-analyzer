import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { getHistoryDetail, type HistoryItem } from '../services/api';

const EMOTION_COLORS: Record<string, string> = {
  happy: '#22C55E',
  neutral: '#3B82F6',
  sad: '#6366F1',
  angry: '#EF4444',
  surprised: '#F59E0B',
  surprise: '#F59E0B',
  fearful: '#9333EA',
  fear: '#9333EA',
  disgusted: '#84CC16',
  disgust: '#84CC16',
};

const EMOTION_LABELS: Record<string, string> = {
  happy: 'Hạnh phúc',
  neutral: 'Bình thường',
  sad: 'Buồn',
  angry: 'Giận dữ',
  surprised: 'Ngạc nhiên',
  surprise: 'Ngạc nhiên',
  fearful: 'Sợ hãi',
  fear: 'Sợ hãi',
  disgusted: 'Ghê tởm',
  disgust: 'Ghê tởm',
};

export const HistoryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<HistoryItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    getHistoryDetail(id)
      .then(setRecord)
      .catch((err) => setErrorMsg(err.message || 'Không tìm thấy bản ghi.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#64748B' }}>
        Đang tải thông tin chi tiết...
      </div>
    );
  }

  if (errorMsg || !record) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <p style={{ color: '#DC2626', marginBottom: '16px' }}>{errorMsg || 'Không tìm thấy dữ liệu.'}</p>
        <button
          onClick={() => navigate('/history')}
          style={{ padding: '8px 16px', backgroundColor: '#2563EB', color: '#FFF', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
        >
          Quay lại Lịch sử
        </button>
      </div>
    );
  }

  const chartData = (record.timeline || []).map((item) => ({
    time: `${Math.floor(item.time / 60)}:${(item.time % 60).toString().padStart(2, '0')}`,
    ...item.emotions,
  }));

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Back Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          onClick={() => navigate('/history')}
          style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748B' }}
        >
          ←
        </button>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0F254A' }}>
          Kết quả phân tích chi tiết
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '28px', alignItems: 'start' }}>
        {/* Left Column: Media Preview + Emotion Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Media preview card */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E2E8F0' }}>
            <div
              style={{
                width: '100%',
                height: '240px',
                backgroundColor: '#0F172A',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94A3B8',
                fontSize: '48px',
              }}
            >
              ▶
            </div>
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F254A' }}>{record.filename}</span>
              <span style={{ fontSize: '12px', color: '#64748B' }}>{record.created_at}</span>
            </div>
          </div>

          {/* Emotion Timeline Chart */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0F254A' }}>
              Emotion Timeline
            </h3>
            <div style={{ width: '100%', height: '260px' }}>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(value, name) => [`${value}%`, EMOTION_LABELS[String(name)] || name]} />
                    <Legend formatter={(value) => EMOTION_LABELS[String(value)] || value} />
                    <Line type="monotone" dataKey="happy" stroke="#22C55E" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="neutral" stroke="#3B82F6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="sad" stroke="#6366F1" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', color: '#94A3B8', paddingTop: '100px' }}>
                  Không có dữ liệu timeline
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Tổng quan, Tỉ lệ cảm xúc, Số khuôn mặt */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Card: Tổng quan (3 Metrics) */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0F254A' }}>
              Tổng quan
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div style={{ backgroundColor: '#EFF6FF', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#2563EB' }}>{record.total_faces}</div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Khuôn mặt</div>
              </div>

              <div style={{ backgroundColor: '#DCFCE7', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#16A34A' }}>{record.positive_rate}%</div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Tích cực</div>
              </div>

              <div style={{ backgroundColor: '#F1F5F9', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#475569' }}>{record.duration}</div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Thời lượng</div>
              </div>
            </div>
          </div>

          {/* Card: Tỉ lệ cảm xúc tổng thể */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0F254A' }}>
              Tỉ lệ cảm xúc tổng thể
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(record.emotion_summary || {})
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([em, val]) => (
                  <div key={em} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 45px', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: EMOTION_COLORS[em] || '#334155' }}>
                      {EMOTION_LABELS[em] || em}
                    </span>
                    <div style={{ height: '8px', backgroundColor: '#E2E8F0', borderRadius: '6px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, Math.max(0, val))}%`,
                          backgroundColor: EMOTION_COLORS[em] || '#3B82F6',
                          borderRadius: '6px',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '12px', color: '#64748B', textAlign: 'right' }}>
                      {Math.round(val)}%
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Card: Số khuôn mặt detected */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0F254A' }}>
              Số khuôn mặt ({record.total_faces})
            </h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {(record.faces && record.faces.length > 0 ? record.faces : [1, 2]).map((f: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '12px',
                    backgroundColor: '#EFF6FF',
                    border: '2px solid #BFDBFE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                  }}
                  title={f.dominantEmotion ? `${f.dominantEmotion} ${f.confidence}%` : `Người ${idx + 1}`}
                >
                  👤
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
