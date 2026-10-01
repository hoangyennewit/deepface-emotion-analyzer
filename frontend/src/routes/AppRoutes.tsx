import { useRoutes } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { HomePage } from '../pages/HomePage';
import { ImageAnalysisPage } from '../pages/ImageAnalysisPage';
import VideoAnalysisPage from '../pages/VideoAnalysisPage';
import { WebcamAnalysisPage } from '../pages/WebcamAnalysisPage';
import { HistoryPage } from '../pages/HistoryPage';
import { HistoryDetailPage } from '../pages/HistoryDetailPage';
import { SettingsPage } from '../pages/SettingsPage';

function AppRoutes() {
  const routes = [
    {
      path: '/',
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
  ];
  return useRoutes(routes);
}

export default AppRoutes;