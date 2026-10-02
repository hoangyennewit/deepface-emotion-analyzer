import { EMOTION_KEYS, EMOTION_META } from "../constants/emotions";
import type { EmotionKey } from "../types/emotion";

interface EmotionBarsProps {
  scores: Record<string, number>; // điểm 0..100
  showAll?: boolean; // hiện cả cảm xúc 0% hay chỉ hiện > 0
}

/** Thanh điểm 7 cảm xúc dùng chung cho Webcam / Lịch sử */
export function EmotionBars({ scores, showAll = true }: EmotionBarsProps) {
  const entries = EMOTION_KEYS.map((key) => ({
    key,
    value: Math.min(100, Math.max(0, Math.round(scores?.[key] ?? 0))),
  })).sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-2">
      {entries
        .filter((e) => showAll || e.value > 0)
        .map(({ key, value }) => {
          const meta = EMOTION_META[key as EmotionKey];
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="text-lg w-6 text-center">{meta.emoji}</span>
              <span className={`w-24 text-sm font-medium ${meta.tailwind}`}>
                {meta.label}
              </span>
              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${meta.bg}`}
                  style={{ width: `${value}%` }}
                />
              </div>
              <span className="w-12 text-right text-sm text-slate-600 tabular-nums">
                {value}%
              </span>
            </div>
          );
        })}
    </div>
  );
}
