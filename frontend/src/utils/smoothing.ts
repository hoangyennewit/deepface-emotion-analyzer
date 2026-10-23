/**
 * Bộ làm mịn kết quả nhận diện realtime.
 * Phiên bản JS của EmotionSmoother trong backend/src/video_processor.py:
 * - EmotionSmoother: bỏ phiếu đa số trên cửa sổ trượt các kết quả gần nhất.
 * - ScoreSmoother: trung bình trượt hàm mũ (EMA) cho điểm 7 cảm xúc.
 */

export class EmotionSmoother {
  private window: string[] = [];
  private windowSize: number;

  constructor(windowSize = 7) {
    this.windowSize = windowSize;
  }

  smooth(currentEmotion: string | null): string | null {
    if (!currentEmotion) return null;
    this.window.push(currentEmotion);
    if (this.window.length > this.windowSize) this.window.shift();

    const counts = new Map<string, number>();
    for (const e of this.window) counts.set(e, (counts.get(e) ?? 0) + 1);

    let best: string | null = null;
    let bestCount = 0;
    for (const [emotion, count] of counts) {
      if (count > bestCount) {
        best = emotion;
        bestCount = count;
      }
    }
    return best;
  }

  reset(): void {
    this.window = [];
  }
}

export class ScoreSmoother {
  private scores: Record<string, number> = {};
  private initialized = false;
  private alpha: number;

  constructor(alpha = 0.35) {
    this.alpha = alpha;
  }

  /** EMA: s' = alpha * mới + (1 - alpha) * cũ */
  smooth(current: Record<string, number>): Record<string, number> {
    if (!this.initialized) {
      this.scores = { ...current };
      this.initialized = true;
    } else {
      const next: Record<string, number> = { ...this.scores };
      for (const [k, v] of Object.entries(current)) {
        next[k] = this.alpha * v + (1 - this.alpha) * (this.scores[k] ?? 0);
      }
      this.scores = next;
    }
    return { ...this.scores };
  }

  reset(): void {
    this.scores = {};
    this.initialized = false;
  }
}
