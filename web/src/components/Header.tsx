import React, { useState, useEffect } from 'react';
import {
  Video,
  Activity,
  Radio,
  Clock,
  RefreshCw,
  Maximize,
  Minimize,
  Layers,
  Plus,
} from 'lucide-react';
import { SystemStats } from '../types';

interface HeaderProps {
  stats: SystemStats | null;
  sseConnected: boolean;
  onRefresh: () => void;
  isRefreshing?: boolean;
  onAddCamera?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  sseConnected,
  onRefresh,
  isRefreshing = false,
  onAddCamera,
}) => {
  const [time, setTime] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
      setDateStr(now.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <header className="h-15 glass-header px-4 sm:px-6 flex items-center justify-between select-none z-30 shadow-2xl relative">
      {/* Brand & Identity */}
      <div className="flex items-center space-x-3.5">
        <div className="relative group flex items-center justify-center">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform duration-200 ring-1 ring-white/20">
            <Video className="w-5 h-5" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#060911] shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <span className="font-black tracking-wider text-white text-base font-mono">
              VIDEO<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400">CMS</span>
            </span>
            <span className="text-[10px] font-mono font-bold uppercase bg-gradient-to-r from-blue-950 to-indigo-950 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30 shadow-sm shadow-cyan-500/10">
              VMS v1.0
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium tracking-tight hidden sm:flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Central de Monitoramento & Ingestão IP
          </p>
        </div>
      </div>

      {/* Center Status Indicators */}
      <div className="hidden lg:flex items-center space-x-3">
        {/* SSE Live Connection */}
        <div
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all duration-300 border ${
            sseConnected
              ? 'bg-emerald-950/50 text-emerald-300 border-emerald-700/60 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
              : 'bg-rose-950/50 text-rose-300 border-rose-700/60'
          }`}
        >
          <span className="relative flex h-2 w-2">
            {sseConnected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                sseConnected ? 'bg-emerald-400' : 'bg-rose-500'
              }`}
            />
          </span>
          <span className="text-[11px] font-bold tracking-wide flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-slate-400" />
            {sseConnected ? 'SSE LIVE' : 'OFFLINE'}
          </span>
        </div>

        {/* Active Streams */}
        <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-cyan-300 text-xs font-mono shadow-inner">
          <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="font-black text-white text-sm">{stats?.active_streams || 0}</span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">STREAMS</span>
        </div>

        {/* Total Cameras Online */}
        {stats && (
          <div className="flex items-center space-x-2.5 px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-300 text-xs font-mono shadow-inner">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-emerald-400 font-black text-sm">{stats.online}</span>
            <span className="text-slate-600 font-bold">/</span>
            <span className="text-white font-black text-sm">{stats.total_cameras}</span>
            <span className="text-emerald-400 text-[10px] font-bold tracking-wider uppercase">ONLINE</span>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2.5">
        {onAddCamera && (
          <button
            onClick={onAddCamera}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition hover:scale-105"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar</span>
          </button>
        )}

        {/* Real-time Clock */}
        <div className="hidden md:flex items-center space-x-2.5 text-slate-200 font-mono text-xs px-3.5 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-xl shadow-inner">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-slate-400 text-[11px] capitalize font-medium">{dateStr}</span>
          <span className="text-slate-700 font-bold">|</span>
          <span className="font-bold text-white tracking-widest">{time}</span>
        </div>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Sair da Tela Cheia' : 'Modo Tela Cheia'}
          className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/70 transition shadow-md hover:scale-105"
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>

        {/* Manual Refresh */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Atualizar dados do sistema"
          className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/70 transition shadow-md hover:scale-105 disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? 'animate-spin-custom text-blue-400' : ''}`}
          />
        </button>
      </div>
    </header>
  );
};
