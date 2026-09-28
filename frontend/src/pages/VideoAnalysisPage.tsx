import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import VideoPlayer from '../components/video/VideoPlayer';
import VideoStatistics from '../components/video/VideoStatistics';
import EmotionTimeline from '../components/video/EmotionTimeline';
import EmotionFilter from '../components/video/EmotionFilter';
import type { EmotionType, VideoAnalysisResult } from '../types/video';

const emotionConfig: Record<
  string,
  {
    label: string;
    color: string;
  }
> = {
  happy: { label: "Happy", color: "#16a34a"},
  neutral: { label: "Neutral", color: "#3b82f6"},
  sad: { label: "Sad", color: "#1e3a8a"},
  angry: { label: "Angry", color: "#ef4444"},
  fear: { label: "Fear", color: "#9333ea"},
  surprise: { label: "Surprise", color: "#f97316"},
  disgust: {label: "Disgust", color: "#84cc16"},
};

function getFallbackEmotionColor(
  index: number
): string {
  const colors = [
    "#06b6d4",
    "#ec4899",
    "#8b5cf6",
    "#14b8a6",
    "#f59e0b",
    "#64748b",
    "#0ea5e9",
    "#d946ef",
  ];
  return colors[index % colors.length];
}

interface StatisticPlaceholderProps {
    label: string;
}
interface EmotionSummaryProps {
    result: VideoAnalysisResult;
}

function StatisPlaceholder({ label }: StatisticPlaceholderProps) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
            }}
        >
            <div
                style={{
                width: "20px",
                height: "20px",

                display: "flex",
                alignItems: "center",
                justifyContent: "center",

                borderRadius: "50%",
                backgroundColor: "#3155ff",
                color: "#ffffff",

                fontSize: "11px",
                }}
            >
                ●
            </div>
            <span
                style={{
                flex: 1,
                fontSize: "14px",
                }}
            >
                {label}
            </span>
            <strong>
                --
            </strong>
        </div>
    );
}

function EmotionSummary({ result }: EmotionSummaryProps) {
    const summaryEntries = Object.entries(
        result.emotionSummary
    ) as [EmotionType, number][];

    if (summaryEntries.length === 0) {
        return (
            <p
                style={{
                color: "#6b7280",
                fontSize: "14px",
                }}
            >
                Chưa có dữ liệu biểu cảm.
            </p>
        );
    }

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
            }}
        >
            {summaryEntries.map(
                ([emotion, value], index) => {
                const config = emotionConfig[emotion];
                const color = config?.color ?? getFallbackEmotionColor(index);
                const label =
                    config?.label ?? emotion;

                return (
                    <div
                        key={emotion}
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                            "80px 1fr 45px",
                            alignItems: "center",
                            gap: "10px",
                        }}
                    >
                    {/* Tên cảm xúc */}
                    <span
                        style={{
                        color,
                        fontSize: "14px",
                        fontWeight: 600,
                        }}
                    >
                        {label}
                    </span>

                    {/* Thanh phần trăm */}
                    <div
                        style={{
                        width: "100%",
                        height: "8px",
                        backgroundColor: "#e5e7eb",
                        borderRadius: "10px",
                        overflow: "hidden",
                        }}
                    >
                        <div
                            style={{
                                width: `${Math.min(
                                Math.max(value, 0),
                                100
                                )}%`,
                                height: "100%",
                                backgroundColor: color,
                                borderRadius: "10px",
                            }}
                        />
                        </div>
                        {/* Giá trị */}
                        <span
                            style={{
                            fontSize: "13px",
                            }}
                        >
                            {value.toFixed(0)}%
                        </span>
                    </div>);
                }
            )}
        </div>
    );
}

function VideoAnalysisPage() {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoUrl, setVideoUrl] = useState<string>("");
    const [analysisResult, setAnalysisResult] = useState<VideoAnalysisResult | null>(null);
    const [selectedEmotions, setSelectedEmotions] = useState<EmotionType[]>([]);

    const handleVideoChange = (event: ChangeEvent<HTMLInputElement>) => {
        const input = event.target;
        const file = input.files?.[0];
        // Reset để có thể chọn lại đúng file đó lần nữa (nếu không onChange sẽ không chạy)
        input.value = "";
        if (!file) return;

        // Một số file (.mkv, .mov, .avi) có file.type rỗng tùy hệ điều hành -> kiểm tra thêm đuôi file
        const looksLikeVideo =
            file.type.startsWith("video/") ||
            /\.(mp4|m4v|webm|ogv|mov|mkv|avi)$/i.test(file.name);
        if (!looksLikeVideo) {
            alert("Vui lòng chọn một tệp video hợp lệ.");
            return;
        }

        setVideoFile(file);
        setAnalysisResult(null);
        setSelectedEmotions([]);
    };

    const handleAnalysisResult = (
        result: VideoAnalysisResult
    ) => {
        setAnalysisResult(result);
        const emotions = Object.keys(
            result.emotionSummary
        ) as EmotionType[];

        setSelectedEmotions(emotions);
    };

    const handleToggleEmotion = (emotion: EmotionType) => {
        setSelectedEmotions((current) => {
            if (current.includes(emotion)) {
                return current.filter((e) => e !== emotion);
            }
            return [...current, emotion];
        });
    };

    // Tạo và thu hồi blob URL trong CÙNG một effect.
    // Cách cũ tạo URL ở event handler rồi revoke ở cleanup, nên khi effect bị chạy lại
    // (StrictMode / Fast Refresh) URL đang dùng bị thu hồi -> video không phát được.
    useEffect(() => {
        if (!videoFile) return;
        const url = URL.createObjectURL(videoFile);
        setVideoUrl(url);
        return () => {
            URL.revokeObjectURL(url);
        };
    }, [videoFile]);

    return (
        <div
             style={{
                width: "100%",
                minHeight: "100vh",
                padding: "24px 30px",
                boxSizing: "border-box",
                backgroundColor: "#ffffff",
                color: "#111827",
            }}
        >
            {/* Tiêu đề */}
                <h1 style={{
                    margin: "0 0 20px 0",
                    fontSize: "26px",
                    fontWeight: 700,
                    }}>Phân tích Video
                </h1>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "minmax(0, 1.65fr) minmax(280px, 1fr)",
                        gap: "26px",
                        alignItems: "start",
                    }}
                >
                    {/* Nút chọn video */}
                    <div style={{ minWidth: "0" }}>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                marginBottom: "12px",
                            }}
                        >        
                            <label
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "7px",
                                    padding: "8px 13px",
                                    border: "1px solid #9ca3af",
                                    borderRadius: "5px",
                                    backgroundColor: "#ffffff",
                                    fontSize: "13px",
                                    cursor: "pointer",
                                    fontWeight: 500
                                }}
                            >
                                <span>
                                    🎥
                                </span>

                                {videoFile
                                    ? "Chọn video khác"
                                    : "Chọn video"}

                                <input
                                    type="file"
                                    accept="video/*"
                                    onChange={handleVideoChange}
                                    style={{
                                    display: "none",
                                    }}
                                />
                            </label>
                        </div>

                        {/* Video */}
                        {videoUrl ?(
                            <VideoPlayer
                                videoUrl={videoUrl}
                                faces={analysisResult?.faces ?? []}
                            />
                        ):(
                            <div
                                style={{
                                    width: "100%",
                                    height: "360px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    backgroundColor: "#f8fafc",
                                    border: "1px dashed #cbd5e1",
                                    borderRadius: "14px",
                                    color: "#64748b",
                                    fontSize: "14px"
                                }}
                            >
                                Chọn video để phân tích
                            </div>
                        )}

                        {videoFile && (
                            <div
                                 style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: "16px",
                                    marginTop: "10px",
                                    color: "#64748b",
                                    fontSize: "13px",
                                }}
                            >
                                <span
                                    style={{
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {videoFile.name}
                                </span>
                                <span style={{ whiteSpace: "nowrap" }}>
                                    {(videoFile.size / 1024 / 1024).toFixed(2)}{" "} MB
                                </span>
                            </div>
                        )}
                    </div>

                    <div>
                        {/* Thống kê video */}
                        <h2
                            style={{
                                margin: "5px 0 12px",
                                fontSize: "19px",
                                fontWeight: 700,
                                }}
                        >
                            THỐNG KÊ VIDEO
                        </h2>

                        {analysisResult ? (
                            <VideoStatistics
                                duration={analysisResult.duration}
                                totalFaces={analysisResult.totalFaces}
                                totalFrames={analysisResult.totalFrames}
                                processedFrames={analysisResult.processedFrames}
                            />
                        ):(
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "15px",
                                    marginBottom: "32px",
                                }}
                            >
                                <StatisPlaceholder label="Phân tích" />
                                <StatisPlaceholder label="Tổng số khuôn mặt" />
                                <StatisPlaceholder label="Frames phân tích" />
                            </div>
                        )}

                        {/* KẾT QUẢ PHÂN TÍCH */}
                        <h2
                            style={{
                            marginTop: "30px",
                            marginBottom: "16px",

                            fontSize: "19px",
                            fontWeight: 700,
                            }}
                        >
                            KẾT QUẢ PHÂN TÍCH
                        </h2>
                        {analysisResult ? (
                            <EmotionSummary
                                result={analysisResult}
                            />
                        ):(
                            <p
                                style={{
                                    margin: 0,
                                    color: "#6b7280",
                                    fontSize: "14px",
                                }}
                            >
                                Chưa có kết quả phân tích.
                            </p>
                        )}
                    </div>
                </div>

                {/* BIỂU ĐỒ + FILTER */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "minmax(0, 1.65fr) minmax(280px, 1fr)",
                        gap: "26px",
                        marginTop: "24px",
                        alignItems: "start",
                    }}
                >
                    <div style={{ minWidth: 0 }}>
                        <h2
                            style={{
                                margin: 0,
                                fontSize: "19px",
                                fontWeight: 700,
                            }}
                        >
                            Biểu đồ cảm xúc chi tiết
                        </h2>
                        <EmotionTimeline
                            timeline={ analysisResult?.timeline ?? []}
                            selectedEmotions={ selectedEmotions }
                        />
                    </div>

                    {/* FILTER */}
                    <div>
                        <h3
                            style={{
                                margin: "0 0 18px",
                                fontSize: "15px",
                                fontWeight: 600,
                                textAlign: "center",
                            }}
                        >
                            Chọn cảm xúc để xem chi tiết
                        </h3>
                        {analysisResult ? (
                            <EmotionFilter
                                selectedEmotions={selectedEmotions}
                                onToggleEmotion={handleToggleEmotion}
                            />
                        ) : (
                            <p
                                style={{
                                    margin: 0,
                                    color: "#6b7280",
                                    fontSize: "14px",
                                    textAlign: "center",
                                }}
                            >
                                Chưa có dữ liệu để lọc cảm xúc.
                            </p>
                        )}
                    </div>
                </div>
        </div>
    );
}
export default VideoAnalysisPage;