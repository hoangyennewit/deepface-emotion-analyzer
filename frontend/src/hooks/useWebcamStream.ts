import { useCallback, useEffect, useRef, useState } from "react";

// ============================================================
// Hook quản lý luồng webcam (getUserMedia)
// - start(): xin quyền truy cập camera, gắn stream vào <video>
// - stop(): dừng mọi track khi unmount hoặc người dùng tắt camera
// - captureFrame(): chụp 1 frame JPEG từ video (gửi lên backend)
// ============================================================

export interface UseWebcamStream {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  captureFrame: (quality?: number) => Promise<Blob | null>;
}

export function useWebcamStream(facingMode: "user" | "environment" = "user"): UseWebcamStream {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsActive(false);
  }, []);

  // Tắt camera khi rời trang — tránh để camera "ma" bật ngầm
  useEffect(() => stop, [stop]);

  const start = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    // Đảm bảo tắt stream cũ trước khi mở mới (đổi camera trước/sau)
    streamRef.current?.getTracks().forEach((t) => t.stop());

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Trình duyệt không hỗ trợ truy cập camera. Hãy dùng Chrome/Edge mới.");
      setIsLoading(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setIsActive(true);
    } catch (err) {
      const e = err as DOMException;
      if (e.name === "NotAllowedError") {
        setError("Bạn đã từ chối quyền truy cập camera. Hãy cấp quyền trong trình duyệt và thử lại.");
      } else if (e.name === "NotFoundError") {
        setError("Không tìm thấy camera nào trên thiết bị này.");
      } else {
        setError(`Không mở được camera: ${e.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [facingMode]);

  /** Chụp frame hiện tại của video thành JPEG Blob (null nếu camera chưa sẵn sàng) */
  const captureFrame = useCallback(async (quality = 0.8): Promise<Blob | null> => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0) return null;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", quality);
    });
  }, []);

  return { videoRef, isActive, isLoading, error, start, stop, captureFrame };
}
