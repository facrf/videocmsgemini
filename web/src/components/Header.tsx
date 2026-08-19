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
} from 'lucide-react';
import { SystemStats } from '../types';

interface HeaderProps {
  stats: SystemStats | null;
  sseConnected: boolean;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  sseConnected,
  onRefresh,
  isRefreshing = false,
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
    <header className="h-14 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between select-none z-30 shadow-md">
      {/* Brand & Identity */}
      <div className="flex items-center space-x-3.5">
        <div className="relative group flex items-center justify-center">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
            <Video className="w-4.5 h-4.5" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold tracking-wider text-white text-sm">
              VIDEO<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">CMS</span>
            </span>
            <span className="text-[9px] font-mono font-semibold uppercase bg-blue-950/70 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800/50 shadow-sm">
              VMS v1.0
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium tracking-tight hidden sm:block">
            Central de Monitoramento & Ingestão IP
          </p>
        </div>
      </div>

      {/* Center Status Indicators */}
      <div className="hidden lg:flex items-center space-x-3">
        {/* SSE Live Connection */}
        <div
          className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-mono transition-all duration-300 border ${
            sseConnected
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
              : 'bg-rose-950/40 text-rose-300 border-rose-800/50'
          }`}
        >
          <span className="relative flex h-2 w-2">
            {sseConnected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                sseConnected ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
          </span>
          <span className="text-[11px] font-semibold tracking-wide flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-slate-400" />
            {sseConnected ? 'SSE CONECTADO' : 'DESCONECTADO'}
          </span>
        </div>

        {/* Active Streams */}
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-950/70 border border-slate-800 text-cyan-300 text-xs font-mono shadow-inner">
          <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="font-bold text-white">{stats?.active_streams || 0}</span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">STREAMS ATIVOS</span>
        </div>

        {/* Total Cameras Online */}
        {stats && (
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-950/70 border border-slate-800 text-slate-300 text-xs font-mono shadow-inner">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-emerald-400 font-bold">{stats.online}</span>
            <span className="text-slate-500">/</span>
            <span className="text-white font-bold">{stats.total_cameras}</span>
            <span className="text-emerald-400 text-[10px] font-semibold tracking-wider">ONLINE</span>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2.5">
        {/* Real-time Clock */}
        <div className="hidden sm:flex items-center space-x-2 text-slate-200 font-mono text-xs px-3 py-1.5 bg-slate-950/70 border border-slate-800 rounded-lg shadow-inner">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-slate-400 text-[11px] capitalize">{dateStr}</span>
          <span className="text-slate-600">|</span>
          <span className="font-semibold text-white tracking-widest">{time}</span>
        </div>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Sair da Tela Cheia' : 'Modo Tela Cheia'}
          className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/70 transition hover:shadow-sm"
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>

        {/* Manual Refresh */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Atualizar dados do sistema"
          className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/70 transition hover:shadow-sm disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? 'animate-spin-custom text-blue-400' : ''}`}
          />
        </button>
      </div>
    </header>
  );
};

