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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 shadow-sm shadow-emerald-900/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-online" /> Online
          </span>
        );
      case 'auth_required':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-amber-950/80 text-amber-300 border border-amber-700/80 shadow-sm shadow-amber-900/30">
            <Lock className="w-3.5 h-3.5 text-amber-400" /> Requer Senha
          </span>
        );
      case 'offline':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-rose-950/80 text-rose-300 border border-rose-700/80 shadow-sm shadow-rose-900/30">
            <XCircle className="w-3.5 h-3.5 text-rose-400" /> Offline
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-900 text-slate-400 border border-slate-800">
            Desconhecido
          </span>
        );
    }
  };

  return (
    <div className="p-5 sm:p-7 space-y-6 h-full overflow-y-auto select-none bg-[#060911]">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <div className="p-2 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-inner">
              <CameraIcon className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight font-mono">
              Gerenciamento de Câmeras IP
            </h2>
            <span className="text-xs font-mono font-black px-2.5 py-1 rounded-full bg-blue-950 text-blue-300 border border-blue-800/60 shadow-sm">
              {cameras.length} no catálogo
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Cadastro técnico, diagnóstico ONVIF/RTSP em 10 etapas, status em tempo real e substreams
          </p>
        </div>

        <div className="flex items-center space-x-2.5 w-full sm:w-auto">
          <button
            onClick={handleTestAll}
            disabled={testingAll || cameras.length === 0}
            className="flex-1 sm:flex-initial px-4 py-2.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-2xl border border-slate-700/80 flex items-center justify-center gap-2 transition shadow-md hover:scale-105 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-blue-400 ${testingAll ? 'animate-spin-custom' : ''}`} />
            <span>Testar Todas</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-initial px-5 py-2.5 text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl flex items-center justify-center gap-2 transition shadow-lg shadow-blue-600/30 hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Câmera</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-[#0a0f1d]/90 border border-slate-800/90 rounded-3xl p-4 shadow-xl">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, IP, fabricante, tag ou grupo..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition shadow-inner font-mono"
          />
        </div>

        <div className="flex items-center justify-between gap-3 overflow-x-auto">
          {/* Status Filter Tabs */}
          <div className="flex items-center space-x-1.5 text-xs p-1 bg-slate-950 rounded-2xl border border-slate-800/80">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              Todas ({safeCameras.length})
            </button>
            <button
              onClick={() => setStatusFilter('online')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition ${
                statusFilter === 'online'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              Online ({safeCameras.filter((c) => c && c.status === 'online').length})
            </button>
            <button
              onClick={() => setStatusFilter('offline')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition ${
                statusFilter === 'offline'
                  ? 'bg-rose-950 text-rose-300 border border-rose-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              Offline ({safeCameras.filter((c) => c && c.status === 'offline').length})
            </button>
            <button
              onClick={() => setStatusFilter('auth_required')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition ${
                statusFilter === 'auth_required'
                  ? 'bg-amber-950 text-amber-300 border border-amber-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              Requer Senha ({safeCameras.filter((c) => c && c.status === 'auth_required').length})
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-1 p-1 bg-slate-950 rounded-2xl border border-slate-800/80">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl transition ${
                viewMode === 'grid' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="Visualização em Grade de Cards"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-xl transition ${
                viewMode === 'table' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="Visualização em Tabela Técnica"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Rendering: Empty vs Grid vs Table */}
      {filteredCameras.length === 0 ? (
        <div className="bg-[#0a0f1d]/90 border border-slate-800/90 rounded-3xl p-16 text-center text-slate-500 shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-600 shadow-inner">
            <CameraIcon className="w-8 h-8" />
          </div>
          <p className="text-sm font-extrabold text-slate-200">Nenhuma câmera encontrada</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
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
              className="bg-[#0a0f1d]/95 border border-slate-800/90 hover:border-blue-500/60 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 flex flex-col justify-between group"
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
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-white border border-white/10 shadow-sm">
                        {cam.codec.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Info Content */}
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-white text-sm font-mono group-hover:text-blue-400 transition-colors">
                        {cam.name}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        {cam.manufacturer || 'Fabricante Genérico'} {cam.model ? `• ${cam.model}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80 font-mono text-xs space-y-1 shadow-inner">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-500 text-[10px]">HOST / IP:</span>
                      <span className="font-bold text-white">{cam.host}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>PORTAS:</span>
                      <span>HTTP: {cam.port} | RTSP: {cam.rtsp_port}</span>
                    </div>
                    {cam.mac_address && (
                      <div className="flex items-center justify-between text-slate-500 text-[10px]">
                        <span>MAC:</span>
                        <span>{cam.mac_address}</span>
                      </div>
                    )}
                  </div>

                  {/* Badges / Capabilities */}
                  <div className="flex flex-wrap gap-1.5 text-[10px] font-mono font-bold">
                    {cam.capabilities?.onvif && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-950 text-blue-300 border border-blue-800/60">
                        ONVIF
                      </span>
                    )}
                    {cam.capabilities?.rtsp && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                        RTSP
                      </span>
                    )}
                    {cam.capabilities?.ptz && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-950 text-purple-300 border border-purple-800/60">
                        PTZ
                      </span>
                    )}
                    {cam.capabilities?.sub_stream && (
                      <span className="px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                        SUBSTREAM
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  {cam.tags && cam.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {cam.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 border border-slate-800 flex items-center gap-0.5"
                        >
                          <Tag className="w-2.5 h-2.5 text-blue-400" /> #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="px-5 py-3.5 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => onOpenSnapshot(cam)}
                    title="Snapshot Instantâneo"
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition shadow-sm hover:scale-105"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onOpenDiagnostics(cam)}
                    title="Diagnóstico Técnico (10 etapas)"
                    className="p-2 rounded-xl bg-slate-900 hover:bg-blue-600/30 text-blue-400 border border-slate-800 hover:border-blue-500/50 transition shadow-sm hover:scale-105"
                  >
                    <Activity className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleTestConnection(cam)}
                    disabled={testingId === cam.id}
                    title="Testar Conexão Agora"
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition shadow-sm hover:scale-105 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${testingId === cam.id ? 'animate-spin-custom text-blue-400' : ''}`} />
                  </button>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => setSelectedCameraForEdit(cam)}
                    title="Editar Configurações"
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition shadow-sm hover:scale-105"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCamera(cam)}
                    disabled={deletingId === cam.id}
                    title="Excluir Câmera"
                    className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-800 transition shadow-sm hover:scale-105"
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
        <div className="bg-[#0a0f1d]/90 border border-slate-800/90 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 border-b border-slate-800/90 text-slate-400 uppercase tracking-wider font-bold text-[10px] font-mono">
                <tr>
                  <th className="py-4 px-5">Câmera & Modelo</th>
                  <th className="py-4 px-5">Endereço IP & Portas</th>
                  <th className="py-4 px-5">Status Operacional</th>
                  <th className="py-4 px-5">Protocolos & Codec</th>
                  <th className="py-4 px-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredCameras.map((cam) => (
                  <tr key={cam.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center space-x-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-blue-400 font-semibold shadow-inner flex-shrink-0">
                          <CameraIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-extrabold text-white text-xs font-mono">{cam.name}</div>
                          <div className="text-[11px] text-slate-400">
                            {cam.manufacturer || 'Genérica'} {cam.model ? `• ${cam.model}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5 font-mono text-xs">
                      <div className="text-white font-bold">{cam.host}</div>
                      <div className="text-slate-400 text-[10px] mt-0.5">
                        HTTP: {cam.port} | RTSP: {cam.rtsp_port}
                      </div>
                    </td>
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
                    <td className="py-4 px-5">
                      <div className="flex flex-wrap gap-1 text-[10px] font-mono font-bold">
                        {cam.capabilities?.onvif && (
                          <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                            ONVIF
                          </span>
                        )}
                        {cam.capabilities?.rtsp && (
                          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                            RTSP
                          </span>
                        )}
                        {cam.capabilities?.ptz && (
                          <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                            PTZ
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => onOpenSnapshot(cam)}
                          title="Snapshot"
                          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition"
                        >
                          <Camera className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onOpenDiagnostics(cam)}
                          title="Diagnóstico"
                          className="p-2 rounded-xl bg-slate-900 hover:bg-blue-600/30 text-blue-400 border border-slate-800 transition"
                        >
                          <Activity className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleTestConnection(cam)}
                          title="Testar"
                          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${testingId === cam.id ? 'animate-spin-custom text-blue-400' : ''}`} />
                        </button>
                        <button
                          onClick={() => setSelectedCameraForEdit(cam)}
                          title="Editar"
                          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCamera(cam)}
                          title="Excluir"
                          className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-800 transition"
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
