import React, { useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar, NavTab } from './Sidebar';
import { useAppStore } from '../store';

import { useEvents, SSEEvent } from '../hooks/useEvents';
import { DiagnosticsModal } from './DiagnosticsModal';
import { SnapshotModal } from './SnapshotModal';
import { CameraModal } from './CameraModal';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    cameras,
    stats,
    recentJobs,
    isRefreshing,
    sseConnected,
    diagnosticsCamera,
    snapshotCamera,
    showAddCameraModal,
    toasts,
    loadData,
    loadCameras,
    loadStats,
    loadJobs,
    loadLayouts,
    setSseConnected,
    setDiagnosticsCamera,
    setSnapshotCamera,
    setShowAddCameraModal,
    removeToast,
    showToast
  } = useAppStore();

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSSEEvent = useCallback(
    (event: SSEEvent) => {
      if (event.type.startsWith('camera.')) {
        loadCameras();
        loadStats();
        if (event.type === 'camera.created') {
          showToast(`Nova câmera adicionada ao sistema.`, 'info');
        }
      } else if (event.type.startsWith('discovery.')) {
        loadJobs();
        loadStats();
      } else if (event.type.startsWith('layout.')) {
        loadLayouts();
      } else if (event.type.startsWith('stream.')) {
        loadStats();
      }
    },
    [loadCameras, loadStats, loadJobs, loadLayouts, showToast]
  );

  const { connected } = useEvents(handleSSEEvent);

  useEffect(() => {
    setSseConnected(connected);
  }, [connected, setSseConnected]);

  // Determine active tab from pathname
  const path = location.pathname.split('/')[1] || 'dashboard';
  const activeTab = path as NavTab;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0a0a12] text-slate-100 overflow-hidden select-none">
      <Header
        stats={stats}
        sseConnected={sseConnected}
        onRefresh={loadData}
        isRefreshing={isRefreshing}
        onAddCamera={() => setShowAddCameraModal(true)}
      />

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => navigate(`/${tab === 'dashboard' ? '' : tab}`)}
          cameraCount={cameras?.length || 0}
          discoveredCount={(recentJobs || []).find((j) => j && j.status === 'running')?.found_devices || 0}
        />

        <main className="flex-1 bg-[#0a0a12] overflow-hidden relative">
          <Outlet />
        </main>
      </div>

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

      {/* Toasts */}
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
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
