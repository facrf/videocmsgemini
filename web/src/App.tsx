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
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

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
    }, 4500);
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
      setCameras(cams || []);
      setStats(st || null);
      setRecentJobs(jbs || []);
      setLayouts(lay || []);
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
        api.listCameras().then((res) => setCameras(res || [])).catch(() => {});
        api.getStats().then(setStats).catch(() => {});
        if (event.type === 'camera.created') {
          showToast(`Nova câmera adicionada ao sistema.`, 'info');
        }
      } else if (event.type.startsWith('discovery.')) {
        api.listDiscoveryJobs().then((res) => setRecentJobs(res || [])).catch(() => {});
        api.getStats().then(setStats).catch(() => {});
      } else if (event.type.startsWith('layout.')) {
        api.listLayouts().then((res) => setLayouts(res || [])).catch(() => {});
      } else if (event.type.startsWith('stream.')) {
        api.getStats().then(setStats).catch(() => {});
      }
    },
    [showToast]
  );

  const { connected: sseConnected } = useEvents(handleSSEEvent);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0a0a12] text-slate-100 overflow-hidden select-none">
      {/* Top Header */}
      <Header
        stats={stats}
        sseConnected={sseConnected}
        onRefresh={loadData}
        isRefreshing={isRefreshing}
        onAddCamera={() => setShowAddCameraModal(true)}
      />

      {/* Main Area: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          cameraCount={cameras?.length || 0}
          discoveredCount={(recentJobs || []).find((j) => j && j.status === 'running')?.found_devices || 0}
        />

        <main className="flex-1 bg-[#0a0a12] overflow-hidden relative">
          {activeTab === 'dashboard' && (
            <DashboardView
              stats={stats}
              cameras={cameras}
              recentJobs={recentJobs}
              onNavigate={setActiveTab}
              onAddCamera={() => setShowAddCameraModal(true)}
              onOpenSnapshot={(cam) => setSnapshotCamera(cam)}
              onOpenDiagnostics={(cam) => setDiagnosticsCamera(cam)}
              onRefresh={loadData}
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

      {/* Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`p-3.5 rounded-xl shadow-lg text-xs font-semibold border pointer-events-auto transition-all duration-200 max-w-sm flex items-center justify-between space-x-3 ${
              t.type === 'success'
                ? 'bg-slate-900 text-emerald-300 border-emerald-500/30 shadow-emerald-950/20'
                : t.type === 'error'
                ? 'bg-slate-900 text-rose-300 border-rose-500/30 shadow-rose-950/20'
                : 'bg-slate-900 text-cyan-300 border-cyan-500/30 shadow-cyan-950/20'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              {t.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : t.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              )}
              <span className="leading-snug">{t.message}</span>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
