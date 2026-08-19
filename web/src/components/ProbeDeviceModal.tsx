import React, { useState } from 'react';
import {
  X,
  Search,
  CheckCircle2,
  RefreshCw,
  Plus,
  Lock,
  User,
} from 'lucide-react';
import { DiscoveryResult } from '../types';
import { api } from '../api/client';

interface ProbeDeviceModalProps {
  jobId: string;
  device: DiscoveryResult;
  onClose: () => void;
  onAdded: () => void;
}

export const ProbeDeviceModal: React.FC<ProbeDeviceModalProps> = ({
  jobId,
  device,
  onClose,
  onAdded,
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [cameraName, setCameraName] = useState(
    `${device.manufacturer || 'Câmera'} ${device.model || ''} (${device.ip})`.trim()
  );
  const [probing, setProbing] = useState(false);
  const [probedResult, setProbedResult] = useState<DiscoveryResult | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProbe = async () => {
    setProbing(true);
    setError(null);
    try {
      const res = await api.probeDevice(jobId, device.id, username, password);
      setProbedResult(res);
      if (res.manufacturer || res.model) {
        setCameraName(`${res.manufacturer} ${res.model} (${res.ip})`.trim());
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao sondar dispositivo');
    } finally {
      setProbing(false);
    }
  };

  const handleAdd = async () => {
    setAdding(true);
    setError(null);
    try {
      await api.addDiscoveredDevice(jobId, device.id, cameraName, username, password);
      onAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar câmera ao catálogo');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Sondar e Cadastrar Câmera</h3>
              <p className="text-xs font-mono text-slate-400">{device.ip}:{device.port}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-xs shadow-inner">
              {error}
            </div>
          )}

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nome para o CMS</label>
              <input
                type="text"
                value={cameraName}
                onChange={(e) => setCameraName(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 shadow-inner"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <User className="w-3 h-3 text-blue-400" /> Usuário ONVIF
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 shadow-inner"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-blue-400" /> Senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 shadow-inner"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleProbe}
              disabled={probing}
              className="w-full py-2.5 text-xs font-semibold bg-slate-800/90 hover:bg-slate-700 text-blue-400 rounded-xl border border-slate-700/80 flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${probing ? 'animate-spin-custom text-blue-400' : ''}`} />
              {probing ? 'Autenticando & Detectando...' : 'Sondar Informações ONVIF'}
            </button>
          </div>

          {/* Probed Details */}
          {probedResult && (
            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs space-y-1.5 font-mono shadow-inner">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold mb-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Dispositivo autenticado com sucesso!</span>
              </div>
              {probedResult.manufacturer && <div>Fabricante: <span className="text-white font-bold">{probedResult.manufacturer}</span></div>}
              {probedResult.model && <div>Modelo: <span className="text-white font-bold">{probedResult.model}</span></div>}
              {probedResult.probe_details?.firmware && <div>Firmware: <span className="text-slate-400">{probedResult.probe_details.firmware}</span></div>}
              {probedResult.probe_details?.serial && <div>Serial: <span className="text-slate-400">{probedResult.probe_details.serial}</span></div>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800/80 bg-slate-950/70 flex items-center justify-end space-x-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleAdd}
            disabled={adding}
            className="px-5 py-2 text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-blue-600/25 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {adding ? 'Cadastrando...' : 'Cadastrar no CMS'}
          </button>
        </div>
      </div>
    </div>
  );
};

