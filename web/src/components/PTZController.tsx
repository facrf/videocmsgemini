import React, { useState, useEffect } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Square,
  Bookmark,
  Send,
  Sliders,
} from 'lucide-react';
import { api } from '../api/client';
import { Camera, PTZPreset } from '../types';

interface PTZControllerProps {
  camera: Camera;
  onClose?: () => void;
}

export const PTZController: React.FC<PTZControllerProps> = ({ camera, onClose }) => {
  const [speed, setSpeed] = useState(0.5);
  const [presets, setPresets] = useState<PTZPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [activeDirection, setActiveDirection] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (camera?.capabilities?.ptz && camera.id) {
      api.ptzGetPresets(camera.id).then((p) => {
        const safePresets = p || [];
        setPresets(safePresets);
        if (safePresets.length > 0 && safePresets[0]?.token) {
          setSelectedPreset(safePresets[0].token);
        }
      }).catch(() => {
        setPresets([]);
      });
    }
  }, [camera?.id, camera?.capabilities?.ptz]);

  const handleMove = async (pan: number, tilt: number, zoom: number, dirName: string) => {
    setActiveDirection(dirName);
    try {
      await api.ptzMove(camera.id, pan * speed, tilt * speed, zoom * speed);
      setStatusMsg(`Movendo: ${dirName}`);
    } catch (err: any) {
      setStatusMsg(`Erro: ${err.message}`);
    }
  };

  const handleStop = async () => {
    setActiveDirection(null);
    try {
      await api.ptzStop(camera.id);
      setStatusMsg('Parado');
    } catch (err: any) {
      setStatusMsg(`Erro ao parar: ${err.message}`);
    }
  };

  const handleGotoPreset = async () => {
    if (!selectedPreset) return;
    try {
      setStatusMsg(`Indo para preset...`);
      await api.ptzGotoPreset(camera.id, selectedPreset);
      setStatusMsg(`Posicionado no preset`);
    } catch (err: any) {
      setStatusMsg(`Erro no preset: ${err.message}`);
    }
  };

  return (
    <div className="bg-slate-950/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-4 shadow-2xl space-y-4 select-none w-64 text-xs font-mono">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-bold text-white uppercase tracking-wider text-[11px]">Controle PTZ</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 transition"
          >
            ✕
          </button>
        )}
      </div>

      {/* D-Pad Virtual Joystick */}
      <div className="flex flex-col items-center justify-center gap-1.5 py-1">
        {/* Up */}
        <button
          onMouseDown={() => handleMove(0, 1, 0, 'Cima')}
          onMouseUp={handleStop}
          onTouchStart={() => handleMove(0, 1, 0, 'Cima')}
          onTouchEnd={handleStop}
          className={`p-2.5 rounded-xl bg-slate-900 border transition-all ${
            activeDirection === 'Cima'
              ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.8)]'
              : 'border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="Inclinar para Cima"
        >
          <ChevronUp className="w-5 h-5" />
        </button>

        {/* Middle Row: Left, Stop, Right */}
        <div className="flex items-center gap-2">
          <button
            onMouseDown={() => handleMove(-1, 0, 0, 'Esquerda')}
            onMouseUp={handleStop}
            onTouchStart={() => handleMove(-1, 0, 0, 'Esquerda')}
            onTouchEnd={handleStop}
            className={`p-2.5 rounded-xl bg-slate-900 border transition-all ${
              activeDirection === 'Esquerda'
                ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.8)]'
                : 'border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title="Girar para Esquerda"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={handleStop}
            className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-300 hover:bg-rose-900 transition shadow-inner"
            title="Parar Movimento"
          >
            <Square className="w-5 h-5 fill-rose-400 text-rose-400" />
          </button>

          <button
            onMouseDown={() => handleMove(1, 0, 0, 'Direita')}
            onMouseUp={handleStop}
            onTouchStart={() => handleMove(1, 0, 0, 'Direita')}
            onTouchEnd={handleStop}
            className={`p-2.5 rounded-xl bg-slate-900 border transition-all ${
              activeDirection === 'Direita'
                ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.8)]'
                : 'border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title="Girar para Direita"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Down */}
        <button
          onMouseDown={() => handleMove(0, -1, 0, 'Baixo')}
          onMouseUp={handleStop}
          onTouchStart={() => handleMove(0, -1, 0, 'Baixo')}
          onTouchEnd={handleStop}
          className={`p-2.5 rounded-xl bg-slate-900 border transition-all ${
            activeDirection === 'Baixo'
              ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.8)]'
              : 'border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="Inclinar para Baixo"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
        <button
          onMouseDown={() => handleMove(0, 0, 1, 'Zoom+')}
          onMouseUp={handleStop}
          onTouchStart={() => handleMove(0, 0, 1, 'Zoom+')}
          onTouchEnd={handleStop}
          className="flex-1 py-1.5 px-2.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 rounded-xl flex items-center justify-center gap-1.5 transition text-xs font-bold"
        >
          <ZoomIn className="w-4 h-4 text-cyan-400" /> Zoom +
        </button>
        <button
          onMouseDown={() => handleMove(0, 0, -1, 'Zoom-')}
          onMouseUp={handleStop}
          onTouchStart={() => handleMove(0, 0, -1, 'Zoom-')}
          onTouchEnd={handleStop}
          className="flex-1 py-1.5 px-2.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 rounded-xl flex items-center justify-center gap-1.5 transition text-xs font-bold"
        >
          <ZoomOut className="w-4 h-4 text-cyan-400" /> Zoom -
        </button>
      </div>

      {/* Speed Slider */}
      <div className="space-y-1 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1"><Sliders className="w-3 h-3 text-blue-400" /> Velocidade</span>
          <span className="font-bold text-white">{Math.round(speed * 100)}%</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="1.0"
          step="0.1"
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      {/* Presets Navigation */}
      {presets.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Bookmark className="w-3 h-3 text-amber-400" /> Presets Salvos
          </label>
          <div className="flex items-center gap-1.5">
            <select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              {presets.map((p) => (
                <option key={p.token} value={p.token}>
                  {p.name || `Preset ${p.token}`}
                </option>
              ))}
            </select>
            <button
              onClick={handleGotoPreset}
              className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition shadow-md"
              title="Ir para Preset"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Status Bar */}
      {statusMsg && (
        <div className="text-[10px] text-center text-slate-400 bg-slate-900/90 py-1 px-2 rounded-lg border border-slate-800 truncate">
          {statusMsg}
        </div>
      )}
    </div>
  );
};
