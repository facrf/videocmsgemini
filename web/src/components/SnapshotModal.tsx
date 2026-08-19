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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <CameraIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Snapshot Instantâneo: {camera.name}</h3>
              <p className="text-xs font-mono text-slate-400">{camera.host}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
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
            className="max-h-[60vh] max-w-full rounded border border-slate-800 object-contain shadow-lg"
          />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin-custom" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <button
            onClick={refreshSnapshot}
            className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Nova Captura
          </button>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded transition flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" /> Baixar Imagem (JPEG)
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
