import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { getUserProfile, type UserProfile } from '../../services/api';

const navItems = [
  { path: '/', label: 'Trang chủ', icon: '🏠' },
  { path: '/image-analysis', label: 'Phân tích ảnh', icon: '🖼️' },
  { path: '/video-analysis', label: 'Phân tích video', icon: '🎥' },
  { path: '/webcam-analysis', label: 'Phân tích WebCam', icon: '📹' },
  { path: '/history', label: 'Lịch sử', icon: '🕒' },
  { path: '/settings', label: 'Cài đặt', icon: '⚙️' },
];

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const [profile, setProfile] = useState<UserProfile>({
    name: 'Nguyễn Văn A',
    email: 'nguyenvana@gmail.com',
    avatar: '',
    role: 'User',
  });

  useEffect(() => {
    getUserProfile()
      .then((data) => setProfile(data))
      .catch((err) => console.log('Fetch profile err, using fallback:', err));
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', backgroundColor: '#F8FAFC', color: '#0F172A', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: '240px',
          minWidth: '240px',
          backgroundColor: '#0F254A',
          color: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          padding: '24px 16px',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px 32px 8px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: '#1E3A8A',
              border: '2px solid #38BDF8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              boxShadow: '0 0 12px rgba(56, 189, 248, 0.4)',
            }}
          >
            🤖
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.3px', color: '#FFFFFF' }}>EmotionAI</div>
            <div style={{ fontSize: '11px', color: '#93C5FD' }}>DeepFace Analyzer</div>
          </div>
        </div>

        {/* Navigation list */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          {navItems.map((item) => {
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 16px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 500,
                  backgroundColor: isActive ? '#2563EB' : 'transparent',
                  color: isActive ? '#FFFFFF' : '#94A3B8',
                  transition: 'all 0.15s ease-in-out',
                }}
              >
                <span style={{ fontSize: '17px' }}>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh' }}>
        {/* Top Header */}
        <header
          style={{
            height: '64px',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '0 32px',
            gap: '20px',
            boxSizing: 'border-box',
          }}
        >
          {/* Notification bell */}
          <button
            type="button"
            title="Thông báo"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: '#64748B',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            🔔
          </button>

          {/* User profile */}
          <NavLink
            to="/settings"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              color: '#0F172A',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#FDBA74',
                color: '#9A3412',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 600,
                overflow: 'hidden',
              }}
            >
              {profile.avatar ? (
                <img src={profile.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                '👤'
              )}
            </div>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>{profile.name}</span>
          </NavLink>
        </header>

        {/* Dynamic Route Content */}
        <main style={{ flex: 1, padding: '24px 32px', boxSizing: 'border-box' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
