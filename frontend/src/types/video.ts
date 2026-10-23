export type EmotionType  = 'happy' | 'sad' | 'angry' | 'surprised' | 'neutral' | 'fearful' | 'disgusted';

export interface DetectedFace{
    id: number;
    name?: string;
    dominantEmotion: EmotionType;
    confidence: number; 
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface EmotionTimelineItem {
    time: number;
    emotions: Partial<Record<EmotionType, number>>;
}

export interface VideoAnalysisResult {
    duration: number;
    totalFrames: number;
    processedFrames: number;
    totalFaces: number;
    emotionSummary: Partial<Record<EmotionType, number>>;
    faces: DetectedFace[];
    timeline: EmotionTimelineItem[];
}