import React, { useState } from 'react';
import { Mail, Lock, User, EyeOff, Eye, Brain, ArrowRight, UserPlus, ChevronRight, Smile, Meh, Frown } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#F4F7FF]">
      {/* Background blobs trang trí */}
      <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-[#E0E7FF] rounded-full blur-[100px] opacity-60"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-[#E0E7FF] rounded-full blur-[100px] opacity-60"></div>

      {/* Khung Card tổng */}
      <div className="flex w-full max-w-[900px] bg-white rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] overflow-hidden min-h-[600px] relative z-10 border border-white">
        
        {/* === CỘT TRÁI: Banner === */}
        <div className="hidden md:flex flex-col w-[45%] bg-gradient-to-br from-[#E6ECFF] to-[#D6E0FF] p-10 relative overflow-hidden justify-between">
          {/* Họa tiết nền */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white opacity-20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

          <div className="relative z-10">
            {/* Logo Header */}
            <div className="flex items-center gap-3 mb-2">
              <div className="text-blue-600">
                 <Brain size={32} strokeWidth={2.5} />
              </div>
              <span className="text-2xl font-bold text-slate-800 tracking-tight">EmotionAI</span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed max-w-[200px]">
              Phân tích cảm xúc khuôn mặt bằng DeepFace & FER
            </p>
          </div>

          {/* Minh họa trung tâm */}
          <div className="relative flex justify-center items-center my-8 z-10">
            {/* Khung quét Face */}
            <div className="relative w-40 h-40 rounded-[2rem] bg-gradient-to-b from-[#6B8CFF] to-[#8C68F5] flex items-center justify-center shadow-lg shadow-blue-200/50">
              <Smile size={64} className="text-white opacity-90" strokeWidth={1.5} />
              
              {/* 4 góc khung quét */}
              <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-white/50 rounded-tl-xl"></div>
              <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-white/50 rounded-tr-xl"></div>
              <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-white/50 rounded-bl-xl"></div>
              <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-white/50 rounded-br-xl"></div>
            </div>

            {/* Badges cảm xúc nổi */}
            <div className="absolute -right-4 top-4 flex flex-col gap-2.5">
              <div className="bg-white/80 backdrop-blur text-slate-700 text-xs font-semibold py-1.5 px-3 rounded-full flex items-center gap-1.5 shadow-sm border border-white">
                <Smile size={14} className="text-emerald-500" /> Happy
              </div>
              <div className="bg-white/80 backdrop-blur text-slate-700 text-xs font-semibold py-1.5 px-3 rounded-full flex items-center gap-1.5 shadow-sm border border-white">
                <Meh size={14} className="text-purple-500" /> Neutral
              </div>
              <div className="bg-white/80 backdrop-blur text-slate-700 text-xs font-semibold py-1.5 px-3 rounded-full flex items-center gap-1.5 shadow-sm border border-white">
                <Frown size={14} className="text-rose-500" /> Sad
              </div>
            </div>
          </div>

          {/* Footer Banner */}
          <div className="relative z-10">
            <p className="text-white text-xl font-medium italic drop-shadow-md transform -rotate-2 leading-tight">
              Hiểu cảm xúc<br/>Kết nối con người
            </p>
          </div>
        </div>

        {/* === CỘT PHẢI: Form === */}
        <div className="w-full md:w-[55%] p-8 md:p-12 flex flex-col justify-center bg-white relative">
          <div className="max-w-sm w-full mx-auto">
            
            {/* Headers */}
            {isLogin ? (
              <div className="mb-8">
                <p className="text-sm font-medium text-amber-500 mb-1">Chào mừng trở lại! 👋</p>
                <h2 className="text-3xl font-bold text-slate-800 tracking-tight mb-2">Đăng nhập</h2>
                <p className="text-slate-500 text-sm">Nhập thông tin tài khoản của bạn để tiếp tục sử dụng hệ thống.</p>
              </div>
            ) : (
              <div className="mb-8">
                <p className="text-sm font-medium text-purple-600 mb-1">Bắt đầu hành trình của bạn 🚀</p>
                <h2 className="text-3xl font-bold text-slate-800 tracking-tight mb-2">Đăng ký tài khoản</h2>
                <p className="text-slate-500 text-sm">Tạo tài khoản để bắt đầu phân tích cảm xúc ngay hôm nay!</p>
              </div>
            )}

            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              {/* Họ và tên (Chỉ hiện đăng ký) */}
              {!isLogin && (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <User size={18} strokeWidth={2} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Họ và tên" 
                    className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm placeholder:text-slate-400"
                  />
                </div>
              )}

              {/* Email */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Mail size={18} strokeWidth={2} />
                </div>
                <input 
                  type="text" 
                  placeholder={isLogin ? "Email hoặc số điện thoại" : "Email"} 
                  className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm placeholder:text-slate-400"
                />
              </div>

              {/* Mật khẩu */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} strokeWidth={2} />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Mật khẩu" 
                  className="w-full pl-11 pr-11 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm placeholder:text-slate-400"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>

              {/* Xác nhận mật khẩu (Chỉ hiện đăng ký) */}
              {!isLogin && (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <Lock size={18} strokeWidth={2} />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Xác nhận mật khẩu" 
                    className="w-full pl-11 pr-11 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm placeholder:text-slate-400"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
              )}

              {/* Ghi nhớ & Quên MK (Chỉ hiện đăng nhập) */}
              {isLogin && (
                <div className="flex items-center justify-between text-sm mt-1 px-1">
                  <label className="flex items-center text-slate-600 cursor-pointer group font-medium">
                    <input type="checkbox" className="mr-2 w-4 h-4 rounded text-indigo-500 border-slate-300 focus:ring-indigo-500" defaultChecked />
                    Ghi nhớ đăng nhập
                  </label>
                  <a href="#" className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors">Quên mật khẩu?</a>
                </div>
              )}

              {/* Main Button */}
              <button className="w-full bg-gradient-to-r from-[#5A72F6] to-[#8861F4] hover:opacity-90 text-white font-medium py-3 rounded-xl transition-all mt-4 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200">
                {isLogin ? (
                  <>
                    <ArrowRight size={18} /> Đăng nhập
                  </>
                ) : (
                  <>
                    <UserPlus size={18} /> Đăng ký
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="flex items-center my-6">
                <div className="flex-1 border-t border-slate-100"></div>
                <span className="px-4 text-xs text-slate-400 font-medium uppercase tracking-wider">Hoặc</span>
                <div className="flex-1 border-t border-slate-100"></div>
              </div>

              {/* Toggle Button */}
              <button 
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 font-medium py-3 rounded-xl transition-all flex items-center justify-between px-6 text-sm"
              >
                <div className="flex items-center gap-2">
                  <User size={16} className="text-slate-400" />
                  <span>
                    {isLogin ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
                    <span className="text-indigo-600 font-bold ml-1">
                      {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
                    </span>
                  </span>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </button>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
};