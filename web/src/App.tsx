
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { DashboardView } from './views/DashboardView';
import { LiveView } from './views/LiveView';
import { CamerasView } from './views/CamerasView';
import { DiscoveryView } from './views/DiscoveryView';
import { LayoutsView } from './views/LayoutsView';
import { SettingsView } from './views/SettingsView';
import { useAppStore } from './store';

// Helper components to connect views to Zustand store
const ConnectedDashboard = () => {
  const { stats, cameras, recentJobs, setShowAddCameraModal, setSnapshotCamera, setDiagnosticsCamera, loadData } = useAppStore();
  const navigate = useNavigate();
  return (
    <DashboardView
      stats={stats}
      cameras={cameras}
      recentJobs={recentJobs}
      onNavigate={(tab) => navigate(`/${tab === 'dashboard' ? '' : tab}`)}
      onAddCamera={() => setShowAddCameraModal(true)}
      onOpenSnapshot={(cam) => setSnapshotCamera(cam)}
      onOpenDiagnostics={(cam) => setDiagnosticsCamera(cam)}
      onRefresh={loadData}
    />
  );
};

const ConnectedLive = () => {
  const { cameras, layouts, setSnapshotCamera, setDiagnosticsCamera, loadData } = useAppStore();
  return (
    <LiveView
      cameras={cameras}
      layouts={layouts}
      onOpenSnapshot={(cam) => setSnapshotCamera(cam)}
      onOpenDiagnostics={(cam) => setDiagnosticsCamera(cam)}
      onRefreshLayouts={loadData}
    />
  );
};

const ConnectedCameras = () => {
  const { cameras, loadData, setSnapshotCamera, setDiagnosticsCamera, showToast } = useAppStore();
  return (
    <CamerasView
      cameras={cameras}
      onRefresh={loadData}
      onOpenSnapshot={(cam) => setSnapshotCamera(cam)}
      onOpenDiagnostics={(cam) => setDiagnosticsCamera(cam)}
      showToast={showToast}
    />
  );
};

const ConnectedDiscovery = () => {
  const { recentJobs, loadData, showToast } = useAppStore();
  return (
    <DiscoveryView
      jobs={recentJobs}
      onRefreshJobs={loadData}
      onCameraAdded={loadData}
      showToast={showToast}
    />
  );
};

const ConnectedLayouts = () => {
  const { layouts, loadData, showToast } = useAppStore();
  const navigate = useNavigate();
  return (
    <LayoutsView
      layouts={layouts}
      onRefresh={loadData}
      onNavigate={(tab) => navigate(`/${tab === 'dashboard' ? '' : tab}`)}
      showToast={showToast}
    />
  );
};

const ConnectedSettings = () => {
  const { stats, sseConnected } = useAppStore();
  return <SettingsView stats={stats} sseConnected={sseConnected} />;
};

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<ConnectedDashboard />} />
          <Route path="live" element={<ConnectedLive />} />
          <Route path="cameras" element={<ConnectedCameras />} />
          <Route path="discovery" element={<ConnectedDiscovery />} />
          <Route path="layouts" element={<ConnectedLayouts />} />
          <Route path="settings" element={<ConnectedSettings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
