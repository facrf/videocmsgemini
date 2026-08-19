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
        className="h-full w-full bg-slate-800/50 hover:bg-slate-800 border-2 border-dashed border-slate-700/40 hover:border-blue-500/60 rounded-xl flex flex-col items-center justify-center p-4 text-slate-400 hover:text-blue-400 cursor-pointer transition-all duration-300 group select-none min-h-[140px] relative overflow-hidden"
      >
        <div className="w-12 h-12 rounded-xl bg-slate-900 group-hover:bg-blue-600/20 group-hover:scale-110 border border-slate-700/40 group-hover:border-blue-500/50 flex items-center justify-center mb-3 transition-all duration-300 text-slate-400 group-hover:text-blue-400 shadow-sm">
          <Plus className="w-6 h-6" />
        </div>
        <span className="text-xs font-bold text-slate-300 group-hover:text-blue-300 uppercase">
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
      className={`relative h-full w-full bg-slate-900 rounded-xl overflow-hidden border transition-all duration-300 flex flex-col group shadow-sm ${
        isMaximized
          ? 'border-blue-500 ring-2 ring-blue-500/40'
          : 'border-slate-700/40 hover:border-slate-600/40'
      }`}
    >
      {/* Top Overlay Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 px-3.5 py-2.5 camera-tile-overlay flex items-center justify-between pointer-events-none">
        <div className="flex items-center space-x-2.5 pointer-events-auto min-w-0">
          {/* Glowing Status Dot */}
          <span
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
              camera.status === 'online'
                ? 'bg-emerald-500 animate-pulse-online'
                : camera.status === 'auth_required'
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
            title={`Status: ${camera.status}`}
          />
          <span className="text-xs font-bold text-slate-100 truncate tracking-tight">
            {camera.name}
          </span>
          <span className="text-[10px] font-mono text-slate-300 hidden sm:inline-block bg-black/60 px-2 py-0.5 rounded-md">
            {camera.host}
          </span>
        </div>

        {/* Badges */}
        <div className="flex items-center space-x-1.5 pointer-events-auto flex-shrink-0">
          {isH265 && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/40"
              title="Codec H.265 detectado"
            >
              H.265
            </span>
          )}
          {hasPTZ && (
            <button
              onClick={() => setShowPTZ(!showPTZ)}
              className={`text-[9px] font-bold px-2 py-0.5 rounded-full border transition flex items-center gap-1 ${
                showPTZ
                  ? 'bg-cyan-600 text-white border-cyan-500'
                  : 'bg-slate-800 text-cyan-400 border-slate-700/40 hover:bg-slate-700'
              }`}
              title="Abrir Controles PTZ"
            >
              <Compass className="w-3 h-3" /> PTZ
            </button>
          )}
          <button
            onClick={() => setSelectedProfile(selectedProfile === 'main' ? 'sub' : 'main')}
            className={`text-[9px] font-bold px-2 py-0.5 rounded-full border transition ${
              profile === 'main'
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-slate-800 text-slate-300 border-slate-700/40 hover:bg-slate-700'
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
            <div className="w-12 h-12 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center mb-3">
              <WifiOff className="w-6 h-6 text-rose-500" />
            </div>
            <span className="text-xs font-bold text-slate-100">Falha na Conexão</span>
            <span className="text-[10px] text-slate-400 font-mono mb-3 max-w-[220px] truncate">
              {camera.status_message || 'Stream offline ou host inacessível'}
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={reloadStream}
                className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg border border-slate-700/40 flex items-center gap-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reconectar
              </button>
              {onOpenDiagnostics && (
                <button
                  onClick={() => onOpenDiagnostics(camera)}
                  className="px-3 py-1.5 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg border border-blue-500/40 transition"
                >
                  Diagnóstico
                </button>
              )}
            </div>
          </div>
        ) : camera.status === 'auth_required' ? (
          <div className="flex flex-col items-center justify-center p-4 text-center z-10">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-3">
              <Lock className="w-6 h-6 text-amber-500" />
            </div>
            <span className="text-xs font-bold text-amber-400">Autenticação Necessária</span>
            <span className="text-[10px] text-slate-400 mb-3">Senha ou usuário inválidos</span>
            {onOpenDiagnostics && (
              <button
                onClick={() => onOpenDiagnostics(camera)}
                className="px-3 py-1.5 text-xs font-bold bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30 hover:bg-amber-500/30 transition"
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
          <div className="absolute top-12 right-3 z-30 duration-150">
            <PTZController camera={camera} onClose={() => setShowPTZ(false)} />
          </div>
        )}
      </div>

      {/* Bottom Action Controls Overlay (Appears on Hover) */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
        <div className="flex items-center space-x-1.5">
          {onSnapshot && (
            <button
              onClick={() => onSnapshot(camera)}
              title="Abrir Visualizador de Snapshot"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 border border-slate-700/40 text-xs transition"
            >
              <CameraIcon className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleDownloadSnapshot}
            title="Download Rápido de Imagem (JPEG)"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 border border-slate-700/40 text-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          {onOpenDiagnostics && (
            <button
              onClick={() => onOpenDiagnostics(camera)}
              title="Diagnóstico Técnico (10 etapas)"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-blue-400 border border-slate-700/40 text-xs transition"
            >
              <Activity className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={reloadStream}
            title="Recarregar Transmissão"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 border border-slate-700/40 text-xs transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center space-x-1.5">
          {onToggleMaximize && (
            <button
              onClick={onToggleMaximize}
              title={isMaximized ? 'Restaurar Grade Mosaico' : 'Ampliar Câmera (Stream Principal)'}
              className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white border border-blue-500/50 text-xs transition"
            >
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
          {onRemoveSlot && !isMaximized && (
            <button
              onClick={onRemoveSlot}
              title="Remover Câmera deste Slot"
              className="p-2 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white border border-slate-700/40 text-xs transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
