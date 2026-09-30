interface VideoStatisticsProps {
    duration: number;
    totalFaces: number;
    totalFrames: number;
    processedFrames: number;
}

function VideoStatistics({ duration, totalFaces, totalFrames, processedFrames }: VideoStatisticsProps) {
    const formatDuration = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return (
       <div className="video-statistics">
            <h3 className="video-statistics__title">Thông tin video</h3>
            <div className="video-statistics-list">
                <div className="video-statistics-item">
                    <span>Thời lượng</span>
                    <strong>{formatDuration(duration)}</strong>
                </div>
                <div className="video-statistics-item">
                    <span>Số khuôn mặt</span>
                    <strong>{totalFaces}</strong>
                </div>
                <div className="video-statistics-item">
                    <span>Tổng số khung hình</span>
                    <strong>{totalFrames}</strong>
                </div>
                <div className="video-statistics-item">
                    <span>Khung hình đã xử lý</span>
                    <strong>{processedFrames}</strong>
                </div>

            </div>
       </div>

    );
}
export default VideoStatistics;