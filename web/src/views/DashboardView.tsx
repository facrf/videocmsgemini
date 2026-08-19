import React, { useState } from 'react';
import {
  Camera as CameraIcon,
  CheckCircle2,
  XCircle,
  Lock,
  Activity,
  Compass,
  Plus,
  Play,
  RefreshCw,
} from 'lucide-react';
import { Camera, DiscoveryJob, SystemStats } from '../types';
import { api } from '../api/client';
import { NavTab } from '../components/Sidebar';

interface DashboardViewProps {
  stats: SystemStats | null;
  cameras: Camera[];
  recentJobs: DiscoveryJob[];
  onNavigate: (tab: NavTab) => void;
  onAddCamera: () => void;
  onOpenSnapshot: (cam: Camera) => void;
  onOpenDiagnostics: (cam: Camera) => void;
  onRefresh?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  cameras = [],
  recentJobs = [],
  onNavigate,
  onAddCamera,
  onOpenSnapshot,
  onOpenDiagnostics,
  onRefresh,
}) => {
  const safeCameras = cameras || [];
  const safeRecentJobs = recentJobs || [];
  const [testingAll, setTestingAll] = useState(false);
  const [batchResults, setBatchResults] = useState<{ success: number; failed: number } | null>(null);

  const onlineCameras = safeCameras.filter((c) => c && c.status === 'online');
  const offlineCameras = safeCameras.filter((c) => c && c.status === 'offline');
  const authCameras = safeCameras.filter((c) => c && c.status === 'auth_required');

  const handleTestAll = async () => {
    setTestingAll(true);
    setBatchResults(null);
    try {
      const res = await api.testAllCameras();
      const succ = (res?.results || []).filter((r) => r.success).length;
      setBatchResults({
        success: succ,
        failed: (res?.results?.length || 0) - succ,
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Batch test failed', err);
    } finally {
      setTestingAll(false);
    }
  };

  return (
    <div className="p-5 sm:p-7 space-y-6 overflow-y-auto h-full select-none bg-[#0a0a12]">
      {/* Top Banner */}
      <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-100">
              Monitoramento & Gestão de Câmeras IP
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Plataforma VMS unificada com suporte a ONVIF, RTSP, detecção automática na rede local (WS-Discovery), ingestão compartilhada 1:N sem sobrecarga e grade em tempo real de 1 a 32 câmeras.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button
              onClick={handleTestAll}
              disabled={testingAll || cameras.length === 0}
              className="flex-1 sm:flex-initial px-4 py-2.5 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/40 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 text-blue-500 ${testingAll ? 'animate-spin-custom' : ''}`} />
              <span>{testingAll ? 'Testando Câmeras...' : 'Testar Conexões'}</span>
            </button>
            <button
              onClick={() => onNavigate('discovery')}
              className="flex-1 sm:flex-initial px-4 py-2.5 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/40 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <Compass className="w-4 h-4 text-cyan-500" />
              <span>Varredura de Rede</span>
            </button>
            <button
              onClick={onAddCamera}
              className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Câmera</span>
            </button>
          </div>
        </div>

        {batchResults && (
          <div className="mt-5 p-3.5 bg-slate-900 border border-slate-700/40 rounded-lg text-sm flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-emerald-500 font-medium flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> {batchResults.success} online</span>
              {batchResults.failed > 0 && <span className="text-rose-500 font-medium flex items-center gap-1.5"><XCircle className="w-4 h-4" /> {batchResults.failed} com falha</span>}
            </div>
            <button onClick={() => setBatchResults(null)} className="text-slate-500 hover:text-slate-300 transition-colors">✕</button>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Cameras */}
        <div
          onClick={() => onNavigate('cameras')}
          className="p-5 bg-slate-800/50 border border-slate-700/40 rounded-xl cursor-pointer hover:bg-slate-800 transition-colors shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center space-x-3 text-slate-400">
            <div className="p-2 rounded-full bg-blue-500/10 text-blue-500">
              <CameraIcon className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">Total Câmeras</span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-slate-100">
              {stats?.total_cameras || cameras.length}
            </span>
          </div>
        </div>

        {/* Online */}
        <div
          onClick={() => onNavigate('cameras')}
          className="p-5 bg-slate-800/50 border border-slate-700/40 rounded-xl cursor-pointer hover:bg-slate-800 transition-colors shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center space-x-3 text-slate-400">
            <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">Online & Ativas</span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-slate-100">
              {stats?.online || onlineCameras.length}
            </span>
          </div>
        </div>

        {/* Offline */}
        <div
          onClick={() => onNavigate('cameras')}
          className="p-5 bg-slate-800/50 border border-slate-700/40 rounded-xl cursor-pointer hover:bg-slate-800 transition-colors shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center space-x-3 text-slate-400">
            <div className="p-2 rounded-full bg-rose-500/10 text-rose-500">
              <XCircle className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">Offline</span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-slate-100">
              {stats?.offline || offlineCameras.length}
            </span>
          </div>
        </div>

        {/* Auth Required */}
        <div
          onClick={() => onNavigate('cameras')}
          className="p-5 bg-slate-800/50 border border-slate-700/40 rounded-xl cursor-pointer hover:bg-slate-800 transition-colors shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center space-x-3 text-slate-400">
            <div className="p-2 rounded-full bg-amber-500/10 text-amber-500">
              <Lock className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">Requer Senha</span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-slate-100">
              {stats?.auth_required || authCameras.length}
            </span>
          </div>
        </div>

        {/* Active Streams */}
        <div
          onClick={() => onNavigate('live')}
          className="col-span-2 lg:col-span-1 p-5 bg-slate-800/50 border border-slate-700/40 rounded-xl cursor-pointer hover:bg-slate-800 transition-colors shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center space-x-3 text-slate-400">
            <div className="p-2 rounded-full bg-cyan-500/10 text-cyan-500">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <span className="text-sm font-medium">Streams Ativos</span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-slate-100">
              {stats?.active_streams || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Live Preview & Scans */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Live Preview Cards */}
        <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700/40 rounded-xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium text-slate-100 flex items-center gap-2">
                <Play className="w-4 h-4 text-cyan-500" /> Transmissões ao Vivo
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Ingestão compartilhada de baixo consumo (1 conexão RTSP física → N visualizadores)
              </p>
            </div>
            <button
              onClick={() => onNavigate('live')}
              className="px-4 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/40 rounded-lg transition-colors shadow-sm"
            >
              Mosaico Completo
            </button>
          </div>

          {onlineCameras.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center bg-slate-900 border border-slate-700/40 rounded-xl p-6 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 text-slate-500">
                <CameraIcon className="w-8 h-8" />
              </div>
              <p className="text-base font-medium text-slate-100">Nenhuma câmera transmitindo no momento</p>
              <p className="text-sm text-slate-400 mt-2 max-w-sm">
                Cadastre novas câmeras IP ou inicie uma varredura na rede para monitorar os streams de vídeo.
              </p>
              <button
                onClick={() => onNavigate('discovery')}
                className="mt-6 px-4 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 transition-colors shadow-sm"
              >
                <Compass className="w-4 h-4" /> Fazer Varredura de Rede
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {onlineCameras.slice(0, 6).map((cam) => (
                <div
                  key={cam.id}
                  className="bg-black rounded-xl overflow-hidden border border-slate-700/40 group flex flex-col shadow-sm"
                >
                  <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                    <img
                      src={api.getLiveStreamUrl(cam.id, 'sub')}
                      alt={cam.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 flex items-center space-x-1.5 bg-black/60 px-2 py-1 rounded text-xs font-mono text-slate-100">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-online" />
                      <span className="truncate max-w-[120px]">{cam.name}</span>
                    </div>
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1.5">
                      <button
                        onClick={() => onOpenSnapshot(cam)}
                        title="Snapshot"
                        className="p-1.5 rounded bg-black/60 hover:bg-slate-800 text-slate-100 text-xs border border-slate-700/40"
                      >
                        <CameraIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-900 border-t border-slate-700/40 flex items-center justify-between text-sm">
                    <span className="font-mono text-slate-400">{cam.host}</span>
                    <button
                      onClick={() => onOpenDiagnostics(cam)}
                      className="font-medium text-blue-500 hover:text-blue-400"
                    >
                      Diagnóstico
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Discovery & Tasks Card */}
        <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-6 space-y-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium text-slate-100 flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-500" /> Varreduras Recentes
            </h3>
            <button
              onClick={() => onNavigate('discovery')}
              className="text-sm font-medium text-blue-500 hover:text-blue-400"
            >
              Nova Varredura
            </button>
          </div>

          {safeRecentJobs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm bg-slate-900 border border-slate-700/40 rounded-xl p-4 shadow-sm">
              Nenhuma varredura executada recentemente.
            </div>
          ) : (
            <div className="space-y-3 flex-1">
              {safeRecentJobs.slice(0, 4).map((job) => (
                <div
                  key={job.id}
                  onClick={() => onNavigate('discovery')}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-700/40 cursor-pointer hover:bg-slate-800 transition-colors space-y-3 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-medium text-slate-200">
                      {job.cidr || 'WS-Discovery'}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-md font-medium border ${
                        job.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          : job.status === 'running'
                          ? 'bg-blue-500/10 text-blue-500 border-blue-500/20 animate-pulse'
                          : 'bg-slate-800 text-slate-400 border-slate-700/40'
                      }`}
                    >
                      {job.status === 'completed' ? 'Concluído' : job.status === 'running' ? 'Em andamento' : 'Pendente'}
                    </span>
                  </div>

                  {job.status === 'running' && (
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>{job.found_devices} dispositivos</span>
                    <span className="font-mono">{new Date(job.created_at).toLocaleTimeString('pt-BR')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
