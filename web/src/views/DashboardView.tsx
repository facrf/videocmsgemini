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
  onOpenDiagnostics,
}) => {
  const onlineCameras = cameras.filter((c) => c.status === 'online');

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Central de Monitoramento & Gestão de Câmeras IP
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Plataforma VMS com suporte a ONVIF, RTSP, Substreams adaptativos e grade de até 32 câmeras.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigate('discovery')}
            className="px-3.5 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 flex items-center gap-1.5 transition shadow-sm"
          >
            <Compass className="w-4 h-4 text-blue-400" />
            Descobrir Câmeras
          </button>
          <button
            onClick={onAddCamera}
            className="px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-1.5 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nova Câmera
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Cameras */}
        <div
          onClick={() => onNavigate('cameras')}
          className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total de Câmeras</span>
            <CameraIcon className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-white">{stats?.total_cameras || cameras.length}</span>
            <span className="text-[10px] text-blue-400 hover:underline flex items-center">
              Ver todas <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Online */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Online</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">{stats?.online || 0}</span>
            <span className="text-xs text-slate-500 font-mono">dispositivos</span>
          </div>
        </div>

        {/* Offline */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Offline</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-rose-400">{stats?.offline || 0}</span>
            <span className="text-xs text-slate-500 font-mono">inacessíveis</span>
          </div>
        </div>

        {/* Auth Required */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Requer Senha</span>
            <Lock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-amber-400">{stats?.auth_required || 0}</span>
            <span className="text-xs text-slate-500 font-mono">bloqueadas</span>
          </div>
        </div>

        {/* Active Shared Streams */}
        <div
          onClick={() => onNavigate('live')}
          className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 cursor-pointer transition flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Streams Ativos</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-cyan-400">{stats?.active_streams || 0}</span>
            <span className="text-[10px] text-cyan-400 hover:underline flex items-center">
              Abrir Grade <Grid className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </div>
      </div>

      {/* Snapshots & Live Quick Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Live Preview Cards (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Play className="w-4 h-4 text-blue-400" /> Câmeras Conectadas (Miniatura ao Vivo)
              </h3>
              <p className="text-xs text-slate-400">Transmissão em tempo real via StreamManager compartilhado</p>
            </div>
            <button
              onClick={() => onNavigate('live')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
            >
              Ver em Grade (1-32) <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {onlineCameras.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-500">
              <CameraIcon className="w-10 h-10 mb-2 text-slate-600" />
              <p className="text-xs font-medium text-slate-400">Nenhuma câmera online no momento</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Cadastre ou inicie uma descoberta na rede para monitorar transmissões.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {onlineCameras.slice(0, 6).map((cam) => (
                <div
                  key={cam.id}
                  className="bg-slate-950 rounded-lg overflow-hidden border border-slate-800 hover:border-slate-700 transition group flex flex-col"
                >
                  <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                    <img
                      src={api.getLiveStreamUrl(cam.id, 'sub')}
                      alt={cam.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1.5 left-1.5 flex items-center space-x-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] font-mono text-white">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-online" />
                      <span className="truncate max-w-[100px]">{cam.name}</span>
                    </div>
                  </div>
                  <div className="p-2 bg-slate-900/80 flex items-center justify-between text-[11px]">
                    <span className="font-mono text-slate-400 text-[10px]">{cam.host}</span>
                    <button
                      onClick={() => onOpenDiagnostics(cam)}
                      className="text-[10px] text-blue-400 hover:underline"
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
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-blue-400" /> Varreduras Recentes
              </h3>
              <button
                onClick={() => onNavigate('discovery')}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Nova Varredura
              </button>
            </div>

            {recentJobs.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                Nenhuma varredura executada recentemente.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentJobs.slice(0, 4).map((job) => (
                  <div
                    key={job.id}
                    onClick={() => onNavigate('discovery')}
                    className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer transition text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-semibold text-slate-200">{job.cidr || 'WS-Discovery'}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                          job.status === 'completed'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : job.status === 'running'
                            ? 'bg-blue-950 text-blue-400 border border-blue-800 animate-pulse'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {job.status.toUpperCase()}
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

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{job.found_devices} dispositivos encontrados</span>
                      <span>{new Date(job.created_at).toLocaleTimeString('pt-BR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-lg text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center space-x-1.5 text-slate-300 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Proteção SSRF Ativa</span>
            </div>
            <p className="text-[10px] text-slate-500">
              Conexões e varreduras restritas a redes privadas RFC 1918 autorizadas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
