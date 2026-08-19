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
    <div className="p-5 sm:p-7 space-y-6 h-full overflow-y-auto select-none bg-[#060911]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <div className="p-2 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-inner">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight font-mono">
              Layouts de Mosaico Salvos
            </h2>
            <span className="text-xs font-mono font-black px-2.5 py-1 rounded-full bg-blue-950 text-blue-300 border border-blue-800/60 shadow-sm">
              {safeLayouts.length} arranjos
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Gerencie e alterne rapidamente entre grades e arranjos pré-configurados de câmeras
          </p>
        </div>

        <button
          onClick={() => onNavigate('live')}
          className="px-5 py-2.5 text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl flex items-center gap-2 transition shadow-lg shadow-blue-600/25 hover:scale-105"
        >
          <Play className="w-4 h-4" />
          <span>Criar Novo no Live View</span>
        </button>
      </div>

      {/* Layouts Grid */}
      {safeLayouts.length === 0 ? (
        <div className="bg-[#0a0f1d]/90 border border-slate-800/90 rounded-3xl p-16 text-center text-slate-500 shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-600 shadow-inner">
            <LayoutGrid className="w-8 h-8" />
          </div>
          <p className="text-sm font-extrabold text-slate-200">Nenhum layout salvo ainda</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Abra a tela Live View, organize suas posições de câmeras na grade desejada e clique em "Salvar Layout".
          </p>
          <button
            onClick={() => onNavigate('live')}
            className="mt-5 px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-2xl transition flex items-center gap-2 shadow-md mx-auto hover:scale-105"
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
                className="bg-[#0a0f1d]/95 border border-slate-800/90 hover:border-blue-500/60 rounded-3xl p-6 shadow-2xl flex flex-col justify-between space-y-4 group transition-all duration-300"
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="text-base font-black text-white font-mono group-hover:text-blue-400 transition-colors">
                        {l.name}
                      </h3>
                      {l.is_default && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-950/90 text-amber-300 border border-amber-800 text-[10px] font-mono font-black shadow-sm">
                          <Star className="w-3 h-3 fill-amber-400" /> Layout Padrão
                        </span>
                      )}
                    </div>
                    <span className="px-3 py-1 rounded-full bg-blue-950 text-blue-300 border border-blue-800/80 text-xs font-mono font-black shadow-sm">
                      {l.grid_size} Posições
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 font-medium">
                    {items.length} câmera(s) vinculada(s) à grade de visualização.
                  </p>

                  {/* Assigned Camera Slots Preview */}
                  {items.length > 0 && (
                    <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-xs space-y-1.5 shadow-inner">
                      {items.slice(0, 4).map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-slate-300 text-[11px] truncate font-mono">
                          <span className="text-slate-500 text-[10px]">Slot #{item.position + 1}:</span>
                          <span className="truncate ml-2 text-white font-bold">
                            {item.camera_name || item.camera_id}
                          </span>
                        </div>
                      ))}
                      {items.length > 4 && (
                        <div className="text-[10px] text-slate-500 pt-1 text-center font-mono font-bold">
                          + {items.length - 4} outras câmeras configuradas
                        </div>
                      )}
                    </div>
                  )}
                </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
                <button
                  onClick={() => onNavigate('live')}
                  className="px-4 py-2 text-xs font-bold bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-2xl border border-blue-500/40 flex items-center gap-1.5 transition shadow-sm hover:scale-105"
                >
                  <Play className="w-3.5 h-3.5" /> Abrir no Live View
                </button>
                <button
                  onClick={() => handleDelete(l)}
                  className="p-2 text-slate-400 hover:text-rose-300 hover:bg-rose-950/60 rounded-xl border border-transparent hover:border-rose-900 transition"
                  title="Excluir Layout"
                >
                  <Trash2 className="w-4 h-4" />
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
