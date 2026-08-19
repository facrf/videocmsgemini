import React, { useState } from 'react';
import { X, LayoutGrid, Save } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Salvar Layout de Mosaico</h3>
              <p className="text-xs text-slate-400">Grade atual: {gridSize} posições ({Object.keys(assignedCameras).length} câmeras)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-lg text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Layout *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Mosaico Portaria & Perímetro"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              required
              autoFocus
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isDefault" className="text-xs text-slate-300">
              Definir como layout padrão ao abrir o Live View
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/50 flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Layout'}
          </button>
        </div>
      </div>
    </div>
  );
};
