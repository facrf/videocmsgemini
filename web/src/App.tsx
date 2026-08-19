import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardView } from './views/DashboardView';
import { LiveView } from './views/LiveView';
import { CamerasView } from './views/CamerasView';
import { DiscoveryView } from './views/DiscoveryView';
import { LayoutsView } from './views/LayoutsView';
import { SettingsView } from './views/SettingsView';
import { DiagnosticsModal } from './components/DiagnosticsModal';
import { SnapshotModal } from './components/SnapshotModal';
import { CameraModal } from './components/CameraModal';
import { Camera, DiscoveryJob, Layout, SystemStats } from './types';
import { api } from './api/client';
import { useEvents, SSEEvent } from './hooks/useEvents';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [recentJobs, setRecentJobs] = useState<DiscoveryJob[]>([]);
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Global Modals State
  const [diagnosticsCamera, setDiagnosticsCamera] = useState<Camera | null>(null);
  const [snapshotCamera, setSnapshotCamera] = useState<Camera | null>(null);
  const [showAddCameraModal, setShowAddCameraModal] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [cams, st, jbs, lay] = await Promise.all([
        api.listCameras(),
        api.getStats(),
        api.listDiscoveryJobs(),
        api.listLayouts(),
      ]);
      setCameras(cams);
      setStats(st);
      setRecentJobs(jbs);
      setLayouts(lay);
    } catch (err: any) {
      console.error('Failed to load data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time SSE handler
  const handleSSEEvent = useCallback(
    (event: SSEEvent) => {
      if (event.type.startsWith('camera.')) {
        api.listCameras().then(setCameras).catch(() => {});
        api.getStats().then(setStats).catch(() => {});
      } else if (event.type.startsWith('discovery.')) {
        api.listDiscoveryJobs().then(setRecentJobs).catch(() => {});
        api.getStats().then(setStats).catch(() => {});
      } else if (event.type.startsWith('layout.')) {
        api.listLayouts().then(setLayouts).catch(() => {});
      } else if (event.type.startsWith('stream.')) {
        api.getStats().then(setStats).catch(() => {});
      }
    },
    []
  );

  const { connected: sseConnected } = useEvents(handleSSEEvent);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Top Header */}
      <Header
        stats={stats}
        sseConnected={sseConnected}
        onRefresh={loadData}
        isRefreshing={isRefreshing}
      />

      {/* Main Area: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          cameraCount={cameras.length}
          discoveredCount={recentJobs.find((j) => j.status === 'running')?.found_devices}
        />

        <main className="flex-1 bg-slate-950 overflow-hidden relative">
          {activeTab === 'dashboard' && (
            <DashboardView
              stats={stats}
              cameras={cameras}
              recentJobs={recentJobs}
              onNavigate={setActiveTab}
              onAddCamera={() => setShowAddCameraModal(true)}
              onOpenSnapshot={(cam) => setSnapshotCamera(cam)}
              onOpenDiagnostics={(cam) => setDiagnosticsCamera(cam)}
            />
          )}

          {activeTab === 'live' && (
            <LiveView
              cameras={cameras}
              layouts={layouts}
              onOpenSnapshot={(cam) => setSnapshotCamera(cam)}
              onOpenDiagnostics={(cam) => setDiagnosticsCamera(cam)}
              onRefreshLayouts={loadData}
            />
          )}

          {activeTab === 'cameras' && (
            <CamerasView
              cameras={cameras}
              onRefresh={loadData}
              onOpenSnapshot={(cam) => setSnapshotCamera(cam)}
              onOpenDiagnostics={(cam) => setDiagnosticsCamera(cam)}
              showToast={showToast}
            />
          )}

          {activeTab === 'discovery' && (
            <DiscoveryView
              jobs={recentJobs}
              onRefreshJobs={loadData}
              onCameraAdded={loadData}
              showToast={showToast}
            />
          )}

          {activeTab === 'layouts' && (
            <LayoutsView
              layouts={layouts}
              onRefresh={loadData}
              onNavigate={setActiveTab}
              showToast={showToast}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView stats={stats} sseConnected={sseConnected} />
          )}
        </main>
      </div>

      {/* Global Modals */}
      {diagnosticsCamera && (
        <DiagnosticsModal
          camera={diagnosticsCamera}
          onClose={() => setDiagnosticsCamera(null)}
        />
      )}

      {snapshotCamera && (
        <SnapshotModal
          camera={snapshotCamera}
          onClose={() => setSnapshotCamera(null)}
        />
      )}

      {showAddCameraModal && (
        <CameraModal
          camera={null}
          onClose={() => setShowAddCameraModal(false)}
          onSave={() => {
            loadData();
            showToast('Câmera cadastrada com sucesso!', 'success');
          }}
        />
      )}

      {/* Toast Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2.5 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`p-3.5 rounded-2xl shadow-2xl text-xs font-semibold border pointer-events-auto backdrop-blur-md transition-all duration-300 max-w-sm flex items-center space-x-3 ${
              t.type === 'success'
                ? 'bg-emerald-950/95 text-emerald-200 border-emerald-800/80 shadow-emerald-950/50'
                : t.type === 'error'
                ? 'bg-rose-950/95 text-rose-200 border-rose-800/80 shadow-rose-950/50'
                : 'bg-slate-900/95 text-slate-200 border-slate-700/80 shadow-slate-950/50'
            }`}
          >
            <span className="leading-snug">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
