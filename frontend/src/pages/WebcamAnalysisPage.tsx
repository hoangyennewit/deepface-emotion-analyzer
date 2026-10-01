import React, { useEffect, useRef, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import {
  analyzeWebcamFrame,
  getWebcamSettings,
  updateWebcamSettings,
  type WebcamSettings,
} from '../services/api';

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

export const WebcamAnalysisPage: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [isMicOn, setIsMicOn] = useState<boolean>(true);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  const [settings, setSettings] = useState<WebcamSettings>({
    camera_id: 'default',
    resolution: '720p',
    fps: 30,
    show_face_box: true,
    show_emotion_rate: true,
    auto_save: true,
  });

  const [currentFace, setCurrentFace] = useState<{
    dominant: string;
    confidence: number;
    scores: Record<string, number>;
    bbox: [number, number, number, number];
  } | null>(null);

  // Load webcam settings from API
  useEffect(() => {
    getWebcamSettings().then(setSettings).catch(console.error);
  }, []);

  // Start webcam stream
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: isMicOn,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (err) {
      console.error('Không mở được camera:', err);
      alert('Không thể truy cập camera. Vui lòng cấp quyền truy cập trình duyệt.');
    }
  };

  // Stop webcam stream
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setIsDetecting(false);
    setCurrentFace(null);
  };

  // Realtime detection loop
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isStreaming && isDetecting) {
      timer = setInterval(async () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx || video.videoWidth === 0) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(async (blob) => {
          if (!blob) return;
          try {
            const data = await analyzeWebcamFrame(blob);
            if (data.success && data.faces.length > 0) {
              const f = data.faces[0];
              setCurrentFace({
                dominant: f.dominant_emotion,
                confidence: f.confidence,
                scores: f.emotion_scores || {},
                bbox: f.bbox,
              });
            }
          } catch (e) {
            console.error('Frame detect err:', e);
          }
        }, 'image/jpeg', 0.8);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isStreaming, isDetecting]);

  const handleSaveSettings = async (newSettings: Partial<WebcamSettings>) => {
    try {
      const updated = await updateWebcamSettings(newSettings);
      setSettings(updated);
    } catch (e) {
      console.error('Update webcam settings err:', e);
    }
  };

  // Pie chart data
  const pieData = currentFace
    ? Object.entries(currentFace.scores)
        .map(([k, v]) => ({
          name: EMOTION_LABELS[k] || k,
          value: Math.round(v),
          rawKey: k,
        }))
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value)
    : [
        { name: 'Hạnh phúc', value: 70, rawKey: 'happy' },
        { name: 'Bình thường', value: 20, rawKey: 'neutral' },
        { name: 'Buồn', value: 10, rawKey: 'sad' },
      ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0F254A' }}>
          Webcam trực tiếp
        </h1>
        <button
          onClick={() => setShowSettingsModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#334155',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}
        >
          <span>⚙️</span> Cài đặt Webcam
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '28px', alignItems: 'start' }}>
        {/* Left: Video Camera Feed & Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '420px',
              backgroundColor: '#0F172A',
              borderRadius: '16px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <video
              ref={videoRef}
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: isStreaming ? 'block' : 'none',
              }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {!isStreaming && (
              <div style={{ color: '#94A3B8', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>📹</div>
                <div style={{ fontSize: '15px', fontWeight: 500 }}>Nhấn nút Camera bên dưới để bật webcam</div>
              </div>
            )}

            {/* Live Bounding Box Tag */}
            {isStreaming && isDetecting && currentFace && settings.show_face_box && (
              <div
                style={{
                  position: 'absolute',
                  top: '25%',
                  left: '35%',
                  width: '30%',
                  height: '45%',
                  border: '2px solid #22C55E',
                  borderRadius: '6px',
                  pointerEvents: 'none',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '-26px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#22C55E',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '2px 10px',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {currentFace.dominant} {Math.round(currentFace.confidence * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* Controls Bar */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '12px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '24px',
              border: '1px solid #E2E8F0',
            }}
          >
            {/* Toggle Camera */}
            <button
              onClick={isStreaming ? stopCamera : startCamera}
              title={isStreaming ? 'Tắt Camera' : 'Bật Camera'}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: isStreaming ? '#EFF6FF' : '#F1F5F9',
                color: isStreaming ? '#2563EB' : '#64748B',
                fontSize: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              📹
            </button>

            {/* Big Red Record/Detect toggle */}
            <button
              onClick={() => {
                if (!isStreaming) startCamera();
                setIsDetecting(!isDetecting);
              }}
              title={isDetecting ? 'Dừng nhận diện' : 'Bắt đầu nhận diện'}
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: isDetecting ? '#DC2626' : '#EF4444',
                color: '#FFFFFF',
                fontSize: '22px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
              }}
            >
              {isDetecting ? '⏹' : '▶'}
            </button>

            {/* Toggle Mic */}
            <button
              onClick={() => setIsMicOn(!isMicOn)}
              title={isMicOn ? 'Tắt Mic' : 'Bật Mic'}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: isMicOn ? '#EFF6FF' : '#F1F5F9',
                color: isMicOn ? '#2563EB' : '#64748B',
                fontSize: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              🎤
            </button>
          </div>

          {/* Status Label */}
          <div style={{ textAlign: 'center', fontSize: '13px', color: '#16A34A', fontWeight: 600 }}>
            {isDetecting ? '● Đang nhận diện cảm xúc...' : '● Sẵn sàng nhận diện'}
          </div>
        </div>

        {/* Right: Realtime Emotion Results & Pie Chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Card 1: Kết quả hiện tại */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0F254A' }}>
              Kết quả hiện tại
            </h3>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '12px',
                  backgroundColor: '#EFF6FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  border: '2px solid #BFDBFE',
                }}
              >
                👤
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(currentFace ? Object.entries(currentFace.scores).sort(([, a], [, b]) => b - a).slice(0, 3) : [
                  ['happy', 88],
                  ['neutral', 30],
                  ['sad', 5],
                ]).map(([em, val]) => (
                  <div key={em} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 35px', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: EMOTION_COLORS[em] || '#64748B', fontWeight: 600 }}>
                      {EMOTION_LABELS[em] || em}
                    </span>
                    <div style={{ height: '6px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, Math.max(0, Number(val)))}%`,
                          backgroundColor: EMOTION_COLORS[em] || '#3B82F6',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748B', textAlign: 'right' }}>
                      {Math.round(Number(val))}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2: Biểu đồ cảm xúc qua webcam */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0F254A' }}>
              Biểu đồ cảm xúc qua webcam
            </h3>
            <div style={{ width: '100%', height: '240px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={40}
                    label={({ name, percent }) => `${name} ${(((percent as number) ?? 0) * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
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
      </div>

      {/* Frame 14: Modal Cài đặt Webcam */}
      {showSettingsModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '24px',
              width: '380px',
              maxWidth: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F254A' }}>Cài đặt Webcam</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            {/* Camera Select */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Chọn camera</label>
              <select
                value={settings.camera_id}
                onChange={(e) => handleSaveSettings({ camera_id: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}
              >
                <option value="default">Camera mặc định</option>
                <option value="usb">USB Camera / FaceTime HD</option>
              </select>
            </div>

            {/* Resolution Select */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Độ phân giải</label>
              <select
                value={settings.resolution}
                onChange={(e) => handleSaveSettings({ resolution: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}
              >
                <option value="720p">720p HD</option>
                <option value="1080p">1080p Full HD</option>
              </select>
            </div>

            {/* FPS Select */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Tốc độ khung hình (FPS)</label>
              <select
                value={settings.fps}
                onChange={(e) => handleSaveSettings({ fps: Number(e.target.value) })}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}
              >
                <option value="15">15 FPS</option>
                <option value="30">30 FPS</option>
              </select>
            </div>

            {/* Toggles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontSize: '14px', color: '#334155' }}>
                <span>Hiện khung mặt</span>
                <input
                  type="checkbox"
                  checked={settings.show_face_box}
                  onChange={(e) => handleSaveSettings({ show_face_box: e.target.checked })}
                  style={{ width: '18px', height: '18px' }}
                />
              </label>

              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontSize: '14px', color: '#334155' }}>
                <span>Hiện tỉ lệ cảm xúc</span>
                <input
                  type="checkbox"
                  checked={settings.show_emotion_rate}
                  onChange={(e) => handleSaveSettings({ show_emotion_rate: e.target.checked })}
                  style={{ width: '18px', height: '18px' }}
                />
              </label>

              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontSize: '14px', color: '#334155' }}>
                <span>Lưu kết quả tự động</span>
                <input
                  type="checkbox"
                  checked={settings.auto_save}
                  onChange={(e) => handleSaveSettings({ auto_save: e.target.checked })}
                  style={{ width: '18px', height: '18px' }}
                />
              </label>
            </div>

            <button
              onClick={() => setShowSettingsModal(false)}
              style={{
                marginTop: '10px',
                padding: '10px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
