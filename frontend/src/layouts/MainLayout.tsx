import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Bell } from 'lucide-react'; 

export const MainLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      {/* Sidebar bên trái giữ nguyên */}
      <Sidebar />
      
      {/* Cột nội dung bên phải */}
      <div className="flex-1 flex flex-col">
        
        {/* Thanh Topbar ngang phía trên */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-end px-8 gap-6">
          <button className="text-slate-500 hover:text-slate-800 transition-colors">
            <Bell size={20} />
          </button>
          
          <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
            <img 
              src="https://ui-avatars.com/api/?name=Đông&background=0D8ABC&color=fff" 
              alt="Avatar" 
              className="w-8 h-8 rounded-full" 
            />
            <span className="font-semibold text-sm text-slate-700">Đông</span>
          </div>
        </header>

        {/* Khu vực nội dung chính của các trang (hiển thị dưới Topbar) */}
        <main className="flex-1 p-8 overflow-y-auto">
           <Outlet /> 
        </main>
      </div>
    </div>
  );
};