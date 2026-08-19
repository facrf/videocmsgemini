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
  layouts,
  onRefresh,
  onNavigate,
  showToast,
}) => {
  const handleDelete = async (l: Layout) => {
    if (!window.confirm(`Deseja excluir o layout "${l.name}"?`)) return;
    try {
      await api.deleteLayout(l.id);
      showToast(`Layout "${l.name}" removido com sucesso.`, 'success');
      onRefresh();
    } catch (err: any) {
      showToast(`Erro ao remover layout: ${err.message}`, 'error');
    }
  };

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-blue-400" /> Layouts de Mosaico Salvos ({layouts.length})
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Gerencie configurações de telas de monitoramento e posições de câmeras
          </p>
        </div>
        <button
          onClick={() => onNavigate('live')}
          className="px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-1.5 transition shadow-sm"
        >
          <Play className="w-4 h-4" />
          Abrir Live View & Salvar Novo
        </button>
      </div>

      {/* Layouts Grid */}
      {layouts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
          <LayoutGrid className="w-10 h-10 mx-auto mb-3 text-slate-600" />
          <p className="text-sm font-semibold text-slate-300">Nenhum layout salvo ainda</p>
          <p className="text-xs text-slate-500 mt-1">
            Abra a tela Live View, organize sua grade de câmeras e clique no botão "Salvar Layout".
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {layouts.map((l) => (
            <div
              key={l.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 shadow-lg flex flex-col justify-between space-y-4 group transition"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-white group-hover:text-blue-400 transition">
                      {l.name}
                    </span>
                    {l.is_default && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-mono flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400" /> Padrão
                      </span>
                    )}
                  </div>
                  <span className="px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/60 text-xs font-mono">
                    Grade {l.grid_size}x
                  </span>
                </div>

                <p className="text-xs text-slate-400">
                  {l.items?.length || 0} câmera(s) atribuída(s) neste layout.
                </p>

                {/* Assigned Camera Slots Preview */}
                {l.items && l.items.length > 0 && (
                  <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800 text-[11px] space-y-1">
                    {l.items.slice(0, 4).map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-slate-300 truncate">
                        <span className="font-mono text-slate-500">Slot #{item.position + 1}:</span>
                        <span className="truncate ml-2 text-white font-medium">
                          {item.camera_name || item.camera_id}
                        </span>
                      </div>
                    ))}
                    {l.items.length > 4 && (
                      <div className="text-[10px] text-slate-500 pt-1 text-center">
                        + {l.items.length - 4} outras posições
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <button
                  onClick={() => onNavigate('live')}
                  className="px-3 py-1.5 text-xs font-medium bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg border border-blue-500/30 flex items-center gap-1.5 transition"
                >
                  <Play className="w-3.5 h-3.5" /> Abrir no Live View
                </button>
                <button
                  onClick={() => handleDelete(l)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition"
                  title="Excluir Layout"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
