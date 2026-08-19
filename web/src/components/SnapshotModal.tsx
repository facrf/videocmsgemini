import React, { useState } from 'react';
import { X, Download, Camera as CameraIcon, RefreshCw } from 'lucide-react';
import { Camera } from '../types';
import { api } from '../api/client';

interface SnapshotModalProps {
  camera: Camera;
  onClose: () => void;
}

export const SnapshotModal: React.FC<SnapshotModalProps> = ({ camera, onClose }) => {
  const [key, setKey] = useState(Date.now());
  const [loading, setLoading] = useState(true);

  const snapshotUrl = `${api.getSnapshotUrl(camera.id)}&_k=${key}`;

  const refreshSnapshot = () => {
    setLoading(true);
    setKey(Date.now());
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = snapshotUrl;
    a.download = `snapshot_${camera.name.replace(/\s+/g, '_')}_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
              <CameraIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Snapshot Instantâneo: {camera.name}</h3>
              <p className="text-xs font-mono text-slate-400">{camera.host}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image Area */}
        <div className="flex-1 bg-black p-4 flex items-center justify-center min-h-[360px] relative">
          <img
            key={key}
            src={snapshotUrl}
            alt={camera.name}
            onLoad={() => setLoading(false)}
            onError={() => setLoading(false)}
            className="max-h-[60vh] max-w-full rounded-xl border border-slate-800 object-contain shadow-2xl"
          />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin-custom" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800/80 bg-slate-950/70 flex items-center justify-between">
          <button
            onClick={refreshSnapshot}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700/80 flex items-center gap-1.5 transition shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Nova Captura
          </button>
          <div className="flex items-center space-x-2.5">
            <button
              onClick={handleDownload}
              className="px-5 py-2 text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-600/25"
            >
              <Download className="w-4 h-4" /> Baixar Imagem (JPEG)
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

