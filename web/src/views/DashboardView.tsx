import React from 'react';
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
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  cameras,
  recentJobs,
  onNavigate,
  onAddCamera,
  onOpenSnapshot,
  onOpenDiagnostics,
}) => {
  const onlineCameras = cameras.filter((c) => c.status === 'online');

  return (
    <div className="p-5 sm:p-7 space-y-6 overflow-y-auto h-full select-none">
      {/* Top Banner / Command Center Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40 border border-slate-800/80 p-6 shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center space-x-2.5 mb-1.5">
              <span className="flex h-2 w-2 rounded-full bg-blue-400" />
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-blue-400">
                Painel de Controle Central
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Monitoramento & Gestão de Câmeras IP
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Plataforma VMS unificada com suporte a ONVIF, RTSP, detecção automática, substreams adaptativos e grade em tempo real de até 32 câmeras.
            </p>
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto">
            <button
              onClick={() => onNavigate('discovery')}
              className="flex-1 md:flex-initial px-4 py-2.5 text-xs font-semibold bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 rounded-xl border border-slate-700/80 flex items-center justify-center gap-2 transition-all duration-150 shadow-md hover:border-slate-600"
            >
              <Compass className="w-4 h-4 text-blue-400" />
              <span>Varredura de Rede</span>
            </button>
            <button
              onClick={onAddCamera}
              className="flex-1 md:flex-initial px-4 py-2.5 text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl flex items-center justify-center gap-2 transition-all duration-150 shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Câmera</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Cameras */}
        <div
          onClick={() => onNavigate('cameras')}
          className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-blue-500/40 cursor-pointer transition-all duration-200 flex flex-col justify-between group shadow-lg hover:shadow-blue-500/5 hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold tracking-wide">Total de Câmeras</span>
            <div className="p-2 rounded-xl bg-blue-950/60 border border-blue-800/40 text-blue-400 group-hover:scale-110 transition-transform">
              <CameraIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
              {stats?.total_cameras || cameras.length}
            </span>
            <span className="text-[10px] text-blue-400 font-semibold group-hover:underline flex items-center gap-0.5">
              Gerenciar <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Online */}
        <div
          onClick={() => onNavigate('cameras')}
          className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-emerald-500/40 cursor-pointer transition-all duration-200 flex flex-col justify-between group shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold tracking-wide">Online</span>
            <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400">
              {stats?.online || 0}
            </span>
            <span className="text-[10px] text-emerald-400/90 font-mono font-medium">
              ativas
            </span>
          </div>
        </div>

        {/* Offline */}
        <div
          onClick={() => onNavigate('cameras')}
          className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-rose-500/40 cursor-pointer transition-all duration-200 flex flex-col justify-between group shadow-lg hover:shadow-rose-500/5 hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold tracking-wide">Offline</span>
            <div className="p-2 rounded-xl bg-rose-950/60 border border-rose-800/40 text-rose-400 group-hover:scale-110 transition-transform">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-rose-400">
              {stats?.offline || 0}
            </span>
            <span className="text-[10px] text-rose-400/90 font-mono font-medium">
              sem sinal
            </span>
          </div>
        </div>

        {/* Auth Required */}
        <div
          onClick={() => onNavigate('cameras')}
          className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-amber-500/40 cursor-pointer transition-all duration-200 flex flex-col justify-between group shadow-lg hover:shadow-amber-500/5 hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold tracking-wide">Requer Senha</span>
            <div className="p-2 rounded-xl bg-amber-950/60 border border-amber-800/40 text-amber-400 group-hover:scale-110 transition-transform">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-400">
              {stats?.auth_required || 0}
            </span>
            <span className="text-[10px] text-amber-400/90 font-mono font-medium">
              bloqueadas
            </span>
          </div>
        </div>

        {/* Active Streams */}
        <div
          onClick={() => onNavigate('live')}
          className="col-span-2 lg:col-span-1 p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-cyan-500/40 cursor-pointer transition-all duration-200 flex flex-col justify-between group shadow-lg hover:shadow-cyan-500/5 hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold tracking-wide">Streams Ativos</span>
            <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-800/40 text-cyan-400 group-hover:scale-110 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-cyan-400">
              {stats?.active_streams || 0}
            </span>
            <span className="text-[10px] text-cyan-400 font-semibold group-hover:underline flex items-center gap-0.5">
              Grade <Grid className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Live Preview & Scans */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Live Preview Cards (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Play className="w-4 h-4 text-blue-400" /> Câmeras Conectadas em Tempo Real
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Transmissões ativas via StreamManager compartilhado (1:N sem sobrecarga)
              </p>
            </div>
            <button
              onClick={() => onNavigate('live')}
              className="px-3 py-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-950/50 hover:bg-blue-900/50 border border-blue-800/50 rounded-xl transition flex items-center gap-1.5 shadow-sm"
            >
              <span>Abrir Mosaico Completo (1-32)</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {onlineCameras.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center bg-slate-950/40 rounded-xl border border-slate-800/60 p-6">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-3 text-slate-600 shadow-inner">
                <CameraIcon className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-slate-300">Nenhuma câmera transmitindo no momento</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Cadastre novas câmeras IP ou inicie uma descoberta na rede para monitorar os streams.
              </p>
              <button
                onClick={() => onNavigate('discovery')}
                className="mt-4 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition flex items-center gap-1.5 shadow-md"
              >
                <Compass className="w-4 h-4" /> Fazer Varredura de Rede
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {onlineCameras.slice(0, 6).map((cam) => (
                <div
                  key={cam.id}
                  className="bg-black rounded-xl overflow-hidden border border-slate-800/90 hover:border-blue-500/50 transition-all duration-200 group flex flex-col shadow-md"
                >
                  <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                    <img
                      src={api.getLiveStreamUrl(cam.id, 'sub')}
                      alt={cam.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 flex items-center space-x-1.5 bg-black/75 backdrop-blur-sm px-2 py-0.5 rounded-lg text-[10px] font-mono text-white border border-white/10 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-online" />
                      <span className="truncate max-w-[110px] font-semibold">{cam.name}</span>
                    </div>
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                      <button
                        onClick={() => onOpenSnapshot(cam)}
                        title="Snapshot"
                        className="p-1 rounded bg-black/80 hover:bg-slate-800 text-white text-xs"
                      >
                        <CameraIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-400 text-[10px]">{cam.host}</span>
                    <button
                      onClick={() => onOpenDiagnostics(cam)}
                      className="text-[10px] font-semibold text-blue-400 hover:text-blue-300"
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
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-blue-400" /> Varreduras Recentes
              </h3>
              <button
                onClick={() => onNavigate('discovery')}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300"
              >
                Nova Varredura
              </button>
            </div>

            {recentJobs.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-slate-800/60 p-4">
                Nenhuma varredura executada recentemente.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentJobs.slice(0, 4).map((job) => (
                  <div
                    key={job.id}
                    onClick={() => onNavigate('discovery')}
                    className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition text-xs space-y-2 group shadow-sm"
                  >
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-bold text-slate-200 group-hover:text-blue-400 transition-colors">
                        {job.cidr || 'WS-Discovery'}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                          job.status === 'completed'
                            ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60'
                            : job.status === 'running'
                            ? 'bg-blue-950/80 text-blue-400 border-blue-800/60 animate-pulse'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {job.status.toUpperCase()}
                      </span>
                    </div>

                    {job.status === 'running' && (
                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{job.found_devices} dispositivos encontrados</span>
                      <span>{new Date(job.created_at).toLocaleTimeString('pt-BR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3.5 bg-gradient-to-b from-slate-950/80 to-slate-900/90 border border-slate-800 rounded-xl text-slate-400 space-y-1 shadow-inner">
            <div className="flex items-center space-x-2 text-slate-200 font-semibold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Proteção SSRF Ativa</span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Varreduras e conexões estritamente restritas a redes privadas RFC 1918 autorizadas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

