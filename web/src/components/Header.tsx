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
    <header className="h-14 bg-slate-900 border-b border-slate-700/40 px-4 sm:px-6 flex items-center justify-between select-none z-30">
      {/* Brand & Identity */}
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
          <Video className="w-4 h-4" />
        </div>
        <div className="flex items-center space-x-2">
          <span className="font-bold text-slate-100 text-lg">
            VideoCMS
          </span>
          <span className="text-[10px] font-mono font-medium bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700/40">
            v1.0
          </span>
        </div>
      </div>

      {/* Center Status Indicators */}
      <div className="hidden lg:flex items-center space-x-3">
        {/* SSE Live Connection */}
        <div
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs transition-colors border ${
            sseConnected
              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
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
          <span className="font-medium flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5" />
            {sseConnected ? 'SSE Live' : 'Offline'}
          </span>
        </div>

        {/* Active Streams */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700/40 text-slate-300 text-xs">
          <Activity className="w-3.5 h-3.5 text-cyan-500" />
          <span className="font-mono text-slate-100">{stats?.active_streams || 0}</span>
          <span className="text-slate-500 font-medium">Streams</span>
        </div>

        {/* Total Cameras Online */}
        {stats && (
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700/40 text-slate-300 text-xs">
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            <div className="font-mono flex items-center space-x-1">
              <span className="text-emerald-500">{stats.online}</span>
              <span className="text-slate-500">/</span>
              <span className="text-slate-100">{stats.total_cameras}</span>
            </div>
            <span className="text-slate-500 font-medium">Câmeras</span>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2">
        {onAddCamera && (
          <button
            onClick={onAddCamera}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar</span>
          </button>
        )}

        {/* Real-time Clock */}
        <div className="hidden md:flex items-center space-x-2 text-slate-300 text-sm px-3 py-1.5 bg-slate-800 border border-slate-700/40 rounded-lg">
          <Clock className="w-4 h-4 text-slate-400" />
          <span className="capitalize">{dateStr}</span>
          <span className="text-slate-600">|</span>
          <span className="font-mono text-slate-100">{time}</span>
        </div>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Sair da Tela Cheia' : 'Modo Tela Cheia'}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 border border-slate-700/40 transition-colors"
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>

        {/* Manual Refresh */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Atualizar dados do sistema"
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 border border-slate-700/40 transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? 'animate-spin-custom text-blue-500' : ''}`}
          />
        </button>
      </div>
    </header>
  );
}
