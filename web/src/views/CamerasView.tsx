import React, { useState } from 'react';
import {
  Camera as CameraIcon,
  Plus,
  Search,
  XCircle,
  Lock,
  Edit2,
  Trash2,
  Camera,
  RefreshCw,
  Activity,
} from 'lucide-react';
import { Camera as CameraType, CameraStatus } from '../types';
import { api } from '../api/client';
import { CameraModal } from '../components/CameraModal';

interface CamerasViewProps {
  cameras: CameraType[];
  onRefresh: () => void;
  onOpenSnapshot: (cam: CameraType) => void;
  onOpenDiagnostics: (cam: CameraType) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const CamerasView: React.FC<CamerasViewProps> = ({
  cameras,
  onRefresh,
  onOpenSnapshot,
  onOpenDiagnostics,
  showToast,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCameraForEdit, setSelectedCameraForEdit] = useState<CameraType | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter cameras
  const filteredCameras = cameras.filter((cam) => {
    const matchesSearch =
      cam.name.toLowerCase().includes(search.toLowerCase()) ||
      cam.host.toLowerCase().includes(search.toLowerCase()) ||
      cam.manufacturer.toLowerCase().includes(search.toLowerCase()) ||
      cam.model.toLowerCase().includes(search.toLowerCase()) ||
      cam.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'online' && cam.status === 'online') ||
      (statusFilter === 'offline' && cam.status === 'offline') ||
      (statusFilter === 'auth_required' && cam.status === 'auth_required');

    return matchesSearch && matchesStatus;
  });

  const handleTestConnection = async (cam: CameraType) => {
    setTestingId(cam.id);
    try {
      const res = await api.testCamera(cam.id);
      if (res.success) {
        showToast(`Conexão com "${cam.name}" testada com sucesso!`, 'success');
        onRefresh();
      } else {
        showToast(`Falha no teste com "${cam.name}": ${res.error}`, 'error');
      }
    } catch (err: any) {
      showToast(`Erro ao testar "${cam.name}": ${err.message}`, 'error');
    } finally {
      setTestingId(null);
    }
  };

  const handleDeleteCamera = async (cam: CameraType) => {
    if (!window.confirm(`Tem certeza que deseja remover a câmera "${cam.name}" do sistema?`)) {
      return;
    }
    setDeletingId(cam.id);
    try {
      await api.deleteCamera(cam.id);
      showToast(`Câmera "${cam.name}" removida com sucesso.`, 'success');
      onRefresh();
    } catch (err: any) {
      showToast(`Erro ao remover câmera: ${err.message}`, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: CameraStatus) => {
    switch (status) {
      case 'online':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-online" /> Online
          </span>
        );
      case 'auth_required':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-950/70 text-amber-300 border border-amber-800/60 shadow-sm">
            <Lock className="w-3 h-3 text-amber-400" /> Requer Senha
          </span>
        );
      case 'offline':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-950/70 text-rose-300 border border-rose-800/60 shadow-sm">
            <XCircle className="w-3 h-3 text-rose-400" /> Offline
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-850 text-slate-400 border border-slate-700">
            Desconhecido
          </span>
        );
    }
  };

  return (
    <div className="p-5 sm:p-7 space-y-6 h-full overflow-y-auto select-none">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5 mb-1">
            <div className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <CameraIcon className="w-4.5 h-4.5" />
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              Gerenciamento de Câmeras IP
            </h2>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-800/50">
              {cameras.length} cadastradas
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Cadastro técnico, diagnóstico em 10 etapas, status em tempo real e perfis RTSP/ONVIF
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl flex items-center gap-2 transition shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40"
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar Câmera</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3.5 shadow-md">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, IP, fabricante, modelo ou tag..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800/90 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition shadow-inner"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto text-xs p-1 bg-slate-950/70 rounded-xl border border-slate-800/80">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            Todas ({cameras.length})
          </button>
          <button
            onClick={() => setStatusFilter('online')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              statusFilter === 'online'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            Online ({cameras.filter((c) => c.status === 'online').length})
          </button>
          <button
            onClick={() => setStatusFilter('offline')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              statusFilter === 'offline'
                ? 'bg-rose-950 text-rose-300 border border-rose-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            Offline ({cameras.filter((c) => c.status === 'offline').length})
          </button>
          <button
            onClick={() => setStatusFilter('auth_required')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              statusFilter === 'auth_required'
                ? 'bg-amber-950 text-amber-300 border border-amber-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            Requer Senha ({cameras.filter((c) => c.status === 'auth_required').length})
          </button>
        </div>
      </div>

      {/* Cameras Table Card */}
      {filteredCameras.length === 0 ? (
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-16 text-center text-slate-500 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-600 shadow-inner">
            <CameraIcon className="w-7 h-7" />
          </div>
          <p className="text-sm font-bold text-slate-300">Nenhuma câmera encontrada</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {search || statusFilter !== 'all'
              ? 'Tente ajustar ou limpar seus filtros de pesquisa acima.'
              : 'Cadastre sua primeira câmera IP manualmente ou realize uma varredura na rede.'}
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800/80 text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                <tr>
                  <th className="py-3.5 px-5">Câmera / Identificação</th>
                  <th className="py-3.5 px-5">Endereço IP & Portas</th>
                  <th className="py-3.5 px-5">Status Operacional</th>
                  <th className="py-3.5 px-5">Recursos & Codec</th>
                  <th className="py-3.5 px-5 text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredCameras.map((cam) => (
                  <tr key={cam.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Name & Model */}
                    <td className="py-4 px-5">
                      <div className="flex items-center space-x-3.5">
                        <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-blue-400 font-semibold shadow-inner flex-shrink-0">
                          <CameraIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs">{cam.name}</div>
                          <div className="text-[11px] text-slate-400">
                            {cam.manufacturer || 'Genérica'} {cam.model ? `• ${cam.model}` : ''}
                          </div>
                          {cam.tags && cam.tags.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              {cam.tags.map((t, idx) => (
                                <span
                                  key={idx}
                                  className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-950 text-slate-400 border border-slate-800"
                                >
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* IP & Ports */}
                    <td className="py-4 px-5 font-mono text-xs">
                      <div className="text-white font-bold tracking-tight">{cam.host}</div>
                      <div className="text-slate-400 text-[10px] mt-0.5">
                        HTTP: <span className="text-slate-300">{cam.port}</span> | RTSP: <span className="text-slate-300">{cam.rtsp_port}</span>
                      </div>
                      {cam.mac_address && (
                        <div className="text-slate-500 text-[10px] mt-0.5">MAC: {cam.mac_address}</div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-5">
                      <div className="space-y-1">
                        <div>{getStatusBadge(cam.status)}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {cam.last_seen_at
                            ? `Visto às ${new Date(cam.last_seen_at).toLocaleTimeString('pt-BR')}`
                            : 'Aguardando ping'}
                        </div>
                      </div>
                    </td>

                    {/* Capabilities */}
                    <td className="py-4 px-5">
                      <div className="flex flex-wrap gap-1 text-[10px] font-mono font-semibold">
                        {cam.capabilities.onvif && (
                          <span className="px-2 py-0.5 rounded bg-blue-950/70 text-blue-300 border border-blue-800/60 shadow-sm">
                            ONVIF
                          </span>
                        )}
                        {cam.capabilities.rtsp && (
                          <span className="px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 shadow-sm">
                            RTSP
                          </span>
                        )}
                        {cam.capabilities.ptz && (
                          <span className="px-2 py-0.5 rounded bg-purple-950/70 text-purple-300 border border-purple-800/60 shadow-sm">
                            PTZ
                          </span>
                        )}
                        {cam.capabilities.sub_stream && (
                          <span className="px-2 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-800/60 shadow-sm">
                            SUBSTREAM
                          </span>
                        )}
                        {cam.codec && (
                          <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                            {cam.codec.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Snapshot */}
                        <button
                          onClick={() => onOpenSnapshot(cam)}
                          title="Capturar Foto Instantânea (Snapshot)"
                          className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition shadow-sm"
                        >
                          <Camera className="w-3.5 h-3.5" />
                        </button>

                        {/* Diagnostics */}
                        <button
                          onClick={() => onOpenDiagnostics(cam)}
                          title="Diagnóstico Técnico (10 etapas)"
                          className="p-2 rounded-xl bg-slate-800/90 hover:bg-blue-600/30 text-blue-400 border border-slate-700/80 hover:border-blue-500/50 transition shadow-sm"
                        >
                          <Activity className="w-3.5 h-3.5" />
                        </button>

                        {/* Test Connection */}
                        <button
                          onClick={() => handleTestConnection(cam)}
                          disabled={testingId === cam.id}
                          title="Testar Conectividade Agora"
                          className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition shadow-sm disabled:opacity-50"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${
                              testingId === cam.id ? 'animate-spin-custom text-blue-400' : ''
                            }`}
                          />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => setSelectedCameraForEdit(cam)}
                          title="Editar Configurações da Câmera"
                          className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition shadow-sm"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteCamera(cam)}
                          disabled={deletingId === cam.id}
                          title="Excluir Câmera do CMS"
                          className="p-2 rounded-xl bg-slate-800/90 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 border border-slate-700/80 hover:border-rose-800/50 transition shadow-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Camera Modal */}
      {showAddModal && (
        <CameraModal
          camera={null}
          onClose={() => setShowAddModal(false)}
          onSave={() => {
            onRefresh();
            showToast('Câmera adicionada com sucesso!', 'success');
          }}
        />
      )}

      {/* Edit Camera Modal */}
      {selectedCameraForEdit && (
        <CameraModal
          camera={selectedCameraForEdit}
          onClose={() => setSelectedCameraForEdit(null)}
          onSave={() => {
            onRefresh();
            showToast('Câmera atualizada com sucesso!', 'success');
          }}
        />
      )}
    </div>
  );
};

