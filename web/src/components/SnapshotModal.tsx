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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/40 rounded-xl max-w-4xl w-full overflow-hidden shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-700/40 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <CameraIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">Snapshot Instantâneo: {camera.name}</h3>
              <p className="text-sm text-slate-400 font-mono">{camera.host}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image Area */}
        <div className="flex-1 bg-black p-5 flex items-center justify-center min-h-[380px] relative">
          <img
            key={key}
            src={snapshotUrl}
            alt={camera.name}
            onLoad={() => setLoading(false)}
            onError={() => setLoading(false)}
            className="max-h-[62vh] max-w-full rounded-lg border border-slate-700/40 object-contain"
          />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
              <RefreshCw className="w-10 h-10 text-blue-400 animate-spin-custom" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-700/40 flex items-center justify-between">
          <button
            onClick={refreshSnapshot}
            className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700/40 flex items-center gap-2 transition"
          >
            <RefreshCw className="w-4 h-4 text-blue-400" /> Nova Captura
          </button>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleDownload}
              className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Baixar Imagem JPEG
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 border border-slate-700/40 text-slate-300 rounded-lg transition"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
