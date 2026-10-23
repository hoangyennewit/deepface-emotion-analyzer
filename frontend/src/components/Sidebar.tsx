import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Image, Video, Camera, History, Settings, Brain } from 'lucide-react';


const menuItems = [
  // ... (giữ nguyên phần danh sách menu này) ...
  { name: 'Trang chủ', path: '/', icon: Home },
  { name: 'Phân tích ảnh', path: '/image', icon: Image },
  { name: 'Phân tích Video', path: '/video', icon: Video },
  { name: 'Phân tích Webcam', path: '/webcam', icon: Camera },
  { name: 'Lịch sử', path: '/history', icon: History },
  { name: 'Cài đặt', path: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 min-h-screen bg-slate-900 border-r border-slate-700 flex flex-col justify-between py-6 px-4">
      <div>
        {/* Khu vực Logo mới */}
        {/* Khu vực Logo mới */}
        <div className="flex items-center gap-3 px-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg">
            <Brain size={24} strokeWidth={2.5} />
          </div>
          <span className="font-bold text-xl text-white tracking-wide">
            Emotion<span className="text-blue-400">AI</span>
          </span>
        </div>

        {/* Navigation Links (giữ nguyên code cũ từ đây trở xuống) */}
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon size={20} />
                {item.name}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};