import { Eye, EyeOff, LockKeyhole, Mail, ScanFace, UserRound } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../api/authApi";

export const RegisterPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      await register(email, password, name);
      navigate("/login", {
        state: { message: "Đăng ký thành công. Vui lòng đăng nhập." },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo tài khoản.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-5 py-8 text-[#0F254A] sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_20px_60px_rgba(15,37,74,0.1)] lg:grid-cols-[0.9fr_1.1fr]">
          <section className="hidden bg-[#0F254A] p-12 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="mb-16 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#38BDF8] bg-[#1E3A8A] text-xl shadow-[0_0_16px_rgba(56,189,248,0.35)]">
                  <ScanFace size={22} />
                </div>
                <div>
                  <p className="text-lg font-extrabold">EmotionAI</p>
                  <p className="text-xs text-[#93C5FD]">DeepFace Analyzer</p>
                </div>
              </div>
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#93C5FD]">
                Start analyzing
              </p>
              <h1 className="max-w-sm text-4xl font-extrabold leading-tight">
                Tạo không gian phân tích của riêng bạn.
              </h1>
              <p className="mt-6 max-w-sm text-sm leading-7 text-[#CBD5E1]">
                Lưu lại kết quả, theo dõi lịch sử và khám phá cảm xúc qua từng phiên làm việc.
              </p>
            </div>
            <p className="text-xs text-[#93A4C3]">Powered by DeepFace</p>
          </section>

          <section className="px-6 py-10 sm:px-12 sm:py-14">
            <div className="mx-auto max-w-md">
              <div className="mb-8 lg:hidden">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#38BDF8] bg-[#1E3A8A] text-white">
                    <ScanFace size={20} />
                  </div>
                  <p className="text-lg font-extrabold text-[#0F254A]">EmotionAI</p>
                </div>
              </div>

              <p className="mb-2 text-sm font-semibold text-[#2563EB]">Bắt đầu ngay</p>
              <h2 className="m-0 text-3xl font-extrabold leading-tight text-[#0F254A]">Tạo tài khoản</h2>
              <p className="mt-3 text-sm leading-6 text-[#64748B]">
                Đăng ký để bắt đầu lưu trữ các phiên phân tích.
              </p>

              <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                <label className="block text-sm font-semibold text-[#334155]">
                  Họ và tên
                  <span className="relative mt-2 block">
                    <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={18} />
                    <input
                      className="w-full rounded-lg border border-[#CBD5E1] bg-white py-3 pl-10 pr-4 text-sm text-[#0F254A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-4 focus:ring-[#DBEAFE]"
                      type="text"
                      placeholder="Nguyễn Văn A"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                    />
                  </span>
                </label>

                <label className="block text-sm font-semibold text-[#334155]">
                  Email
                  <span className="relative mt-2 block">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={18} />
                    <input
                      className="w-full rounded-lg border border-[#CBD5E1] bg-white py-3 pl-10 pr-4 text-sm text-[#0F254A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-4 focus:ring-[#DBEAFE]"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </span>
                </label>

                <label className="block text-sm font-semibold text-[#334155]">
                  Mật khẩu
                  <span className="relative mt-2 block">
                    <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={18} />
                    <input
                      className="w-full rounded-lg border border-[#CBD5E1] bg-white py-3 pl-10 pr-11 text-sm text-[#0F254A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-4 focus:ring-[#DBEAFE]"
                      type={showPassword ? "text" : "password"}
                      placeholder="Tối thiểu 8 ký tự"
                      minLength={8}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#2563EB]"
                      onClick={() => setShowPassword((visible) => !visible)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </span>
                </label>

                <label className="block text-sm font-semibold text-[#334155]">
                  Xác nhận mật khẩu
                  <span className="relative mt-2 block">
                    <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={18} />
                    <input
                      className="w-full rounded-lg border border-[#CBD5E1] bg-white py-3 pl-10 pr-11 text-sm text-[#0F254A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-4 focus:ring-[#DBEAFE]"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Nhập lại mật khẩu"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      required
                    />
                    <button
                      type="button"
                      aria-label={showConfirmPassword ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#2563EB]"
                      onClick={() => setShowConfirmPassword((visible) => !visible)}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </span>
                </label>

                {error && <p className="text-sm font-medium text-[#DC2626]">{error}</p>}

                <button
                  className="w-full rounded-lg bg-[#2563EB] px-5 py-3 text-sm font-bold text-white shadow-[0_8px_18px_rgba(37,99,235,0.22)] transition hover:bg-[#1D4ED8] focus:outline-none focus:ring-4 focus:ring-[#DBEAFE]"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-[#64748B]">
                Đã có tài khoản? <Link className="font-bold text-[#2563EB] hover:text-[#1D4ED8]" to="/login">Đăng nhập</Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};
