import React, { useState } from 'react';
import {
  Camera as CameraIcon,
  CheckCircle2,
  XCircle,
  Lock,
  Activity,
  Compass,
  Grid,
  Plus,
  Play,
  ArrowUpRight,
  ShieldCheck,
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
    <div className="p-5 sm:p-7 space-y-6 overflow-y-auto h-full select-none">
      {/* Top Banner / Command Center Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0d1424] via-[#111a30] to-[#0d182e] border border-slate-700/60 p-6 sm:p-7 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center space-x-2.5">
              <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,1)]" />
              <span className="text-[11px] font-mono font-black uppercase tracking-widest text-cyan-400">
                Security Operations Command Center
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Monitoramento & Gestão de Câmeras IP
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              Plataforma VMS unificada com suporte a ONVIF, RTSP, detecção automática na rede local (WS-Discovery), ingestão compartilhada 1:N sem sobrecarga e grade em tempo real de 1 a 32 câmeras.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button
              onClick={handleTestAll}
              disabled={testingAll || cameras.length === 0}
              className="flex-1 sm:flex-initial px-4 py-3 text-xs font-bold bg-slate-900/90 hover:bg-slate-800 text-slate-200 rounded-2xl border border-slate-700/80 flex items-center justify-center gap-2 transition-all duration-200 shadow-md hover:scale-105 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-blue-400 ${testingAll ? 'animate-spin-custom' : ''}`} />
              <span>{testingAll ? 'Testando Câmeras...' : 'Testar Conexões'}</span>
            </button>
            <button
              onClick={() => onNavigate('discovery')}
              className="flex-1 sm:flex-initial px-4 py-3 text-xs font-bold bg-slate-900/90 hover:bg-slate-800 text-slate-200 rounded-2xl border border-slate-700/80 flex items-center justify-center gap-2 transition-all duration-200 shadow-md hover:scale-105"
            >
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>Varredura de Rede</span>
            </button>
            <button
              onClick={onAddCamera}
              className="w-full sm:w-auto px-5 py-3 text-xs font-black bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-blue-600/30 hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Câmera</span>
            </button>
          </div>
        </div>

        {batchResults && (
          <div className="mt-4 p-3 bg-slate-950/80 border border-slate-700 rounded-xl text-xs font-mono flex items-center justify-between text-slate-300">
            <div className="flex items-center space-x-3">
              <span className="text-emerald-400 font-bold">✓ {batchResults.success} online</span>
              {batchResults.failed > 0 && <span className="text-rose-400 font-bold">✕ {batchResults.failed} com falha</span>}
            </div>
            <button onClick={() => setBatchResults(null)} className="text-slate-500 hover:text-white">✕</button>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Cameras */}
        <div
          onClick={() => onNavigate('cameras')}
          className="p-5 rounded-2xl glass-card cursor-pointer transition-all duration-200 flex flex-col justify-between group hover:-translate-y-1 shadow-xl"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold tracking-wide">Total Câmeras</span>
            <div className="p-2.5 rounded-xl bg-blue-950/80 border border-blue-800/60 text-blue-400 group-hover:scale-110 transition-transform shadow-md">
              <CameraIcon className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl sm:text-4xl font-black font-mono text-white">
              {stats?.total_cameras || cameras.length}
            </span>
            <span className="text-[11px] text-blue-400 font-bold group-hover:underline flex items-center gap-0.5">
              Ver Todas <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Online */}
        <div
          onClick={() => onNavigate('cameras')}
          className="p-5 rounded-2xl glass-card cursor-pointer transition-all duration-200 flex flex-col justify-between group hover:-translate-y-1 shadow-xl"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold tracking-wide">Online & Ativas</span>
            <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 group-hover:scale-110 transition-transform shadow-md">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl sm:text-4xl font-black font-mono text-emerald-400">
              {stats?.online || onlineCameras.length}
            </span>
            <span className="text-[10px] text-emerald-400/90 font-mono font-bold uppercase tracking-wider">
              Transmitindo
            </span>
          </div>
        </div>

        {/* Offline */}
        <div
          onClick={() => onNavigate('cameras')}
          className="p-5 rounded-2xl glass-card cursor-pointer transition-all duration-200 flex flex-col justify-between group hover:-translate-y-1 shadow-xl"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold tracking-wide">Offline</span>
            <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800/60 text-rose-400 group-hover:scale-110 transition-transform shadow-md">
              <XCircle className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl sm:text-4xl font-black font-mono text-rose-400">
              {stats?.offline || offlineCameras.length}
            </span>
            <span className="text-[10px] text-rose-400/90 font-mono font-bold uppercase tracking-wider">
              Sem Sinal
            </span>
          </div>
        </div>

        {/* Auth Required */}
        <div
          onClick={() => onNavigate('cameras')}
          className="p-5 rounded-2xl glass-card cursor-pointer transition-all duration-200 flex flex-col justify-between group hover:-translate-y-1 shadow-xl"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold tracking-wide">Requer Senha</span>
            <div className="p-2.5 rounded-xl bg-amber-950/80 border border-amber-800/60 text-amber-400 group-hover:scale-110 transition-transform shadow-md">
              <Lock className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl sm:text-4xl font-black font-mono text-amber-400">
              {stats?.auth_required || authCameras.length}
            </span>
            <span className="text-[10px] text-amber-400/90 font-mono font-bold uppercase tracking-wider">
              Bloqueadas
            </span>
          </div>
        </div>

        {/* Active Streams */}
        <div
          onClick={() => onNavigate('live')}
          className="col-span-2 lg:col-span-1 p-5 rounded-2xl glass-card cursor-pointer transition-all duration-200 flex flex-col justify-between group hover:-translate-y-1 shadow-xl"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold tracking-wide">Streams Ativos</span>
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 group-hover:scale-110 transition-transform shadow-md">
              <Activity className="w-4.5 h-4.5 animate-pulse" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl sm:text-4xl font-black font-mono text-cyan-400">
              {stats?.active_streams || 0}
            </span>
            <span className="text-[11px] text-cyan-400 font-bold group-hover:underline flex items-center gap-0.5">
              Grade <Grid className="w-3.5 h-3.5 ml-0.5" />
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Live Preview & Scans */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Live Preview Cards (2 cols) */}
        <div className="lg:col-span-2 bg-[#0c1220] border border-slate-800/90 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2 font-mono uppercase tracking-wider">
                <Play className="w-4 h-4 text-cyan-400" /> Transmissões ao Vivo
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Ingestão compartilhada de baixo consumo (1 conexão RTSP física → N visualizadores)
              </p>
            </div>
            <button
              onClick={() => onNavigate('live')}
              className="px-3.5 py-2 text-xs font-bold text-cyan-300 hover:text-white bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-700/60 rounded-xl transition flex items-center gap-1.5 shadow-md"
            >
              <span>Mosaico Completo (1-32)</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {onlineCameras.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center bg-slate-950/60 rounded-2xl border border-slate-800/80 p-6">
              <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-slate-600 shadow-inner">
                <CameraIcon className="w-8 h-8" />
              </div>
              <p className="text-sm font-extrabold text-slate-200">Nenhuma câmera transmitindo no momento</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Cadastre novas câmeras IP ou inicie uma varredura na rede para monitorar os streams de vídeo.
              </p>
              <button
                onClick={() => onNavigate('discovery')}
                className="mt-5 px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition flex items-center gap-2 shadow-lg shadow-blue-600/25"
              >
                <Compass className="w-4 h-4" /> Fazer Varredura de Rede
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {onlineCameras.slice(0, 6).map((cam) => (
                <div
                  key={cam.id}
                  className="bg-black rounded-2xl overflow-hidden border border-slate-800 hover:border-blue-500/60 transition-all duration-300 group flex flex-col shadow-xl"
                >
                  <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                    <img
                      src={api.getLiveStreamUrl(cam.id, 'sub')}
                      alt={cam.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2.5 left-2.5 flex items-center space-x-1.5 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-mono text-white border border-white/10 shadow-md">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-online" />
                      <span className="truncate max-w-[120px] font-bold">{cam.name}</span>
                    </div>
                    <div className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1.5">
                      <button
                        onClick={() => onOpenSnapshot(cam)}
                        title="Snapshot"
                        className="p-1.5 rounded-lg bg-black/80 hover:bg-slate-800 text-white text-xs border border-slate-700"
                      >
                        <CameraIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-400 text-[10px]">{cam.host}</span>
                    <button
                      onClick={() => onOpenDiagnostics(cam)}
                      className="text-[10px] font-bold text-blue-400 hover:text-blue-300 hover:underline"
                    >
                      Diagnóstico
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Discovery & Tasks Card (1 col) */}
        <div className="bg-[#0c1220] border border-slate-800/90 rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white flex items-center gap-2 font-mono uppercase tracking-wider">
                <Compass className="w-4 h-4 text-cyan-400" /> Varreduras Recentes
              </h3>
              <button
                onClick={() => onNavigate('discovery')}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 hover:underline"
              >
                Nova Varredura
              </button>
            </div>

            {safeRecentJobs.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs bg-slate-950/60 rounded-2xl border border-slate-800/80 p-4">
                Nenhuma varredura executada recentemente.
              </div>
            ) : (
              <div className="space-y-3">
                {safeRecentJobs.slice(0, 4).map((job) => (
                  <div
                    key={job.id}
                    onClick={() => onNavigate('discovery')}
                    className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800/90 hover:border-cyan-500/50 cursor-pointer transition-all text-xs space-y-2.5 group shadow-md"
                  >
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">
                        {job.cidr || 'WS-Discovery'}
                      </span>
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-black border ${
                          job.status === 'completed'
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-800/80'
                            : job.status === 'running'
                            ? 'bg-blue-950 text-blue-400 border-blue-800/80 animate-pulse'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        {job.status.toUpperCase()}
                      </span>
                    </div>

                    {job.status === 'running' && (
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>{job.found_devices} dispositivos encontrados</span>
                      <span>{new Date(job.created_at).toLocaleTimeString('pt-BR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800/90 rounded-2xl text-slate-400 space-y-1.5 shadow-inner">
            <div className="flex items-center space-x-2 text-slate-200 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Proteção SSRF Ativa</span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono leading-relaxed">
              Varreduras e conexões estritamente restritas a redes privadas RFC 1918 autorizadas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
