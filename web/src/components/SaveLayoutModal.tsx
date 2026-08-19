import React, { useState } from 'react';
import { X, LayoutGrid, Save, Star } from 'lucide-react';
import { api } from '../api/client';
import { Camera, LayoutItem } from '../types';

interface SaveLayoutModalProps {
  gridSize: number;
  assignedCameras: Record<number, Camera>;
  onClose: () => void;
  onSaved: () => void;
}

export const SaveLayoutModal: React.FC<SaveLayoutModalProps> = ({
  gridSize,
  assignedCameras,
  onClose,
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setError('Informe um nome para o layout');
      return;
    }

    setSaving(true);
    setError(null);

    const items: LayoutItem[] = [];
    Object.entries(assignedCameras).forEach(([posStr, cam]) => {
      items.push({
        position: Number(posStr),
        camera_id: cam.id,
        preferred_profile: 'auto',
      });
    });

    try {
      await api.createLayout({
        name,
        grid_size: gridSize,
        is_default: isDefault,
        items,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar layout');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 select-none">
      <div className="bg-[#0b101d] border border-slate-700/80 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-[#070b14]">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white font-mono">Salvar Layout de Mosaico</h3>
              <p className="text-xs font-mono text-slate-400">
                Grade: {gridSize} posições ({Object.keys(assignedCameras).length} câmeras)
              </p>
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
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
            <div className="p-4 bg-rose-950/80 border border-rose-800 rounded-2xl text-rose-300 text-xs shadow-inner">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 font-mono">Nome do Layout *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Mosaico Portaria & Perímetro"
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:border-blue-500 shadow-inner font-mono font-bold"
              required
              autoFocus
            />
          </div>

          <div
            className="flex items-center space-x-3 p-3.5 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner cursor-pointer"
            onClick={() => setIsDefault(!isDefault)}
          >
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="isDefault" className="text-xs text-slate-300 cursor-pointer font-bold flex items-center gap-1.5">
              <Star className={`w-3.5 h-3.5 ${isDefault ? 'fill-amber-400 text-amber-400' : 'text-slate-500'}`} />
              Definir como layout padrão ao abrir o Live View
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#070b14] flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-2xl transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 text-xs font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-2xl transition flex items-center gap-2 shadow-lg shadow-blue-600/30 disabled:opacity-50 hover:scale-105"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Layout'}
          </button>
        </div>
      </div>
    </div>
  );
};
