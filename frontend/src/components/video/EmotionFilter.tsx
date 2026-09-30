import { type EmotionType } from "../../types/video";

interface EmotionFilterProps {
    selectedEmotions: EmotionType[];
    onToggleEmotion: (emotion: EmotionType) => void;
}

const emotions: {
    value: EmotionType;
    label: string;
    color: string;
}[] = [
    { value: 'neutral', label: 'Bình thường', color: '#3b82f6' },
    { value: 'happy', label: 'Hạnh phúc', color: '#22c55e' },
    { value: 'sad', label: 'Buồn', color: '#6366f1' },
    { value: 'angry', label: 'Giận dữ', color: '#ef4444' },
    { value: 'surprised', label: 'Ngạc nhiên', color: '#f59e0b' },
    { value: 'fearful', label: 'Sợ hãi', color: '#9333ea' },
    { value: 'disgusted', label: 'Ghê tởm', color: '#84cc16' },
];

function EmotionFilter({ selectedEmotions, onToggleEmotion }: EmotionFilterProps) {
    return (
        <div
            style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                justifyContent: "center",
            }}
        >
            {emotions.map((emotion) => {
                const isSelected = selectedEmotions.includes(emotion.value);
                return (
                    <button
                        key={emotion.value}
                        type="button"
                        onClick={() => onToggleEmotion(emotion.value)}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "8px 14px",
                            borderRadius: "20px",
                            border: isSelected ? `2px solid ${emotion.color}` : "1.5px solid #e2e8f0",
                            backgroundColor: isSelected ? `${emotion.color}15` : "#ffffff",
                            color: isSelected ? "#0f172a" : "#64748b",
                            fontSize: "13px",
                            fontWeight: isSelected ? 600 : 500,
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            boxShadow: isSelected ? `0 2px 6px ${emotion.color}25` : "none",
                        }}
                    >
                        <span
                            style={{
                                width: "9px",
                                height: "9px",
                                borderRadius: "50%",
                                backgroundColor: emotion.color,
                                opacity: isSelected ? 1 : 0.5,
                            }}
                        />
                        {emotion.label}
                        {isSelected && (
                            <span style={{ fontSize: "11px", color: emotion.color, fontWeight: 700 }}>✓</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export default EmotionFilter;