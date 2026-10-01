import React, { useState, useRef } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { analyzeImage, type ImageAnalysisResult } from '../services/api';

const EMOTION_COLORS: Record<string, string> = {
  happy: '#22C55E',
  neutral: '#3B82F6',
  sad: '#6366F1',
  angry: '#EF4444',
  surprise: '#F59E0B',
  surprised: '#F59E0B',
  fear: '#9333EA',
  fearful: '#9333EA',
  disgust: '#84CC16',
  disgusted: '#84CC16',
};

const EMOTION_LABELS: Record<string, string> = {
  happy: 'Hạnh phúc',
  neutral: 'Bình thường',
  sad: 'Buồn',
  angry: 'Giận dữ',
  surprise: 'Ngạc nhiên',
  surprised: 'Ngạc nhiên',
  fear: 'Sợ hãi',
  fearful: 'Sợ hãi',
  disgust: 'Ghê tởm',
  disgusted: 'Ghê tởm',
};

export const ImageAnalysisPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [result, setResult] = useState<ImageAnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setErrorMsg('');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setErrorMsg('');
    }
  };

  const handleStartAnalysis = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    setErrorMsg('');
    try {
      const res = await analyzeImage(selectedFile);
      setResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi phân tích ảnh.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Sample quick load for testing
  const loadSample = async (url: string, name: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], name, { type: 'image/jpeg' });
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setErrorMsg('');
    } catch (e) {
      console.log('Sample load error:', e);
    }
  };

  // Aggregate pie chart data across detected faces
  const getPieChartData = () => {
    if (!result || !result.face_emotions || result.face_emotions.length === 0) return [];
    const totals: Record<string, number> = {};
    for (const f of result.face_emotions) {
      for (const [em, score] of Object.entries(f.emotion || {})) {
        totals[em] = (totals[em] || 0) + score;
      }
    }
    const sum = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(totals)
      .map(([k, v]) => ({
        name: EMOTION_LABELS[k] || k,
        value: Math.round((v / sum) * 100),
        rawKey: k,
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0F254A' }}>
        Phân tích ảnh
      </h1>

      {errorMsg && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FEE2E2', color: '#DC2626', borderRadius: '8px', fontSize: '14px' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {!result ? (
        /* UPLOAD STATE (Desktop - 2) */
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '28px', alignItems: 'start' }}>
          {/* Left Dropzone Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '2px dashed #93C5FD',
                padding: '48px 32px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                textAlign: 'center',
                minHeight: '340px',
                boxSizing: 'border-box',
              }}
            >
              {previewUrl ? (
                <div style={{ position: 'relative', width: '100%', maxHeight: '280px', display: 'flex', justifyContent: 'center' }}>
                  <img src={previewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '280px', borderRadius: '12px', objectFit: 'contain' }} />
                </div>
              ) : (
                <>
                  <div style={{ width: '72px', height: '72px', borderRadius: '16px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px' }}>
                    🖼️
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#1E293B' }}>
                    Kéo thả ảnh vào đây
                    <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 400, marginTop: '4px' }}>hoặc</div>
                  </div>
                </>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <span>📷</span> {selectedFile ? 'Chọn ảnh khác' : 'Chọn hình ảnh'}
              </button>

              <span style={{ fontSize: '12px', color: '#94A3B8' }}>Hỗ trợ định dạng: JPG, PNG, WEBP</span>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleStartAnalysis}
              disabled={!selectedFile || isAnalyzing}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: !selectedFile || isAnalyzing ? '#93C5FD' : '#2563EB',
                color: '#FFFFFF',
                borderRadius: '8px',
                border: 'none',
                fontSize: '15px',
                fontWeight: 600,
                cursor: !selectedFile || isAnalyzing ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <span>🔍</span> {isAnalyzing ? 'Đang phân tích...' : 'Phân tích'}
            </button>
          </div>

          {/* Right Guide & Samples */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Guide Card */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0F254A' }}>Hướng dẫn</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#2563EB', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700 }}>
                    1
                  </div>
                  <span style={{ fontSize: '14px', color: '#334155' }}>Chọn hoặc kéo thả ảnh</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#2563EB', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700 }}>
                    2
                  </div>
                  <span style={{ fontSize: '14px', color: '#334155' }}>Nhấn nút "Phân tích"</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#2563EB', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700 }}>
                    3
                  </div>
                  <span style={{ fontSize: '14px', color: '#334155' }}>Xem kết quả ở bên phải</span>
                </div>
              </div>
            </div>

            {/* Sample Images Card */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
              <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', fontWeight: 700, color: '#0F254A' }}>Ví dụ ảnh</h3>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div
                  onClick={() => loadSample('https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80', 'sample_girl.jpg')}
                  style={{ width: '84px', height: '84px', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', border: '2px solid #E2E8F0' }}
                  title="Nhấn để thử ảnh mẫu 1"
                >
                  <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80" alt="Sample 1" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div
                  onClick={() => loadSample('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80', 'sample_man.jpg')}
                  style={{ width: '84px', height: '84px', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', border: '2px solid #E2E8F0' }}
                  title="Nhấn để thử ảnh mẫu 2"
                >
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80" alt="Sample 2" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* RESULT STATE (Desktop - 3) */
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '28px', alignItems: 'start' }}>
          {/* Left Column: Image with Bounding Boxes + Pie Chart */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F254A' }}>Ảnh gốc</h3>
                <button
                  onClick={() => {
                    setResult(null);
                    setSelectedFile(null);
                    setPreviewUrl('');
                  }}
                  style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  + Phân tích ảnh khác
                </button>
              </div>

              {/* Image Preview with Bounding Box overlays */}
              <div style={{ position: 'relative', width: '100%', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#000000' }}>
                <img
                  src={previewUrl}
                  alt="Original with boxes"
                  style={{ display: 'block', width: '100%', height: 'auto', maxHeight: '420px', objectFit: 'contain' }}
                />
                {result.face_emotions.map((face, idx) => {
                  if (!face.bbox) return null;
                  return (
                    <div
                      key={idx}
                      style={{
                        position: 'absolute',
                        border: '2px solid #22C55E',
                        left: `${Math.max(10, (idx * 30 + 15))}%`,
                        top: '20%',
                        width: '28%',
                        height: '45%',
                        boxSizing: 'border-box',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: '-26px',
                          left: '-2px',
                          backgroundColor: '#22C55E',
                          color: '#FFFFFF',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {face.dominate_emotion} {Math.round(face.confidence * 100)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pie Chart: Biểu đồ cảm xúc tổng thể */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E2E8F0' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0F254A' }}>
                Biểu đồ cảm xúc tổng thể
              </h3>
              <div style={{ width: '100%', height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getPieChartData()}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={45}
                      label={({ name, percent }) => `${name} ${(((percent as number) ?? 0) * 100).toFixed(0)}%`}
                    >
                      {getPieChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={EMOTION_COLORS[entry.rawKey] || '#3B82F6'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right Column: KẾT QUẢ PHÂN TÍCH */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800, color: '#0F254A' }}>
                KẾT QUẢ PHÂN TÍCH
              </h2>
              <div style={{ fontSize: '14px', color: '#64748B', fontWeight: 500 }}>
                Số khuôn mặt: <strong style={{ color: '#0F254A' }}>{result.total_faces}</strong>
              </div>
            </div>

            {/* Per-face Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {result.face_emotions.map((face, idx) => (
                <div
                  key={idx}
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    gap: '16px',
                    alignItems: 'center',
                  }}
                >
                  {/* Face Crop avatar */}
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '12px',
                      backgroundColor: '#EFF6FF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '28px',
                      border: '2px solid #BFDBFE',
                      overflow: 'hidden',
                    }}
                  >
                    👤
                  </div>

                  {/* Emotion bars */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F254A' }}>
                      Người {idx + 1}
                    </div>

                    {Object.entries(face.emotion || {})
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 3)
                      .map(([em, val]) => (
                        <div key={em} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 35px', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', color: EMOTION_COLORS[em] || '#64748B', fontWeight: 600 }}>
                            {EMOTION_LABELS[em] || em}
                          </span>
                          <div style={{ height: '6px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, val))}%`, backgroundColor: EMOTION_COLORS[em] || '#3B82F6', borderRadius: '4px' }} />
                          </div>
                          <span style={{ fontSize: '11px', color: '#64748B', textAlign: 'right' }}>
                            {Math.round(val)}%
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
