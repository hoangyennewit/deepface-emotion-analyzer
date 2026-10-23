import { Navigate, Outlet, useLocation, useRoutes } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { HomePage } from '../pages/HomePage';
import { ImageAnalysisPage } from '../pages/ImageAnalysisPage';
import VideoAnalysisPage from '../pages/VideoAnalysisPage';
import { WebcamAnalysisPage } from '../pages/WebcamAnalysisPage';
import { SettingsPage } from '../pages/SettingsPage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { HistoryPage } from "../pages/HistoryPage";
import { HistoryDetailPage } from "../pages/HistoryDetailPage";
import { hasAccessToken } from '../api/authApi';

function RequireAuth() {
  const location = useLocation();

  if (!hasAccessToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

function AppRoutes() {
  const routes = [
    { path: '/login', element: <LoginPage /> },
    { path: '/register', element: <RegisterPage /> },
    { path: '/auth', element: <Navigate to="/login" replace /> },
    {
      path: '/',
      element: <RequireAuth />,
      children: [
        {
          element: <AppLayout />,
          children: [
            { index: true, element: <HomePage /> },
            { path: 'image-analysis', element: <ImageAnalysisPage /> },
            { path: 'video-analysis', element: <VideoAnalysisPage /> },
            { path: 'webcam-analysis', element: <WebcamAnalysisPage /> },
            { path: 'history', element: <HistoryPage /> },
            { path: 'history/:id', element: <HistoryDetailPage /> },
            { path: 'settings', element: <SettingsPage /> },
          ],
        },
      ],
    },
  ];
  return useRoutes(routes);
}

export default AppRoutes;