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
        showToast(`Conexão com ${cam.name} testada com sucesso!`, 'success');
        onRefresh();
      } else {
        showToast(`Falha no teste com ${cam.name}: ${res.error}`, 'error');
      }
    } catch (err: any) {
      showToast(`Erro ao testar ${cam.name}: ${err.message}`, 'error');
    } finally {
      setTestingId(null);
    }
  };

  const handleDeleteCamera = async (cam: CameraType) => {
    if (!window.confirm(`Tem certeza que deseja remover a câmera "${cam.name}"?`)) {
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
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-online" /> Online
          </span>
        );
      case 'auth_required':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-950/60 text-amber-400 border border-amber-800/60">
            <Lock className="w-3 h-3" /> Requer Senha
          </span>
        );
      case 'offline':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-950/60 text-rose-400 border border-rose-800/60">
            <XCircle className="w-3 h-3" /> Offline
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
            Desconhecido
          </span>
        );
    }
  };

  return (
    <div className="p-6 space-y-5 h-full overflow-y-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CameraIcon className="w-5 h-5 text-blue-400" /> Gerenciamento de Câmeras ({cameras.length})
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cadastro, diagnóstico, status em tempo real e perfis de transmissão
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-1.5 transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Adicionar Câmera
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, IP, fabricante, modelo ou tags..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-lg transition ${
              statusFilter === 'all'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 font-semibold'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            Todas ({cameras.length})
          </button>
          <button
            onClick={() => setStatusFilter('online')}
            className={`px-3 py-1 rounded-lg transition ${
              statusFilter === 'online'
                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800 font-semibold'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            Online ({cameras.filter((c) => c.status === 'online').length})
          </button>
          <button
            onClick={() => setStatusFilter('offline')}
            className={`px-3 py-1 rounded-lg transition ${
              statusFilter === 'offline'
                ? 'bg-rose-950/60 text-rose-400 border border-rose-800 font-semibold'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            Offline ({cameras.filter((c) => c.status === 'offline').length})
          </button>
          <button
            onClick={() => setStatusFilter('auth_required')}
            className={`px-3 py-1 rounded-lg transition ${
              statusFilter === 'auth_required'
                ? 'bg-amber-950/60 text-amber-400 border border-amber-800 font-semibold'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            Requer Senha ({cameras.filter((c) => c.status === 'auth_required').length})
          </button>
        </div>
      </div>

      {/* Cameras Table */}
      {filteredCameras.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
          <CameraIcon className="w-10 h-10 mx-auto mb-3 text-slate-600" />
          <p className="text-sm font-semibold text-slate-300">Nenhuma câmera encontrada</p>
          <p className="text-xs text-slate-500 mt-1">
            {search || statusFilter !== 'all'
              ? 'Tente alterar os filtros de pesquisa acima.'
              : 'Clique no botão acima para cadastrar manualmente ou faça uma varredura na rede.'}
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Câmera / Identificação</th>
                  <th className="py-3 px-4">Endereço IP & Portas</th>
                  <th className="py-3 px-4">Status & Último Contato</th>
                  <th className="py-3 px-4">Capabilities</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredCameras.map((cam) => (
                  <tr key={cam.id} className="hover:bg-slate-800/40 transition">
                    {/* Name & Model */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-blue-400 font-semibold">
                          <CameraIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs">{cam.name}</div>
                          <div className="text-[11px] text-slate-400">
                            {cam.manufacturer || 'Genérica'} {cam.model ? `• ${cam.model}` : ''}
                          </div>
                          {cam.tags && cam.tags.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              {cam.tags.map((t, idx) => (
                                <span key={idx} className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* IP & Ports */}
                    <td className="py-3 px-4 font-mono text-[11px]">
                      <div className="text-white font-semibold">{cam.host}</div>
                      <div className="text-slate-500 text-[10px]">
                        HTTP: {cam.port} | RTSP: {cam.rtsp_port}
                      </div>
                      {cam.mac_address && (
                        <div className="text-slate-500 text-[10px]">MAC: {cam.mac_address}</div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div>{getStatusBadge(cam.status)}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {cam.last_seen_at
                            ? `Visto ${new Date(cam.last_seen_at).toLocaleTimeString('pt-BR')}`
                            : 'Aguardando contato'}
                        </div>
                      </div>
                    </td>

                    {/* Capabilities */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 text-[10px] font-mono">
                        {cam.capabilities.onvif && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-950/60 text-blue-400 border border-blue-800/60">
                            ONVIF
                          </span>
                        )}
                        {cam.capabilities.rtsp && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                            RTSP
                          </span>
                        )}
                        {cam.capabilities.ptz && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-400 border border-purple-800/60">
                            PTZ
                          </span>
                        )}
                        {cam.capabilities.sub_stream && (
                          <span className="px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/60">
                            Substream
                          </span>
                        )}
                        {cam.capabilities.snapshot && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            Snapshot
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Snapshot */}
                        <button
                          onClick={() => onOpenSnapshot(cam)}
                          title="Ver Snapshot"
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                        >
                          <Camera className="w-3.5 h-3.5" />
                        </button>

                        {/* Diagnostics */}
                        <button
                          onClick={() => onOpenDiagnostics(cam)}
                          title="Diagnóstico Técnico (10 etapas)"
                          className="p-1.5 rounded bg-slate-800 hover:bg-blue-600/30 text-blue-400 border border-slate-700 hover:border-blue-500/40 transition"
                        >
                          <Activity className="w-3.5 h-3.5" />
                        </button>

                        {/* Test Connection */}
                        <button
                          onClick={() => handleTestConnection(cam)}
                          disabled={testingId === cam.id}
                          title="Testar Conectividade"
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${testingId === cam.id ? 'animate-spin-custom text-blue-400' : ''}`} />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => setSelectedCameraForEdit(cam)}
                          title="Editar Câmera"
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteCamera(cam)}
                          disabled={deletingId === cam.id}
                          title="Excluir Câmera"
                          className="p-1.5 rounded bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 border border-slate-700 transition"
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
