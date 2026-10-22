import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import {
  getWebcamSettings,
  updateWebcamSettings,
  type WebcamSettings,
} from '../services/api';
import { analyzeWebcamFrameLive, ApiError } from '../services/historyApi';
import { toSampleFaces, useWebcamRecorder } from '../hooks/useWebcamRecorder';
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

const topEmotion = (scores: Record<string, number>): string =>
  Object.entries(scores).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'neutral';

// Điểm trung bình của tất cả khuôn mặt đang thấy
const averageScores = (list: Record<string, number>[]): Record<string, number> => {
  const totals: Record<string, number> = {};
  list.forEach((scores) =>
    Object.entries(scores).forEach(([k, v]) => {
      totals[k] = (totals[k] ?? 0) + Number(v);
    })
  );
  const n = Math.max(list.length, 1);
  return Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v / n]));
};

// Tối đa số khuôn mặt hiện chi tiết ở ô "Kết quả hiện tại"
const MAX_FACES_LISTED = 4;

interface LiveFace {
  dominant: string;
  scores: Record<string, number>;
  bbox: number[] | null;
}

export const WebcamAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const busyRef = useRef(false); // đang chờ kết quả của frame trước

  const { recording, saving, start: startRecording, addSample, stopAndSave } = useWebcamRecorder();

  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [mirrored, setMirrored] = useState<boolean>(true); // hiển thị như soi gương
  const [videoAspect, setVideoAspect] = useState<string>('16 / 9');
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string>('');
  const [analysisError, setAnalysisError] = useState<string>('');

  const [settings, setSettings] = useState<WebcamSettings>({
    camera_id: 'default',
    resolution: '720p',
    fps: 30,
    show_face_box: true,
    show_emotion_rate: true,
    auto_save: true,
  });

  // Tất cả khuôn mặt thấy được ở frame mới nhất
  const [currentFaces, setCurrentFaces] = useState<LiveFace[]>([]);
  const [frameSize, setFrameSize] = useState({ width: 1280, height: 720 });

  // Load webcam settings from API
  useEffect(() => {
    getWebcamSettings().then(setSettings).catch(console.error);
  }, []);

  // Rời trang thì tắt camera, tránh để camera chạy ngầm
  useEffect(() => {
    const video = videoRef.current;
    return () => {
      (video?.srcObject as MediaStream | null)?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // Start webcam stream
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // Nhận diện chỉ lấy 1 frame/giây nên 24 fps là đủ, giảm tải mã hóa khi ghi video
        video: { width: 1280, height: 720, frameRate: { ideal: 24, max: 24 } },
        audio: false, // không cần âm thanh, đỡ tốn CPU khi ghi video
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
    setCurrentFaces([]);
  };

  // Kết thúc ghi và lưu phiên (phải gọi trước khi dừng stream)
  const finishRecording = async () => {
    if (!recording) return;
    try {
      const result = await stopAndSave(`Webcam ${new Date().toLocaleString('vi-VN')}`);
      if (result) setSavedSessionId(result.session_id);
      else setSaveError('Phiên dưới 1 giây nên chưa được lưu. Hãy nhận diện lâu hơn.');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Không lưu được phiên vào lịch sử.');
    }
  };

  const handleStartDetect = async () => {
    setSavedSessionId(null);
    setSaveError('');
    setAnalysisError('');
    busyRef.current = false;
    if (!isStreaming) await startCamera();

    const stream = videoRef.current?.srcObject;
    if (!(stream instanceof MediaStream)) return; // camera chưa mở được

    if (settings.auto_save) {
      try {
        startRecording(stream);
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : 'Không bắt đầu ghi được video.');
      }
    }
    setIsDetecting(true);
  };

  const handleStopDetect = async () => {
    setIsDetecting(false);
    await finishRecording();
  };

  const handleStopCamera = async () => {
    setIsDetecting(false);
    await finishRecording();
    stopCamera();
  };

  // Realtime detection loop
  useEffect(() => {
    if (!isStreaming || !isDetecting) return;

    const timer = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.videoWidth === 0 || busyRef.current) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Luôn chụp ảnh gốc (không lật) để gửi phân tích
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const capturedAt = performance.now();
      const frameWidth = canvas.width;
      const frameHeight = canvas.height;

      busyRef.current = true;
      canvas.toBlob(
        async (blob) => {
          try {
            if (!blob) return;
            const data = await analyzeWebcamFrameLive(blob);
            const faces = data.faces ?? [];

            const sampleFaces = toSampleFaces(faces);
            if (sampleFaces.length > 0) addSample(sampleFaces, capturedAt);

            // Giữ lại TẤT CẢ khuôn mặt, không chỉ khuôn mặt đầu tiên
            const liveFaces: LiveFace[] = faces.map((f) => {
              const scores = f.emotion ?? {};
              return {
                dominant: topEmotion(scores),
                scores,
                bbox: Array.isArray(f.bbox) && f.bbox.length === 4 ? f.bbox : null,
              };
            });
            setFrameSize({ width: frameWidth, height: frameHeight });
            setCurrentFaces(liveFaces);
            setAnalysisError('');
          } catch (e) {
            setCurrentFaces([]);
            // 400 = frame này không có khuôn mặt, không phải lỗi hệ thống
            if (!(e instanceof ApiError && e.status === 400)) {
              setAnalysisError(e instanceof Error ? e.message : 'Không phân tích được khung hình');
            }
          } finally {
            busyRef.current = false;
          }
        },
        'image/jpeg',
        0.8
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [isStreaming, isDetecting, addSample]);

  const handleSaveSettings = async (newSettings: Partial<WebcamSettings>) => {
    try {
      const updated = await updateWebcamSettings(newSettings);
      setSettings(updated);
    } catch (e) {
      console.error('Update webcam settings err:', e);
    }
  };

  // Khung mặt theo %, lật theo chiều ngang nếu video đang hiển thị dạng gương.
  // Sắp xếp từ trái sang phải theo vị trí đang nhìn thấy trên màn hình.
  const shownFaces = currentFaces
    .map((face) => {
      const b = face.bbox;
      const box = b
        ? {
            left: ((mirrored ? frameSize.width - (b[0] + b[2]) : b[0]) / frameSize.width) * 100,
            top: (b[1] / frameSize.height) * 100,
            width: (b[2] / frameSize.width) * 100,
            height: (b[3] / frameSize.height) * 100,
          }
        : null;
      return { face, box };
    })
    .sort((a, b) => (a.box?.left ?? Infinity) - (b.box?.left ?? Infinity));

  const multiple = shownFaces.length > 1;

  const avgScores = averageScores(currentFaces.map((f) => f.scores));
  const pieData = Object.entries(avgScores)
    .sort(([, a], [, b]) => b - a)
    .map(([k, v]) => ({ name: EMOTION_LABELS[k] || k, value: Math.round(v), rawKey: k }))
    .filter((d) => d.value > 0);

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
              aspectRatio: isStreaming ? videoAspect : '16 / 9',
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
              onLoadedMetadata={(e) =>
                setVideoAspect(`${e.currentTarget.videoWidth} / ${e.currentTarget.videoHeight}`)
              }
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: mirrored ? 'scaleX(-1)' : 'none',
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

            {isStreaming && (
              <button
                onClick={() => setMirrored((m) => !m)}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  border: 'none',
                  backgroundColor: 'rgba(15, 23, 42, 0.7)',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Gương: {mirrored ? 'bật' : 'tắt'}
              </button>
            )}

            {/* Khung cho từng khuôn mặt, bám theo bbox từ backend */}
            {isStreaming &&
              isDetecting &&
              settings.show_face_box &&
              shownFaces.map(({ face, box }, index) => {
                if (!box) return null;
                const color = EMOTION_COLORS[face.dominant] || '#22C55E';
                return (
                  <div
                    key={index}
                    style={{
                      position: 'absolute',
                      left: `${box.left}%`,
                      top: `${box.top}%`,
                      width: `${box.width}%`,
                      height: `${box.height}%`,
                      border: `2px solid ${color}`,
                      borderRadius: '6px',
                      pointerEvents: 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: box.top < 8 ? '2px' : '-26px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: color,
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 700,
                        padding: '2px 10px',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {multiple ? `Người ${index + 1} · ` : ''}
                      {EMOTION_LABELS[face.dominant] || face.dominant}{' '}
                      {Math.round(face.scores[face.dominant] ?? 0)}%
                    </span>
                  </div>
                );
              })}
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
              onClick={isStreaming ? () => void handleStopCamera() : startCamera}
              disabled={saving}
              title={isStreaming ? 'Tắt Camera' : 'Bật Camera'}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: isStreaming ? '#EFF6FF' : '#F1F5F9',
                color: isStreaming ? '#2563EB' : '#64748B',
                fontSize: '18px',
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              📹
            </button>

            {/* Big Red Record/Detect toggle */}
            <button
              onClick={() => void (isDetecting ? handleStopDetect() : handleStartDetect())}
              disabled={saving}
              title={isDetecting ? 'Dừng nhận diện' : 'Bắt đầu nhận diện'}
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: isDetecting ? '#DC2626' : '#EF4444',
                color: '#FFFFFF',
                fontSize: '22px',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
              }}
            >
              {isDetecting ? '⏹' : '▶'}
            </button>

          </div>

          {/* Status Label */}
          <div
            style={{
              textAlign: 'center',
              fontSize: '13px',
              fontWeight: 600,
              color: recording || saving ? '#DC2626' : '#16A34A',
            }}
          >
            {saving
              ? 'Đang lưu phiên vào lịch sử...'
              : recording
              ? '● Đang nhận diện và ghi video vào lịch sử'
              : isDetecting
              ? '● Đang nhận diện cảm xúc (không lưu lịch sử)'
              : '● Sẵn sàng nhận diện'}
          </div>

          <div style={{ textAlign: 'center', fontSize: '12px', color: '#64748B' }}>
            {settings.auto_save
              ? 'Phiên này sẽ được lưu vào lịch sử (video và kết quả).'
              : 'Phiên này sẽ không được lưu. Bật "Lưu video và kết quả vào lịch sử" trong cài đặt để lưu.'}
          </div>

          {isDetecting && currentFaces.length === 0 && !analysisError && (
            <div style={{ textAlign: 'center', fontSize: '13px', color: '#64748B' }}>
              Chưa thấy khuôn mặt. Hãy nhìn thẳng vào camera, đủ sáng.
            </div>
          )}

          {analysisError && (
            <div style={{ padding: '10px 14px', backgroundColor: '#FEE2E2', color: '#DC2626', borderRadius: '8px', fontSize: '13px' }}>
              Không phân tích được: {analysisError}
            </div>
          )}

          {savedSessionId && (
            <button
              onClick={() => navigate(`/history/${savedSessionId}`)}
              style={{
                alignSelf: 'center',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#DCFCE7',
                color: '#16A34A',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Đã lưu vào lịch sử. Xem phiên này
            </button>
          )}

          {saveError && (
            <div style={{ padding: '10px 14px', backgroundColor: '#FEE2E2', color: '#DC2626', borderRadius: '8px', fontSize: '13px' }}>
              {saveError}
            </div>
          )}
        </div>

        {/* Right: Realtime Emotion Results & Pie Chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Card 1: Kết quả hiện tại */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0F254A' }}>
              Kết quả hiện tại{multiple ? ` (${shownFaces.length} người)` : ''}
            </h3>

            {shownFaces.length === 0 ? (
              <div style={{ fontSize: '13px', color: '#94A3B8', textAlign: 'center', padding: '16px 0' }}>
                Chưa có kết quả. Bấm ▶ và nhìn vào camera.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {shownFaces.slice(0, MAX_FACES_LISTED).map(({ face }, index) => {
                  const scores = Object.entries(face.scores).sort(([, a], [, b]) => b - a);
                  return (
                    <div key={index} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          flexShrink: 0,
                          borderRadius: '12px',
                          backgroundColor: '#EFF6FF',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: multiple ? '24px' : '32px',
                          border: `2px solid ${EMOTION_COLORS[face.dominant] || '#BFDBFE'}`,
                        }}
                      >
                        👤
                        {multiple && (
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#334155' }}>
                            Người {index + 1}
                          </span>
                        )}
                      </div>

                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {scores.slice(0, 3).map(([em, val]) => (
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
                  );
                })}
                {shownFaces.length > MAX_FACES_LISTED && (
                  <div style={{ fontSize: '12px', color: '#94A3B8', textAlign: 'center' }}>
                    và {shownFaces.length - MAX_FACES_LISTED} người khác
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card 2: Biểu đồ cảm xúc qua webcam */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0F254A' }}>
              Biểu đồ cảm xúc qua webcam{multiple ? ' (trung bình)' : ''}
            </h3>
            <div style={{ width: '100%', height: '240px' }}>
              {pieData.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#94A3B8' }}>
                  Chưa có dữ liệu
                </div>
              ) : (
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
              )}
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
                <span>Lưu video và kết quả vào lịch sử</span>
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