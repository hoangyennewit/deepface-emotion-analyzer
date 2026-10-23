import { useRef, useState } from "react";
import type { DetectedFace } from "../../types/video";

interface VideoPlayerProps {
    videoUrl: string;
    faces: DetectedFace[];
}

function describeVideoError(error: MediaError | null): string {
    switch (error?.code) {
        case 1:
            return "Quá trình tải video bị hủy. Nhấn Tải lại video để thử lại.";
        case 2:
            return "Không đọc được nguồn video. Hãy chọn lại file từ máy.";
        case 3:
            return "Không giải mã được video. File có thể bị lỗi hoặc codec không được hỗ trợ. Thử chuyển video sang MP4 (H.264 + AAC).";
        case 4:
            return "Nguồn video hoặc định dạng/codec không được trình duyệt hỗ trợ. Thử chọn video MP4 (H.264 + AAC) hoặc WebM.";
        default:
            return "Không thể phát video. Hãy chọn lại file hoặc thử một video khác.";
    }
}

function VideoPlayer({ videoUrl, faces }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [playbackError, setPlaybackError] = useState<string | null>(null);

    return (
        <div>
            <div
                className="video-player-wrapper"
                style={{
                    position: "relative",
                    width: "100%",
                    backgroundColor: "#000",
                    overflow: "hidden",
                    borderRadius: "12px",
                }}
            >
                <video
                    ref={videoRef}
                    key={videoUrl}
                    className="analysis-video"
                    src={videoUrl || undefined}
                    controls
                    preload="metadata"
                    playsInline
                    onLoadStart={() => setPlaybackError(null)}
                    onLoadedMetadata={(event) => {
                        const v = event.currentTarget;
                        // Có metadata/âm thanh nhưng không có kích thước hình => trình duyệt
                        // không giải mã được track hình (thường là H.265/HEVC). Sẽ chỉ thấy màn hình đen.
                        if (v.videoWidth === 0 && v.videoHeight === 0) {
                            setPlaybackError(
                                "Trình duyệt không giải mã được phần hình ảnh của video (thường do codec H.265/HEVC). Hãy chuyển video sang MP4 (H.264 + AAC) rồi chọn lại."
                            );
                        }
                    }}
                    onError={(event) => {
                        const error = event.currentTarget.error;
                        setPlaybackError(
                            `${describeVideoError(error)}${error ? ` (Mã lỗi: ${error.code})` : ""}`
                        );
                        console.error("Lỗi phát video:", {
                            code: error?.code,
                            message: error?.message,
                            readyState: event.currentTarget.readyState,
                            networkState: event.currentTarget.networkState,
                        });
                    }}
                    style={{
                        display: "block",
                        position: "relative",
                        width: "100%",
                        height: "auto",
                        minHeight: "240px",
                        pointerEvents: "auto",
                    }}
                >
                    Trình duyệt không hỗ trợ phát video HTML5.
                </video>
                {faces.map((face) => (
                    <div
                        key={face.id}
                        className={`face-box emotion-${face.dominantEmotion}`}
                        style={{
                            position: "absolute",
                            left: `${face.x}%`,
                            top: `${face.y}%`,
                            width: `${face.width}%`,
                            height: `${face.height}%`,
                            border: "2px solid #22c55e",
                            boxSizing: "border-box",
                            pointerEvents: "none",
                        }}
                    >
                        <span
                            style={{
                                position: "absolute",
                                top: "-27px",
                                left: "-2px",
                                padding: "4px 7px",
                                backgroundColor: "#22c55e",
                                color: "#fff",
                                fontSize: "12px",
                                fontWeight: 600,
                                borderRadius: "4px",
                                whiteSpace: "nowrap",
                                pointerEvents: "none",
                            }}
                        >
                            {face.dominantEmotion} {face.confidence.toFixed(1)}%
                        </span>
                    </div>
                ))}
            </div>
            {playbackError && (
                <div role="alert" style={{ marginTop: "10px", color: "#b91c1c" }}>
                    <p>{playbackError}</p>
                    <button
                        type="button"
                        onClick={() => {
                            setPlaybackError(null);
                            videoRef.current?.load();
                        }}
                    >
                        Tải lại video
                    </button>
                </div>
            )}
        </div>
    );
}

export default VideoPlayer;
