interface VideoStatisticsProps {
    duration: number;
    totalFaces: number;
    totalFrames: number;
    processedFrames: number;
}

function VideoStatistics({
    duration,
    totalFaces,
    totalFrames,
    processedFrames,
}: VideoStatisticsProps) {

    const formatDuration = (
        seconds: number
    ): string => {
        const minutes = Math.floor(
            seconds / 60
        );

        const remainingSeconds =
            Math.floor(seconds % 60);

        return `${minutes
            .toString()
            .padStart(2, "0")}:${remainingSeconds
            .toString()
            .padStart(2, "0")}`;
    };

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: "15px",
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                }}
            >
                <span>Thời lượng</span>

                <strong>
                    {formatDuration(duration)}
                </strong>
            </div>

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                }}
            >
                <span>Tổng số khuôn mặt</span>

                <strong>
                    {totalFaces}
                </strong>
            </div>

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                }}
            >
                <span>Tổng số khung hình</span>

                <strong>
                    {totalFrames}
                </strong>
            </div>

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                }}
            >
                <span>Khung hình đã xử lý</span>

                <strong>
                    {processedFrames}
                </strong>
            </div>
        </div>
    );
}

export default VideoStatistics;