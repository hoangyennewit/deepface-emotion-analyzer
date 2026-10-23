import type { RouteObject } from "react-router-dom";
import VideoAnalysisPage from "../pages/VideoAnalysisPage";

const VideoRoutes: RouteObject[] = [
    {
        path: "/video-analysis",
        element: <VideoAnalysisPage />,
    }
];
export default VideoRoutes;