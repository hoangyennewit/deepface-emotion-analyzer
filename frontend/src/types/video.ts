export type EmotionType  = 'happy' | 'sad' | 'angry' | 'surprised' | 'neutral';

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
    time: string;
    emotions: Partial<Record<EmotionType, number>>;
}

export interface VideoAnalysisResult {
    duration: string;
    totalFrames: number;
    processedFrames: number;
    totalFaces: number;
    emotionSumary: Partial<Record<EmotionType, number>>;
    faces: DetectedFace[];
    timeline: EmotionTimelineItem[];
}