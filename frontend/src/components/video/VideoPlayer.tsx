import { type DetectedFace, type EmotionType } from "../../types/video";
interface VideoPlayerProps {
    videoUrl: string;
    faces: DetectedFace[];
}

function VideoPlayer({ videoUrl, faces }: VideoPlayerProps) {
    const getEmotionCLass = (emotion: EmotionType) : string => {
        return `emotion-${emotion}`;
    };

    return (
        <div className="video-player-wrapper">
            <video 
                className="analysis-video"
                src={videoUrl}
                controls
            />
            {faces.map((face) => (
                <div 
                    key={face.id}
                    className={`face-box ${getEmotionCLass(face.dominantEmotion)}`}
                    style={{
                        left: `${face.x}%`,
                        top: `${face.y}%`,
                        width: `${face.width}%`,
                        height: `${face.height}%`
                    }}
                >
                    <span>
                        {face.dominantEmotion}
                        {" "}
                        {face.confidence.toFixed(1)}%
                    </span>
                    
                </div>
            ))}
        </div>      
    )
};

export default VideoPlayer;


