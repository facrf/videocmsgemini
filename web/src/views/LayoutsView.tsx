import React from 'react';
import {
  LayoutGrid,
  Trash2,
  Play,
  Star,
} from 'lucide-react';
import { Layout } from '../types';
import { api } from '../api/client';
import { NavTab } from '../components/Sidebar';

interface LayoutsViewProps {
  layouts: Layout[];
  onRefresh: () => void;
  onNavigate: (tab: NavTab) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const LayoutsView: React.FC<LayoutsViewProps> = ({
  layouts = [],
  onRefresh,
  onNavigate,
  showToast,
}) => {
  const safeLayouts = layouts || [];
  const handleDelete = async (l: Layout) => {
    if (!window.confirm(`Deseja realmente excluir o layout "${l.name}"?`)) return;
    try {
      await api.deleteLayout(l.id);
      showToast(`Layout "${l.name}" removido com sucesso.`, 'success');
      onRefresh();
    } catch (err: any) {
      showToast(`Erro ao remover layout: ${err.message}`, 'error');
    }
  };

  return (
    <div className="p-5 sm:p-7 space-y-6 h-full overflow-y-auto select-none bg-[#0a0a12] text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 border border-slate-700/40 shadow-sm">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-100 tracking-tight">
              Layouts de Mosaico Salvos
            </h2>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700/40 shadow-sm">
              {safeLayouts.length} arranjos
            </span>
          </div>
          <p className="text-sm text-slate-400">
            Gerencie e alterne rapidamente entre grades e arranjos pré-configurados de câmeras
          </p>
        </div>

        <button
          onClick={() => onNavigate('live')}
          className="px-5 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 transition-colors shadow-sm"
        >
          <Play className="w-4 h-4" />
          <span>Criar Novo no Live View</span>
        </button>
      </div>

      {/* Layouts Grid */}
      {safeLayouts.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-16 text-center text-slate-400 shadow-sm">
          <div className="w-16 h-16 rounded-lg bg-slate-900 border border-slate-700/40 flex items-center justify-center mx-auto mb-4 text-slate-500 shadow-sm">
            <LayoutGrid className="w-8 h-8" />
          </div>
          <p className="text-base font-medium text-slate-200">Nenhum layout salvo ainda</p>
          <p className="text-sm text-slate-400 mt-2 max-w-sm mx-auto">
            Abra a tela Live View, organize suas posições de câmeras na grade desejada e clique em "Salvar Layout".
          </p>
          <button
            onClick={() => onNavigate('live')}
            className="mt-6 px-5 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-2 shadow-sm mx-auto"
          >
            <Play className="w-4 h-4" /> Abrir Live View
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {safeLayouts.map((l) => {
            const items = l.items || [];
            return (
              <div
                key={l.id}
                className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-5"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5">
                      <h3 className="text-base font-semibold text-slate-100">
                        {l.name}
                      </h3>
                      {l.is_default && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[11px] font-medium shadow-sm">
                          <Star className="w-3 h-3 fill-amber-500" /> Layout Padrão
                        </span>
                      )}
                    </div>
                    <span className="px-3 py-1 rounded-full bg-slate-900 text-slate-300 border border-slate-700/40 text-xs font-medium shadow-sm">
                      {l.grid_size} Posições
                    </span>
                  </div>

                  <p className="text-sm text-slate-400">
                    {items.length} câmera(s) vinculada(s) à grade de visualização.
                  </p>

                  {/* Assigned Camera Slots Preview */}
                  {items.length > 0 && (
                    <div className="p-4 bg-slate-900 rounded-lg border border-slate-700/40 text-sm space-y-2 shadow-sm">
                      {items.slice(0, 4).map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-slate-300 text-xs truncate">
                          <span className="text-slate-500">Slot #{item.position + 1}:</span>
                          <span className="truncate ml-2 text-slate-200 font-medium">
                            {item.camera_name || item.camera_id}
                          </span>
                        </div>
                      ))}
                      {items.length > 4 && (
                        <div className="text-xs text-slate-500 pt-2 text-center font-medium border-t border-slate-800 mt-2">
                          + {items.length - 4} outras câmeras configuradas
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-700/40">
                  <button
                    onClick={() => onNavigate('live')}
                    className="px-4 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700/40 flex items-center gap-2 transition-colors shadow-sm"
                  >
                    <Play className="w-4 h-4 text-slate-400" /> Abrir no Live View
                  </button>
                  <button
                    onClick={() => handleDelete(l)}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Excluir Layout"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
