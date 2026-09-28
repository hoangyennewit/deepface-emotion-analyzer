import { Navigate, useRoutes } from "react-router-dom";
import VideoRoutes from "./videoRoutes";

function AppRoutes() {
    const routes = [{
        path: "/",
        element: <Navigate to="/video-analysis" replace />,
    },
    ...VideoRoutes
    ];
    return useRoutes(routes);
}
export default AppRoutes;