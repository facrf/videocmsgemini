import React, { useState, useEffect } from 'react';
import {
  Video,
  Activity,
  Radio,
  Clock,
  RefreshCw,
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

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('pt-BR', { hour12: false }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between select-none">
      {/* Brand */}
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
          <Video className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold tracking-wide text-slate-100 text-sm">VIDEO<span className="text-blue-500">CMS</span></span>
            <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">v1.0</span>
          </div>
          <p className="text-[10px] text-slate-400">VMS & Monitoramento IP em Tempo Real</p>
        </div>
      </div>

      {/* Center Status Indicators */}
      <div className="hidden md:flex items-center space-x-4">
        {/* SSE Live Connection */}
        <div className="flex items-center space-x-2 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs">
          <span className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-emerald-500 animate-pulse-online' : 'bg-rose-500'}`} />
          <span className="text-slate-300 font-mono text-[11px] flex items-center gap-1">
            <Radio className="w-3 h-3 text-slate-400" />
            {sseConnected ? 'SSE CONECTADO' : 'DESCONECTADO'}
          </span>
        </div>

        {/* Active Streams */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-blue-950/40 border border-blue-800/40 text-blue-300 text-xs font-mono">
          <Activity className="w-3.5 h-3.5 text-blue-400" />
          <span>{stats?.active_streams || 0} STREAMS ATIVOS</span>
        </div>

        {/* Total Cameras Online */}
        {stats && (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs font-mono">
            <span className="text-emerald-400 font-semibold">{stats.online}</span>
            <span className="text-slate-400">/</span>
            <span className="text-slate-200">{stats.total_cameras}</span>
            <span className="text-emerald-400 text-[10px]">ONLINE</span>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3">
        {/* Real-time Clock */}
        <div className="flex items-center space-x-1.5 text-slate-300 font-mono text-xs px-2.5 py-1 bg-slate-800/60 border border-slate-700/50 rounded">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{time}</span>
        </div>

        {/* Manual Refresh */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Atualizar dados"
          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin-custom text-blue-400' : ''}`} />
        </button>
      </div>
    </header>
  );
};
