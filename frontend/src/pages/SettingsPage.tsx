import React, { useEffect, useState } from 'react';
import {
  getUserProfile,
  updateUserProfile,
  getSystemSettings,
  updateSystemSettings,
  type UserProfile,
  type SystemSettings,
} from '../services/api';

export const SettingsPage: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>({
    name: 'Nguyễn Văn A',
    email: 'nguyenvana@gmail.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NguyenVanA',
    role: 'User',
  });

  const [settings, setSettings] = useState<SystemSettings>({
    language: 'Tiếng Việt',
    theme: 'Sáng',
    auto_save: true,
    face_detector_model: 'DeepFace (SSD/OpenCV)',
    emotion_analysis_model: 'DeepFace (Keras)',
  });

  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);

  const [editName, setEditName] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');

  useEffect(() => {
    getUserProfile().then((p) => {
      setProfile(p);
      setEditName(p.name);
      setEditEmail(p.email);
    }).catch(console.error);

    getSystemSettings().then(setSettings).catch(console.error);
  }, []);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setStatusMessage('');
    try {
      const updated = await updateUserProfile({ name: editName, email: editEmail });
      setProfile(updated);
      setIsEditingProfile(false);
      setStatusMessage('Cập nhật hồ sơ thành công!');
    } catch (err: any) {
      alert(err.message || 'Lỗi khi cập nhật hồ sơ');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveSettings = async (updates: Partial<SystemSettings>) => {
    setIsSavingSettings(true);
    setStatusMessage('');
    try {
      const updated = await updateSystemSettings(updates);
      setSettings(updated);
      setStatusMessage('Đã lưu cấu hình cài đặt!');
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu cài đặt');
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0F254A' }}>
        Cài đặt
      </h1>

      {statusMessage && (
        <div style={{ padding: '12px 16px', backgroundColor: '#DCFCE7', color: '#16A34A', borderRadius: '8px', fontSize: '14px', fontWeight: 600 }}>
          ✓ {statusMessage}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px', alignItems: 'start' }}>
        {/* Card 1: Thông tin tài khoản */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '32px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F254A', alignSelf: 'flex-start' }}>
            Thông tin tài khoản
          </h3>

          {/* Large Avatar */}
          <div
            style={{
              width: '104px',
              height: '104px',
              borderRadius: '50%',
              backgroundColor: '#FED7AA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '52px',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(251, 146, 60, 0.25)',
              border: '3px solid #FB923C',
            }}
          >
            {profile.avatar ? (
              <img src={profile.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              '👤'
            )}
          </div>

          {isEditingProfile ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Họ và tên"
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}
              />
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="Email"
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}
              />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile}
                  style={{ padding: '8px 16px', backgroundColor: '#2563EB', color: '#FFF', borderRadius: '8px', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                >
                  {isSavingProfile ? 'Đang lưu...' : 'Lưu'}
                </button>
                <button
                  onClick={() => setIsEditingProfile(false)}
                  style={{ padding: '8px 16px', backgroundColor: '#F1F5F9', color: '#475569', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                >
                  Hủy
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F254A' }}>{profile.name}</div>
              <div style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>{profile.email}</div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
            <button
              onClick={() => alert('Chức năng đổi mật khẩu đang hoạt động trên hệ thống.')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <span>🔒</span> Đổi mật khẩu
            </button>

            <button
              onClick={() => setIsEditingProfile(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <span>✏️</span> Cập nhật thông tin
            </button>

            <button
              onClick={() => {
                if (window.confirm('Bạn có muốn đăng xuất khỏi phiên làm việc?')) {
                  alert('Đã đăng xuất.');
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#FEE2E2',
                color: '#DC2626',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <span>🚪</span> Đăng xuất
            </button>
          </div>
        </div>

        {/* Column 2: Cài đặt chung & Cài đặt AI */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Cài đặt chung */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F254A' }}>
                Cài đặt chung
              </h3>
              {isSavingSettings && <span style={{ fontSize: '12px', color: '#2563EB' }}>Đang lưu...</span>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Ngôn ngữ</label>
              <select
                value={settings.language}
                onChange={(e) => handleSaveSettings({ language: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}
              >
                <option value="Tiếng Việt">Tiếng Việt</option>
                <option value="English">English</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Chế độ giao diện</label>
              <select
                value={settings.theme}
                onChange={(e) => handleSaveSettings({ theme: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}
              >
                <option value="Sáng">Sáng</option>
                <option value="Tối">Tối</option>
              </select>
            </div>

            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontSize: '14px', color: '#334155', marginTop: '6px' }}>
              <span>Lưu kết quả tự động</span>
              <input
                type="checkbox"
                checked={settings.auto_save}
                onChange={(e) => handleSaveSettings({ auto_save: e.target.checked })}
                style={{ width: '18px', height: '18px' }}
              />
            </label>
          </div>

          {/* Cài đặt AI */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F254A' }}>
              Cài đặt AI
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Model nhận diện khuôn mặt</label>
              <select
                value={settings.face_detector_model}
                onChange={(e) => handleSaveSettings({ face_detector_model: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}
              >
                <option value="DeepFace (SSD/OpenCV)">DeepFace (SSD/OpenCV)</option>
                <option value="RetinaFace">RetinaFace</option>
                <option value="MTCNN">MTCNN</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Model phân tích cảm xúc</label>
              <select
                value={settings.emotion_analysis_model}
                onChange={(e) => handleSaveSettings({ emotion_analysis_model: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}
              >
                <option value="DeepFace (Keras)">DeepFace (Keras)</option>
                <option value="FER (ResNet)">FER (ResNet)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
