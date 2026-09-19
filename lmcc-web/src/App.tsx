import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ImageProvider } from './context/ImageContext';
import { Home } from './pages/Home';
import { Scan } from './pages/Scan';
import { Processing } from './pages/Processing';
import { Results } from './pages/Results';
import { Report } from './pages/Report';
import { History } from './pages/History';
import { ReportDetail } from './pages/ReportDetail';
import { AuthorityDashboard } from './pages/AuthorityDashboard';
import { OfflineIndicator } from './components/OfflineIndicator';
import { InstallPrompt } from './components/InstallPrompt';
import { UpdatePrompt } from './components/UpdatePrompt';
import { LoadingScreen } from './components/loading/LoadingScreen';
import { initAutoSync } from './services/sync/reportSync';

export const App: React.FC = () => {
  const [showIntro, setShowIntro] = React.useState(true);

  React.useEffect(() => {
    const cleanup = initAutoSync();
    return cleanup;
  }, []);

  return (
    <ImageProvider>
      <BrowserRouter>
        {showIntro && <LoadingScreen onComplete={() => setShowIntro(false)} />}
        <OfflineIndicator />
        <InstallPrompt />
        <UpdatePrompt />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/processing" element={<Processing />} />
          <Route path="/results" element={<Results />} />
          <Route path="/report" element={<Report />} />
          <Route path="/history" element={<History />} />
          <Route path="/history/:id" element={<ReportDetail />} />
          <Route path="/authority" element={<AuthorityDashboard />} />
          <Route path="/authority-dashboard" element={<AuthorityDashboard />} />
          <Route path="/dashboard" element={<AuthorityDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ImageProvider>
  );
};

export default App;


