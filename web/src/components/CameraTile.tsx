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
} from 'lucide-react';
import { Camera } from '../types';
import { api } from '../api/client';

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
  const [key, setKey] = useState(0); // Used to reload stream

  const reloadStream = () => {
    setStreamError(false);
    setKey((prev) => prev + 1);
  };

  // If slot has no camera assigned
  if (!camera) {
    return (
      <div
        onClick={onAssignCamera}
        className="h-full w-full bg-slate-900/60 border border-dashed border-slate-800 hover:border-blue-500/50 hover:bg-slate-900/90 rounded-lg flex flex-col items-center justify-center p-3 text-slate-500 hover:text-blue-400 cursor-pointer transition group select-none min-h-[120px]"
      >
        <div className="w-9 h-9 rounded-full bg-slate-800 group-hover:bg-blue-600/20 border border-slate-700 flex items-center justify-center mb-2 transition">
          <Plus className="w-5 h-5" />
        </div>
        <span className="text-xs font-medium">Slot #{position + 1}</span>
        <span className="text-[10px] text-slate-600 group-hover:text-slate-400">Clique para atribuir câmera</span>
      </div>
    );
  }

  const profile = isMaximized ? 'main' : 'sub';
  const streamUrl = `${api.getLiveStreamUrl(camera.id, profile)}&k=${key}`;

  const isH265 = camera.codec?.toUpperCase().includes('H265') || camera.codec?.toUpperCase().includes('HEVC');

  return (
    <div className={`relative h-full w-full bg-slate-950 rounded-lg overflow-hidden border border-slate-800 hover:border-slate-700 transition flex flex-col group ${
      isMaximized ? 'ring-2 ring-blue-500' : ''
    }`}>
      {/* Top Overlay Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 p-2 camera-tile-overlay flex items-center justify-between pointer-events-none">
        <div className="flex items-center space-x-2 pointer-events-auto">
          {/* Status Dot */}
          <span
            className={`w-2 h-2 rounded-full ${
              camera.status === 'online'
                ? 'bg-emerald-500 animate-pulse-online'
                : camera.status === 'auth_required'
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
            title={`Status: ${camera.status}`}
          />
          <span className="text-xs font-semibold text-white truncate max-w-[140px] drop-shadow-md">
            {camera.name}
          </span>
          <span className="text-[10px] font-mono text-slate-300 hidden sm:inline-block drop-shadow-md">
            {camera.host}
          </span>
        </div>

        {/* Badges */}
        <div className="flex items-center space-x-1 pointer-events-auto">
          {isH265 && (
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60" title="Codec H.265 detectado">
              H.265
            </span>
          )}
          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-900/80 text-slate-300 border border-slate-700">
            {profile.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Video / Stream Area */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
        {streamError ? (
          <div className="flex flex-col items-center justify-center p-4 text-center">
            <WifiOff className="w-8 h-8 text-rose-500 mb-2" />
            <span className="text-xs font-medium text-slate-300">Falha no stream</span>
            <span className="text-[10px] text-slate-500 mb-3">{camera.status_message || 'Câmera inacessível'}</span>
            <div className="flex items-center space-x-2">
              <button
                onClick={reloadStream}
                className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded border border-slate-700 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Tentar Novamente
              </button>
              {onOpenDiagnostics && (
                <button
                  onClick={() => onOpenDiagnostics(camera)}
                  className="px-2.5 py-1 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded border border-blue-500/30"
                >
                  Diagnóstico
                </button>
              )}
            </div>
          </div>
        ) : camera.status === 'auth_required' ? (
          <div className="flex flex-col items-center justify-center p-4 text-center">
            <Lock className="w-7 h-7 text-amber-400 mb-1.5" />
            <span className="text-xs font-medium text-amber-300">Autenticação Necessária</span>
            <span className="text-[10px] text-slate-400 mb-2">Credenciais inválidas</span>
            {onOpenDiagnostics && (
              <button
                onClick={() => onOpenDiagnostics(camera)}
                className="px-2 py-1 text-[11px] bg-amber-600/20 text-amber-300 rounded border border-amber-500/30 hover:bg-amber-600/30"
              >
                Verificar Senha
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
      </div>

      {/* Bottom Overlay Controls (Visible on hover) */}
      <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition duration-200 z-10">
        <div className="flex items-center space-x-1">
          {onSnapshot && (
            <button
              onClick={() => onSnapshot(camera)}
              title="Capturar Foto (Snapshot)"
              className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs"
            >
              <CameraIcon className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={reloadStream}
            title="Recarregar Stream"
            className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center space-x-1">
          {onToggleMaximize && (
            <button
              onClick={onToggleMaximize}
              title={isMaximized ? 'Restaurar Grade' : 'Ampliar Câmera (Main Stream)'}
              className="p-1 rounded bg-blue-600/80 hover:bg-blue-600 text-white border border-blue-500 text-xs"
            >
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
          {onRemoveSlot && !isMaximized && (
            <button
              onClick={onRemoveSlot}
              title="Desatribuir Slot"
              className="p-1 rounded bg-slate-800/80 hover:bg-rose-900/80 text-slate-400 hover:text-rose-300 border border-slate-700 text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
