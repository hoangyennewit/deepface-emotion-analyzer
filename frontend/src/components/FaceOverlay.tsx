import { getEmotionMeta } from "../constants/emotions";
import type { OverlayFace } from "../hooks/useWebcamEmotion";

interface FaceOverlayProps {
  faces: OverlayFace[];
  mirrored?: boolean; // camera trước thường hiển thị lật trái-phải
}

/** Vẽ khung nhận diện + nhãn cảm xúc phủ lên khung hình webcam */
export function FaceOverlay({ faces, mirrored = true }: FaceOverlayProps) {
  return (
    <>
      {faces.map((face) => {
        const meta = getEmotionMeta(face.emotion);
        // Nếu ảnh bị lật (mirror) thì bbox cũng phải lật theo mới khớp gương mặt
        const left = mirrored ? 100 - face.xPct - face.wPct : face.xPct;
        return (
          <div
            key={face.id}
            className="absolute pointer-events-none"
            style={{
              left: `${left}%`,
              top: `${face.yPct}%`,
              width: `${face.wPct}%`,
              height: `${face.hPct}%`,
            }}
          >
            <div
              className="w-full h-full rounded-lg border-2"
              style={{ borderColor: meta.color }}
            />
            <div
              className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-semibold text-white shadow"
              style={{ backgroundColor: meta.color }}
            >
              {meta.emoji} {meta.label} {face.confidence}%
            </div>
          </div>
        );
      })}
    </>
  );
}
