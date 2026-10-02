import { useRoutes } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { HomePage } from '../pages/HomePage';
import { ImageAnalysisPage } from '../pages/ImageAnalysisPage';
import VideoAnalysisPage from '../pages/VideoAnalysisPage';
import { WebcamAnalysis } from '../pages/WebcamAnalysis';
//import { HistoryPage } from '../pages/HistoryPage';
import { History } from '../pages/History';
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
        { path : 'webcam-analysis', element: <WebcamAnalysis /> },
        { path: 'history', element: <History /> },
        { path: 'history/:id', element: <HistoryDetailPage /> },
        { path: 'settings', element: <SettingsPage /> },
      ],
    },
  ];
  return useRoutes(routes);
}

export default AppRoutes;