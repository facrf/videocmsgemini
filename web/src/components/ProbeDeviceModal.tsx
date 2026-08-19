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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/40 rounded-xl max-w-lg w-full overflow-hidden shadow-xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-700/40 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">Sondar e Cadastrar Câmera</h3>
              <p className="text-sm font-mono text-slate-400">{device.ip}:{device.port}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-600/20 border border-rose-500/30 rounded-lg text-rose-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Nome para o CMS</label>
              <input
                type="text"
                value={cameraName}
                onChange={(e) => setCameraName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700/40 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-400" /> Usuário (Opcional)
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin (ou vazio)"
                  className="w-full bg-slate-800 border border-slate-700/40 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-blue-400" /> Senha (Opcional)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Vazio = sem senha"
                  className="w-full bg-slate-800 border border-slate-700/40 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleProbe}
              disabled={probing}
              className="w-full py-2.5 text-sm bg-slate-800 hover:bg-slate-700 border border-slate-700/40 text-blue-400 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${probing ? 'animate-spin-custom' : ''}`} />
              {probing ? 'Autenticando & Detectando...' : 'Sondar Informações ONVIF'}
            </button>
          </div>

          {/* Probed Details */}
          {probedResult && (
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/40 text-sm space-y-1.5">
              <div className="flex items-center space-x-2 text-emerald-400 font-medium mb-2">
                <CheckCircle2 className="w-5 h-5" />
                <span>Dispositivo autenticado com sucesso!</span>
              </div>
              {probedResult.manufacturer && <div>Fabricante: <span className="text-slate-200">{probedResult.manufacturer}</span></div>}
              {probedResult.model && <div>Modelo: <span className="text-slate-200">{probedResult.model}</span></div>}
              {probedResult.probe_details?.firmware && <div>Firmware: <span className="text-slate-400">{probedResult.probe_details.firmware}</span></div>}
              {probedResult.probe_details?.serial && <div>Serial: <span className="text-slate-400">{probedResult.probe_details.serial}</span></div>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-700/40 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 border border-slate-700/40 text-slate-300 rounded-lg transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleAdd}
            disabled={adding}
            className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition flex items-center gap-2 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {adding ? 'Cadastrando...' : 'Cadastrar no CMS'}
          </button>
        </div>
      </div>
    </div>
  );
};
