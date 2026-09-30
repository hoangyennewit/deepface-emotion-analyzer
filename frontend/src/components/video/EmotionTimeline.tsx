import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import { type EmotionType, type EmotionTimelineItem } from "../../types/video";

interface EmotionTimelineProps {
    timeline: EmotionTimelineItem[];
    selectedEmotions: EmotionType[];
}

interface ChartDataItem {
    time: number;
    angry?: number;
    happy?: number;
    sad?: number;
    surprised?: number;
    neutral?: number;
    fearful?: number;
    disgusted?: number;
}

const emotionLabels: Record<string, string> = {
    angry: "Giận dữ",
    happy: "Hạnh phúc",
    sad: "Buồn",
    surprised: "Ngạc nhiên",
    surprise: "Ngạc nhiên",
    neutral: "Bình thường",
    fearful: "Sợ hãi",
    fear: "Sợ hãi",
    disgusted: "Ghê tởm",
    disgust: "Ghê tởm",
}

const emotionColors: Record<string, string> = {
    angry: "#ef4444",
    disgusted: "#84cc16",
    disgust: "#84cc16",
    fearful: "#9333ea",
    fear: "#9333ea",
    happy: "#22c55e",
    sad: "#6366f1",
    surprised: "#f59e0b",
    surprise: "#f59e0b",
    neutral: "#3b82f6",
}

function EmotionTimeline({ timeline, selectedEmotions }: EmotionTimelineProps) {
    const chartData: ChartDataItem[] = timeline.map((item) => ({
        time: item.time,
        ...item.emotions,
    }));
    const formatTime = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
    };

    if(timeline.length === 0){
        return (
            <div className="emotion-timeline">
                <p className="emotion-timeline-empty">
                    Chưa có dữ liệu phân tích video.
                </p>
            </div>
        );
    }
    
    return (
        <div className="emotion-timeline">
            <div className="emotion-timeline-chart">
                <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" tickFormatter={formatTime} />
                        <YAxis
                            domain={[0, 100]}
                            tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip
                            labelFormatter={(value) => `Thời gian: ${formatTime(Number(value))}`}
                            formatter={(value, name) => {
                                const numericValue = Number(value ?? 0);
                                const emotion = String(name) as EmotionType;

                                return [
                                `${numericValue.toFixed(1)}%`,
                                emotionLabels[emotion] ?? String(name),
                                ];
                            }}
                        />
                        <Legend
                            formatter={(value) => emotionLabels[value as EmotionType] ?? value}
                        />
                        {selectedEmotions.map((emotion) => (
                            <Line
                                key={emotion}
                                type="monotone"
                                dataKey={emotion}
                                stroke={emotionColors[emotion]}
                                strokeWidth={2}
                                dot={false}
                                connectNulls
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
export default EmotionTimeline;
