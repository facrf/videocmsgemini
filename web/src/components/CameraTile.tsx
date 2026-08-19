import React, { useState } from 'react';
import {
  Maximize2,
  Minimize2,
  Camera as CameraIcon,
  RefreshCw,
  X,
  Plus,
  Lock,
  WifiOff,
  Activity,
  Compass,
  Download,
} from 'lucide-react';
import { Camera } from '../types';
import { api } from '../api/client';
import { PTZController } from './PTZController';

interface CameraTileProps {
  camera?: Camera;
  position: number;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  onRemoveSlot?: () => void;
  onAssignCamera?: () => void;
  onSnapshot?: (camera: Camera) => void;
  onOpenDiagnostics?: (camera: Camera) => void;
}

export const CameraTile: React.FC<CameraTileProps> = ({
  camera,
  position,
  isMaximized = false,
  onToggleMaximize,
  onRemoveSlot,
  onAssignCamera,
  onSnapshot,
  onOpenDiagnostics,
}) => {
  const [streamError, setStreamError] = useState(false);
  const [key, setKey] = useState(0);
  const [showPTZ, setShowPTZ] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<'main' | 'sub'>('sub');

  const reloadStream = () => {
    setStreamError(false);
    setKey((prev) => prev + 1);
  };

  // If slot has no camera assigned
  if (!camera) {
    return (
      <div
        onClick={onAssignCamera}
        className="h-full w-full bg-slate-950/40 hover:bg-slate-900/80 border-2 border-dashed border-slate-800/80 hover:border-blue-500/60 rounded-2xl flex flex-col items-center justify-center p-4 text-slate-500 hover:text-blue-400 cursor-pointer transition-all duration-300 group select-none min-h-[140px] shadow-inner relative overflow-hidden"
      >
        <div className="w-12 h-12 rounded-2xl bg-slate-900/90 group-hover:bg-blue-600/20 group-hover:scale-110 border border-slate-700/80 group-hover:border-blue-500/50 flex items-center justify-center mb-3 transition-all duration-300 text-slate-400 group-hover:text-blue-400 shadow-lg">
          <Plus className="w-6 h-6" />
        </div>
        <span className="text-xs font-black text-slate-300 group-hover:text-blue-300 font-mono tracking-wider uppercase">
          CANAL #{position + 1}
        </span>
        <span className="text-[11px] text-slate-500 group-hover:text-slate-400 mt-0.5">
          Clique para vincular câmera IP
        </span>
      </div>
    );
  }

  const profile = isMaximized ? 'main' : selectedProfile;
  const streamUrl = `${api.getLiveStreamUrl(camera.id, profile)}&k=${key}`;
  const isH265 = camera.codec?.toUpperCase().includes('H265') || camera.codec?.toUpperCase().includes('HEVC');
  const hasPTZ = Boolean(camera.capabilities?.ptz);

  const handleDownloadSnapshot = (e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = api.getSnapshotUrl(camera.id);
    a.download = `snapshot_${camera.name.replace(/\s+/g, '_')}_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className={`relative h-full w-full bg-black rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col group shadow-xl ${
        isMaximized
          ? 'border-blue-500 ring-2 ring-blue-500/40 shadow-blue-500/10'
          : 'border-slate-800/90 hover:border-slate-700/90'
      }`}
    >
      {/* Top Overlay Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 px-3.5 py-2.5 camera-tile-overlay flex items-center justify-between pointer-events-none">
        <div className="flex items-center space-x-2.5 pointer-events-auto min-w-0">
          {/* Glowing Status Dot */}
          <span
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm ${
              camera.status === 'online'
                ? 'bg-emerald-400 animate-pulse-online ring-2 ring-emerald-950/80 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                : camera.status === 'auth_required'
                ? 'bg-amber-400 ring-2 ring-amber-950 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                : 'bg-rose-500 ring-2 ring-rose-950 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
            }`}
            title={`Status: ${camera.status}`}
          />
          <span className="text-xs font-black text-white truncate drop-shadow-md tracking-tight font-mono">
            {camera.name}
          </span>
          <span className="text-[10px] font-mono text-slate-300/90 hidden sm:inline-block drop-shadow-md bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-md border border-white/10">
            {camera.host}
          </span>
        </div>

        {/* Badges */}
        <div className="flex items-center space-x-1.5 pointer-events-auto flex-shrink-0">
          {isH265 && (
            <span
              className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-950/90 text-purple-300 border border-purple-800/70 shadow-sm"
              title="Codec H.265 detectado"
            >
              H.265
            </span>
          )}
          {hasPTZ && (
            <button
              onClick={() => setShowPTZ(!showPTZ)}
              className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md border shadow-sm transition flex items-center gap-1 ${
                showPTZ
                  ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                  : 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60 hover:bg-cyan-900/80'
              }`}
              title="Abrir Controles PTZ"
            >
              <Compass className="w-3 h-3" /> PTZ
            </button>
          )}
          <button
            onClick={() => setSelectedProfile(selectedProfile === 'main' ? 'sub' : 'main')}
            className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md border shadow-sm transition ${
              profile === 'main'
                ? 'bg-blue-600/90 text-white border-blue-400 shadow-sm'
                : 'bg-slate-900/90 text-slate-300 border-slate-700/80 hover:bg-slate-800'
            }`}
            title="Alternar Main Stream / Sub Stream"
          >
            {profile.toUpperCase()}
          </button>
        </div>
      </div>

      {/* Video / Stream Content Area */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden select-none">
        {streamError ? (
          <div className="flex flex-col items-center justify-center p-4 text-center z-10">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-800/80 flex items-center justify-center mb-3 shadow-lg">
              <WifiOff className="w-6 h-6 text-rose-400" />
            </div>
            <span className="text-xs font-extrabold text-slate-200">Falha na Conexão</span>
            <span className="text-[10px] text-slate-400 font-mono mb-3 max-w-[220px] truncate">
              {camera.status_message || 'Stream offline ou host inacessível'}
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={reloadStream}
                className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 flex items-center gap-1.5 transition shadow-sm font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reconectar
              </button>
              {onOpenDiagnostics && (
                <button
                  onClick={() => onOpenDiagnostics(camera)}
                  className="px-3 py-1.5 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-xl border border-blue-500/40 transition font-semibold"
                >
                  Diagnóstico
                </button>
              )}
            </div>
          </div>
        ) : camera.status === 'auth_required' ? (
          <div className="flex flex-col items-center justify-center p-4 text-center z-10">
            <div className="w-12 h-12 rounded-2xl bg-amber-950/60 border border-amber-800/80 flex items-center justify-center mb-3 shadow-lg">
              <Lock className="w-6 h-6 text-amber-400" />
            </div>
            <span className="text-xs font-extrabold text-amber-300">Autenticação Necessária</span>
            <span className="text-[10px] text-slate-400 mb-3">Senha ou usuário inválidos</span>
            {onOpenDiagnostics && (
              <button
                onClick={() => onOpenDiagnostics(camera)}
                className="px-3.5 py-1.5 text-xs font-bold bg-amber-600/20 text-amber-300 rounded-xl border border-amber-500/40 hover:bg-amber-600/30 transition shadow-sm"
              >
                Configurar Credenciais
              </button>
            )}
          </div>
        ) : (
          <img
            key={key}
            src={streamUrl}
            alt={camera.name}
            onError={() => setStreamError(true)}
            className="w-full h-full object-contain pointer-events-none"
          />
        )}

        {/* Floating PTZ Controller overlay when active */}
        {showPTZ && hasPTZ && (
          <div className="absolute top-12 right-3 z-30 animate-in fade-in zoom-in-95 duration-150">
            <PTZController camera={camera} onClose={() => setShowPTZ(false)} />
          </div>
        )}
      </div>

      {/* Bottom Action Controls Overlay (Appears on Hover) */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
        <div className="flex items-center space-x-1.5">
          {onSnapshot && (
            <button
              onClick={() => onSnapshot(camera)}
              title="Abrir Visualizador de Snapshot"
              className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs transition shadow-md hover:scale-105"
            >
              <CameraIcon className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleDownloadSnapshot}
            title="Download Rápido de Imagem (JPEG)"
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-emerald-900/70 text-slate-300 hover:text-emerald-300 border border-slate-700/80 hover:border-emerald-700/60 text-xs transition shadow-md hover:scale-105"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          {onOpenDiagnostics && (
            <button
              onClick={() => onOpenDiagnostics(camera)}
              title="Diagnóstico Técnico (10 etapas)"
              className="p-2 rounded-xl bg-slate-900/90 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 border border-slate-700/80 hover:border-blue-500/40 text-xs transition shadow-md hover:scale-105"
            >
              <Activity className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={reloadStream}
            title="Recarregar Transmissão"
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs transition shadow-md hover:scale-105"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center space-x-1.5">
          {onToggleMaximize && (
            <button
              onClick={onToggleMaximize}
              title={isMaximized ? 'Restaurar Grade Mosaico' : 'Ampliar Câmera (Stream Principal 1080p/4K)'}
              className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/50 text-xs transition shadow-lg shadow-blue-600/30 hover:scale-105"
            >
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
          {onRemoveSlot && !isMaximized && (
            <button
              onClick={onRemoveSlot}
              title="Remover Câmera deste Slot"
              className="p-2 rounded-xl bg-slate-900/90 hover:bg-rose-900/80 text-slate-400 hover:text-rose-200 border border-slate-700/80 hover:border-rose-700/60 text-xs transition shadow-md hover:scale-105"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
