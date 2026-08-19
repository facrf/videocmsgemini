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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 select-none">
      <div className="bg-[#0b101d] border border-slate-700/80 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-[#070b14]">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white font-mono">Sondar e Cadastrar Câmera</h3>
              <p className="text-xs font-mono text-slate-400">{device.ip}:{device.port}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-4 bg-rose-950/80 border border-rose-800 rounded-2xl text-rose-300 text-xs shadow-inner">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 font-mono">Nome para o CMS</label>
              <input
                type="text"
                value={cameraName}
                onChange={(e) => setCameraName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:border-blue-500 shadow-inner font-mono font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1 font-mono">
                  <User className="w-3.5 h-3.5 text-blue-400" /> Usuário ONVIF
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:border-blue-500 shadow-inner font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1 font-mono">
                  <Lock className="w-3.5 h-3.5 text-cyan-400" /> Senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:border-cyan-500 shadow-inner font-mono"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleProbe}
              disabled={probing}
              className="w-full py-3 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-cyan-400 rounded-2xl border border-slate-700/80 flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-md hover:scale-102"
            >
              <RefreshCw className={`w-4 h-4 ${probing ? 'animate-spin-custom text-cyan-400' : ''}`} />
              {probing ? 'Autenticando & Detectando...' : 'Sondar Informações ONVIF'}
            </button>
          </div>

          {/* Probed Details */}
          {probedResult && (
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs space-y-1.5 font-mono shadow-inner">
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
        <div className="px-6 py-4 border-t border-slate-800 bg-[#070b14] flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-2xl transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleAdd}
            disabled={adding}
            className="px-6 py-2.5 text-xs font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-2xl transition flex items-center gap-2 shadow-lg shadow-blue-600/30 disabled:opacity-50 hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            {adding ? 'Cadastrando...' : 'Cadastrar no CMS'}
          </button>
        </div>
      </div>
    </div>
  );
};
