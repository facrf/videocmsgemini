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
      const res = await api.createLayout({
        name,
        grid_size: gridSize,
        is_default: isDefault,
        items,
      });
      if (isDefault && res?.id) {
        await api.setDefaultLayout(res.id);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar layout');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/40 rounded-xl max-w-md w-full overflow-hidden shadow-xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-700/40 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">Salvar Layout de Mosaico</h3>
              <p className="text-sm text-slate-400">
                Grade: {gridSize} posições ({Object.keys(assignedCameras).length} câmeras)
              </p>
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
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-600/20 border border-rose-500/30 rounded-lg text-rose-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-slate-300 mb-1">Nome do Layout *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Mosaico Portaria & Perímetro"
              className="w-full bg-slate-800 border border-slate-700/40 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none"
              required
              autoFocus
            />
          </div>

          <div
            className="flex items-center space-x-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/40 cursor-pointer"
            onClick={() => setIsDefault(!isDefault)}
          >
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-900 border-slate-700/40 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="isDefault" className="text-sm text-slate-300 cursor-pointer flex items-center gap-1.5">
              <Star className={`w-4 h-4 ${isDefault ? 'fill-amber-400 text-amber-400' : 'text-slate-500'}`} />
              Definir como layout padrão ao abrir o Live View
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-700/40 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 border border-slate-700/40 text-slate-300 rounded-lg transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Layout'}
          </button>
        </div>
      </div>
    </div>
  );
};
