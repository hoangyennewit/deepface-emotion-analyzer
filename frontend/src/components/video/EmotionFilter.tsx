import { type EmotionType } from "../../types/video";

interface EmotionFilterProps {
    selectedEmotions: EmotionType[];
    onToggleEmotion: (emotion: EmotionType) => void;
}

const emotions: {
    value: EmotionType;
    label: string;
}[] = [
    { value: 'happy', label: 'Hạnh phúc' },
    { value: 'sad', label: 'Buồn' },
    { value: 'angry', label: 'Giận dữ' },
    { value: 'surprised', label: 'Ngạc nhiên' },
    { value: 'fearful', label: 'Sợ hãi' },
    { value: 'neutral', label: 'Bình thường' },
    { value: 'disgusted', label: 'Ghê tởm' },
]

function EmotionFilter({ selectedEmotions, onToggleEmotion }: EmotionFilterProps) {

    return (
        <div className="emotion-filter">
            {emotions.map((emotion) => {
                const isSelected = selectedEmotions.includes(emotion.value);
                return (
                    <button
                        key={emotion.value}
                        type="button"
                        className={`emotion-filter-button ${isSelected ? "active" : ""}`}
                        onClick={() => onToggleEmotion(emotion.value)}
                    >
                        <span
                            className={`emotion-filter-dot emotion-${emotion.value}`}
                        />
                        {emotion.label}
                    </button>
                );
            })}
        </div>
    );
}
export default EmotionFilter;