import React from 'react';
import { useNavigate } from 'react-router-dom';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Hero Banner */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '44px 48px',
          display: 'grid',
          gridTemplateColumns: '1.2fr 0.8fr',
          gap: '40px',
          alignItems: 'center',
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
          border: '1px solid #F1F5F9',
        }}
      >
        <div>
          <h1
            style={{
              margin: '0 0 16px 0',
              fontSize: '34px',
              fontWeight: 800,
              color: '#0F254A',
              lineHeight: 1.25,
              letterSpacing: '-0.5px',
            }}
          >
            Phân tích cảm xúc khuôn mặt bằng AI
          </h1>
          <p
            style={{
              margin: '0 0 32px 0',
              fontSize: '16px',
              color: '#64748B',
              lineHeight: 1.6,
            }}
          >
            Nhận diện và phân tích cảm xúc từ hình ảnh hoặc video bằng DeepFace và FER.
          </p>

          {/* Action buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
            <button
              onClick={() => navigate('/image-analysis')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                borderRadius: '8px',
                border: 'none',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              }}
            >
              <span>📷</span> Phân tích ảnh
            </button>

            <button
              onClick={() => navigate('/video-analysis')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                backgroundColor: '#EFF6FF',
                color: '#2563EB',
                borderRadius: '8px',
                border: '1px solid #BFDBFE',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <span>🎥</span> Phân tích video
            </button>

            <button
              onClick={() => navigate('/webcam-analysis')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                backgroundColor: '#0F254A',
                color: '#FFFFFF',
                borderRadius: '8px',
                border: 'none',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <span>📹</span> Phân tích WebCam
            </button>
          </div>
        </div>

        {/* Biometric Face Illustration */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div
            style={{
              position: 'relative',
              width: '240px',
              height: '240px',
              backgroundColor: '#EFF6FF',
              borderRadius: '24px',
              border: '2px dashed #93C5FD',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Scan corners */}
            <div style={{ position: 'absolute', top: '10px', left: '10px', width: '24px', height: '24px', borderTop: '4px solid #2563EB', borderLeft: '4px solid #2563EB' }} />
            <div style={{ position: 'absolute', top: '10px', right: '10px', width: '24px', height: '24px', borderTop: '4px solid #2563EB', borderRight: '4px solid #2563EB' }} />
            <div style={{ position: 'absolute', bottom: '10px', left: '10px', width: '24px', height: '24px', borderBottom: '4px solid #2563EB', borderLeft: '4px solid #2563EB' }} />
            <div style={{ position: 'absolute', bottom: '10px', right: '10px', width: '24px', height: '24px', borderBottom: '4px solid #2563EB', borderRight: '4px solid #2563EB' }} />

            <div style={{ fontSize: '96px', filter: 'drop-shadow(0 8px 16px rgba(37, 99, 235, 0.2))' }}>
              👤
            </div>
          </div>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        {/* Card 1 */}
        <div
          onClick={() => navigate('/image-analysis')}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '28px',
            border: '1px solid #E2E8F0',
            cursor: 'pointer',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              marginBottom: '16px',
            }}
          >
            😊
          </div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700, color: '#0F254A' }}>
            Nhận diện cảm xúc
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748B', lineHeight: 1.5 }}>
            Xác định cảm xúc: Happy, Neutral, Sad, Angry, Surprised, Fearful...
          </p>
        </div>

        {/* Card 2 */}
        <div
          onClick={() => navigate('/webcam-analysis')}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '28px',
            border: '1px solid #E2E8F0',
            cursor: 'pointer',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              marginBottom: '16px',
            }}
          >
            🔒
          </div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700, color: '#0F254A' }}>
            Nhận diện khuôn mặt
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748B', lineHeight: 1.5 }}>
            Phát hiện và định vị khuôn mặt trong ảnh, video và webcam trực tiếp.
          </p>
        </div>

        {/* Card 3 */}
        <div
          onClick={() => navigate('/history')}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '28px',
            border: '1px solid #E2E8F0',
            cursor: 'pointer',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              marginBottom: '16px',
            }}
          >
            📊
          </div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700, color: '#0F254A' }}>
            Thống kê kết quả
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748B', lineHeight: 1.5 }}>
            Biểu đồ tỉ lệ cảm xúc, phân tích timeline và lưu trữ lịch sử phiên làm việc.
          </p>
        </div>
      </div>
    </div>
  );
};
