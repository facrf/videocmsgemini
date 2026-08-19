import React, { useState } from 'react';
import {
  Camera as CameraIcon,
  Plus,
  Search,
  XCircle,
  Lock,
  Edit2,
  Trash2,
  RefreshCw,
  Activity,
  LayoutGrid,
  List,
  Tag,
  Camera,
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
  cameras = [],
  onRefresh,
  onOpenSnapshot,
  onOpenDiagnostics,
  showToast,
}) => {
  const safeCameras = cameras || [];
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedCameraForEdit, setSelectedCameraForEdit] = useState<CameraType | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testingAll, setTestingAll] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter cameras
  const filteredCameras = safeCameras.filter((cam) => {
    if (!cam) return false;
    const matchesSearch =
      (cam.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (cam.host || '').toLowerCase().includes(search.toLowerCase()) ||
      (cam.manufacturer || '').toLowerCase().includes(search.toLowerCase()) ||
      (cam.model || '').toLowerCase().includes(search.toLowerCase()) ||
      (cam.tags || []).some((t) => (t || '').toLowerCase().includes(search.toLowerCase())) ||
      (cam.groups || []).some((g) => (g || '').toLowerCase().includes(search.toLowerCase()));

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

  const handleTestAll = async () => {
    setTestingAll(true);
    try {
      const res = await api.testAllCameras();
      const passed = res.results.filter((r) => r.success).length;
      showToast(`Teste concluído: ${passed} de ${res.total} câmeras online.`, 'info');
      onRefresh();
    } catch (err: any) {
      showToast(`Erro no teste em lote: ${err.message}`, 'error');
    } finally {
      setTestingAll(false);
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
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-online" /> Online
          </span>
        );
      case 'auth_required':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Lock className="w-3 h-3 text-amber-500" /> Requer Senha
          </span>
        );
      case 'offline':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <XCircle className="w-3 h-3 text-rose-500" /> Offline
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700/40">
            Desconhecido
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 h-full overflow-y-auto select-none bg-[#0a0a12]">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <CameraIcon className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-100 tracking-tight">
              Gerenciamento de Câmeras IP
            </h2>
            <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/40">
              {cameras.length} no catálogo
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Cadastro técnico, diagnóstico ONVIF/RTSP em 10 etapas, status em tempo real e substreams
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button
            onClick={handleTestAll}
            disabled={testingAll || cameras.length === 0}
            className="flex-1 sm:flex-initial px-4 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg border border-slate-700/40 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-blue-500 ${testingAll ? 'animate-spin-custom' : ''}`} />
            <span>Testar Todas</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-initial px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center justify-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Câmera</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-slate-900 border border-slate-700/40 rounded-xl p-4 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, IP, fabricante, tag ou grupo..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800/50 border border-slate-700/40 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="flex items-center justify-between gap-3 overflow-x-auto">
          {/* Status Filter Tabs */}
          <div className="flex items-center space-x-1 text-sm p-1 bg-slate-800/50 rounded-lg border border-slate-700/40">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/50'
              }`}
            >
              Todas ({safeCameras.length})
            </button>
            <button
              onClick={() => setStatusFilter('online')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                statusFilter === 'online'
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/50'
              }`}
            >
              Online ({safeCameras.filter((c) => c && c.status === 'online').length})
            </button>
            <button
              onClick={() => setStatusFilter('offline')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                statusFilter === 'offline'
                  ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/50'
              }`}
            >
              Offline ({safeCameras.filter((c) => c && c.status === 'offline').length})
            </button>
            <button
              onClick={() => setStatusFilter('auth_required')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                statusFilter === 'auth_required'
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/50'
              }`}
            >
              Requer Senha ({safeCameras.filter((c) => c && c.status === 'auth_required').length})
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-1 p-1 bg-slate-800/50 rounded-lg border border-slate-700/40">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition ${
                viewMode === 'grid' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-100'
              }`}
              title="Visualização em Grade"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition ${
                viewMode === 'table' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-100'
              }`}
              title="Visualização em Tabela"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Rendering: Empty vs Grid vs Table */}
      {filteredCameras.length === 0 ? (
        <div className="bg-slate-900 border border-slate-700/40 rounded-xl p-16 text-center text-slate-500 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-slate-800/50 border border-slate-700/40 flex items-center justify-center mx-auto mb-4 text-slate-400">
            <CameraIcon className="w-8 h-8" />
          </div>
          <p className="text-base font-medium text-slate-100">Nenhuma câmera encontrada</p>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            {search || statusFilter !== 'all'
              ? 'Tente ajustar ou limpar seus filtros de pesquisa acima.'
              : 'Cadastre sua primeira câmera IP manualmente ou realize uma varredura na rede.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid / Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCameras.map((cam) => (
            <div
              key={cam.id}
              className="bg-slate-800/50 border border-slate-700/40 hover:border-blue-500/50 rounded-xl overflow-hidden shadow-sm transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Live Preview Thumbnail / Header */}
                <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                  <img
                    src={api.getLiveStreamUrl(cam.id, 'sub')}
                    alt={cam.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3">{getStatusBadge(cam.status)}</div>
                  <div className="absolute top-3 right-3 flex items-center space-x-1.5">
                    {cam.codec && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-900/80 text-slate-100 border border-slate-700/40">
                        {cam.codec.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Info Content */}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-100 text-base group-hover:text-blue-500 transition-colors">
                        {cam.name}
                      </h3>
                      <p className="text-sm text-slate-400 mt-0.5">
                        {cam.manufacturer || 'Fabricante Genérico'} {cam.model ? `• ${cam.model}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-700/40 text-sm space-y-1.5">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-500 text-xs">HOST / IP:</span>
                      <span className="font-mono text-slate-100">{cam.host}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400 text-xs">
                      <span>PORTAS:</span>
                      <span className="font-mono">HTTP: {cam.port} | RTSP: {cam.rtsp_port}</span>
                    </div>
                    {cam.mac_address && (
                      <div className="flex items-center justify-between text-slate-500 text-xs">
                        <span>MAC:</span>
                        <span className="font-mono">{cam.mac_address}</span>
                      </div>
                    )}
                  </div>

                  {/* Badges / Capabilities */}
                  <div className="flex flex-wrap gap-1.5 text-xs font-medium">
                    {cam.capabilities?.onvif && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 border border-blue-500/20">
                        ONVIF
                      </span>
                    )}
                    {cam.capabilities?.rtsp && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        RTSP
                      </span>
                    )}
                    {cam.capabilities?.ptz && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        PTZ
                      </span>
                    )}
                    {cam.capabilities?.sub_stream && (
                      <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        SUBSTREAM
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  {cam.tags && cam.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {cam.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/40 flex items-center gap-1"
                        >
                          <Tag className="w-3 h-3 text-blue-500" /> {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="px-4 py-3 bg-slate-900 border-t border-slate-700/40 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onOpenSnapshot(cam)}
                    title="Snapshot Instantâneo"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 border border-slate-700/40 transition"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onOpenDiagnostics(cam)}
                    title="Diagnóstico Técnico"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-500/10 text-blue-500 border border-slate-700/40 transition"
                  >
                    <Activity className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleTestConnection(cam)}
                    disabled={testingId === cam.id}
                    title="Testar Conexão"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 border border-slate-700/40 transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${testingId === cam.id ? 'animate-spin-custom text-blue-500' : ''}`} />
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedCameraForEdit(cam)}
                    title="Editar Configurações"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 border border-slate-700/40 transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCamera(cam)}
                    disabled={deletingId === cam.id}
                    title="Excluir Câmera"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 border border-slate-700/40 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Technical Table View */
        <div className="bg-slate-900 border border-slate-700/40 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/50 border-b border-slate-700/40 text-slate-400 text-xs uppercase tracking-wider font-medium">
                <tr>
                  <th className="py-3 px-4">Câmera & Modelo</th>
                  <th className="py-3 px-4">Endereço IP & Portas</th>
                  <th className="py-3 px-4">Status Operacional</th>
                  <th className="py-3 px-4">Protocolos & Codec</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40 text-slate-300">
                {filteredCameras.map((cam) => (
                  <tr key={cam.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700/40 flex items-center justify-center text-blue-500 flex-shrink-0">
                          <CameraIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-100">{cam.name}</div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {cam.manufacturer || 'Genérica'} {cam.model ? `• ${cam.model}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div className="text-slate-100 font-mono">{cam.host}</div>
                      <div className="text-slate-400 text-xs font-mono mt-0.5">
                        HTTP: {cam.port} | RTSP: {cam.rtsp_port}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div>{getStatusBadge(cam.status)}</div>
                        <div className="text-xs text-slate-500">
                          {cam.last_seen_at
                            ? `Visto às ${new Date(cam.last_seen_at).toLocaleTimeString('pt-BR')}`
                            : 'Aguardando ping'}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 text-xs font-medium">
                        {cam.capabilities?.onvif && (
                          <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 border border-blue-500/20">
                            ONVIF
                          </span>
                        )}
                        {cam.capabilities?.rtsp && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            RTSP
                          </span>
                        )}
                        {cam.capabilities?.ptz && (
                          <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            PTZ
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => onOpenSnapshot(cam)}
                          title="Snapshot"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 border border-slate-700/40 transition"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onOpenDiagnostics(cam)}
                          title="Diagnóstico"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-500/10 text-blue-500 border border-slate-700/40 transition"
                        >
                          <Activity className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleTestConnection(cam)}
                          title="Testar"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 border border-slate-700/40 transition"
                        >
                          <RefreshCw className={`w-4 h-4 ${testingId === cam.id ? 'animate-spin-custom text-blue-500' : ''}`} />
                        </button>
                        <button
                          onClick={() => setSelectedCameraForEdit(cam)}
                          title="Editar"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 border border-slate-700/40 transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCamera(cam)}
                          title="Excluir"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 border border-slate-700/40 transition"
                        >
                          <Trash2 className="w-4 h-4" />
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
            showToast('Câmera cadastrada com sucesso!', 'success');
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
