import React, { useState, useEffect } from 'react';
import {
  LayoutGrid,
  Save,
  RefreshCw,
  Camera as CameraIcon,
  Plus,
  X,
  Search,
} from 'lucide-react';
import { Camera, Layout } from '../types';
import { CameraTile } from '../components/CameraTile';
import { SaveLayoutModal } from '../components/SaveLayoutModal';

interface LiveViewProps {
  cameras: Camera[];
  layouts: Layout[];
  onOpenSnapshot: (cam: Camera) => void;
  onOpenDiagnostics: (cam: Camera) => void;
  onRefreshLayouts: () => void;
}

export const LiveView: React.FC<LiveViewProps> = ({
  cameras,
  layouts,
  onOpenSnapshot,
  onOpenDiagnostics,
  onRefreshLayouts,
}) => {
  const [gridSize, setGridSize] = useState<number>(4);
  const [assignedCameras, setAssignedCameras] = useState<Record<number, Camera>>({});
  const [maximizedSlot, setMaximizedSlot] = useState<number | null>(null);
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerSearch, setDrawerSearch] = useState('');
  const [selectedSlotForAssignment, setSelectedSlotForAssignment] = useState<number | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const gridSizes = [1, 4, 6, 9, 12, 16, 25, 32];

  // Auto-populate default layout or first N cameras on load
  useEffect(() => {
    if (Object.keys(assignedCameras).length === 0 && cameras.length > 0) {
      const defLayout = layouts.find((l) => l.is_default);
      if (defLayout) {
        applyLayout(defLayout);
      } else {
        const initial: Record<number, Camera> = {};
        cameras.slice(0, gridSize).forEach((c, idx) => {
          initial[idx] = c;
        });
        setAssignedCameras(initial);
      }
    }
  }, [cameras, layouts]);

  const applyLayout = (layout: Layout) => {
    setSelectedLayoutId(layout.id);
    setGridSize(layout.grid_size);
    setMaximizedSlot(null);

    const newMap: Record<number, Camera> = {};
    layout.items.forEach((item) => {
      const cam = cameras.find((c) => c.id === item.camera_id);
      if (cam) {
        newMap[item.position] = cam;
      }
    });
    setAssignedCameras(newMap);
  };

  const handleSelectLayout = (layoutId: string) => {
    if (!layoutId) return;
    const l = layouts.find((item) => item.id === layoutId);
    if (l) applyLayout(l);
  };

  const handleGridSizeChange = (size: number) => {
    setGridSize(size);
    setMaximizedSlot(null);
    setSelectedLayoutId('');
  };

  const handleAssignCameraToSlot = (slot: number, camera: Camera) => {
    setAssignedCameras((prev) => ({
      ...prev,
      [slot]: camera,
    }));
    setShowDrawer(false);
    setSelectedSlotForAssignment(null);
  };

  const handleRemoveSlot = (slot: number) => {
    setAssignedCameras((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
  };

  const openAssignDrawer = (slot: number) => {
    setSelectedSlotForAssignment(slot);
    setShowDrawer(true);
  };

  const refreshAllStreams = () => {
    setRefreshCounter((prev) => prev + 1);
  };

  // Filter drawer cameras
  const filteredDrawerCameras = cameras.filter((c) =>
    c.name.toLowerCase().includes(drawerSearch.toLowerCase()) ||
    c.host.toLowerCase().includes(drawerSearch.toLowerCase()) ||
    c.manufacturer.toLowerCase().includes(drawerSearch.toLowerCase())
  );

  // Render grid slots
  const renderSlots = () => {
    if (maximizedSlot !== null && assignedCameras[maximizedSlot]) {
      const cam = assignedCameras[maximizedSlot];
      return (
        <div className="h-full w-full">
          <CameraTile
            key={`max-${cam.id}-${refreshCounter}`}
            camera={cam}
            position={maximizedSlot}
            isMaximized={true}
            onToggleMaximize={() => setMaximizedSlot(null)}
            onSnapshot={onOpenSnapshot}
            onOpenDiagnostics={onOpenDiagnostics}
          />
        </div>
      );
    }

    const slots = [];
    for (let i = 0; i < gridSize; i++) {
      const cam = assignedCameras[i];
      slots.push(
        <CameraTile
          key={`slot-${i}-${cam ? cam.id : 'empty'}-${refreshCounter}`}
          camera={cam}
          position={i}
          isMaximized={false}
          onToggleMaximize={() => setMaximizedSlot(i)}
          onRemoveSlot={() => handleRemoveSlot(i)}
          onAssignCamera={() => openAssignDrawer(i)}
          onSnapshot={onOpenSnapshot}
          onOpenDiagnostics={onOpenDiagnostics}
        />
      );
    }

    return <div className={`grid-layout-${gridSize} w-full h-full`}>{slots}</div>;
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 select-none overflow-hidden relative">
      {/* Live View Modern Control Toolbar */}
      <div className="h-13 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 flex items-center justify-between z-20 shadow-md">
        {/* Left: Grid Size Selector */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <div className="flex items-center space-x-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800/80 shadow-inner">
            <span className="text-[10px] font-bold text-slate-500 uppercase px-2 hidden sm:inline-block">
              Grade:
            </span>
            {gridSizes.map((size) => (
              <button
                key={size}
                onClick={() => handleGridSizeChange(size)}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg transition-all duration-150 ${
                  gridSize === size && maximizedSlot === null
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Saved Layouts Dropdown */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 bg-slate-950/70 px-3 py-1.5 rounded-xl border border-slate-800/80 shadow-inner">
            <LayoutGrid className="w-3.5 h-3.5 text-blue-400" />
            <select
              value={selectedLayoutId}
              onChange={(e) => handleSelectLayout(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer font-medium"
            >
              <option value="" className="bg-slate-900 text-slate-300">Layouts Salvos...</option>
              {layouts.map((l) => (
                <option key={l.id} value={l.id} className="bg-slate-900 text-white">
                  {l.name} ({l.grid_size}x)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowSaveModal(true)}
            title="Salvar layout atual"
            className="px-3 py-1.5 text-xs font-semibold bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700/80 flex items-center gap-1.5 transition shadow-sm hover:border-slate-600"
          >
            <Save className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">Salvar Layout</span>
          </button>
        </div>

        {/* Right: Camera Drawer & Refresh */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setSelectedSlotForAssignment(null);
              setShowDrawer(!showDrawer);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all flex items-center gap-2 shadow-sm ${
              showDrawer
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/50 shadow-blue-500/10'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border-slate-700/80'
            }`}
          >
            <CameraIcon className="w-3.5 h-3.5 text-blue-400" />
            <span>Câmeras ({cameras.length})</span>
          </button>

          <button
            onClick={refreshAllStreams}
            title="Recarregar todos os streams de vídeo"
            className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Grid Viewport */}
      <div className="flex-1 p-2 sm:p-2.5 bg-slate-950 overflow-hidden relative">
        {renderSlots()}

        {/* Slide-over Camera Assignment Drawer */}
        {showDrawer && (
          <div className="absolute top-0 right-0 bottom-0 w-80 bg-slate-900/95 backdrop-blur-xl border-l border-slate-800/90 shadow-2xl z-30 flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/70">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <CameraIcon className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">
                    {selectedSlotForAssignment !== null
                      ? `Slot #${selectedSlotForAssignment + 1}`
                      : 'Catálogo de Câmeras'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {selectedSlotForAssignment !== null ? 'Selecione para vincular' : 'Arraste ou clique para adicionar'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDrawer(false);
                  setSelectedSlotForAssignment(null);
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search filter in drawer */}
            <div className="p-3 border-b border-slate-800/60 bg-slate-950/40">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={drawerSearch}
                  onChange={(e) => setDrawerSearch(e.target.value)}
                  placeholder="Filtrar por nome ou IP..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="p-3 overflow-y-auto flex-1 space-y-2">
              {filteredDrawerCameras.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-500">
                  Nenhuma câmera encontrada.
                </div>
              ) : (
                filteredDrawerCameras.map((cam) => {
                  const isAssigned = Object.values(assignedCameras).some((c) => c.id === cam.id);
                  return (
                    <div
                      key={cam.id}
                      onClick={() => {
                        let targetSlot = selectedSlotForAssignment;
                        if (targetSlot === null) {
                          for (let i = 0; i < gridSize; i++) {
                            if (!assignedCameras[i]) {
                              targetSlot = i;
                              break;
                            }
                          }
                          if (targetSlot === null) targetSlot = 0;
                        }
                        handleAssignCameraToSlot(targetSlot, cam);
                      }}
                      className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-blue-500/50 hover:bg-slate-800/70 cursor-pointer transition-all flex items-center justify-between group text-xs shadow-sm"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <span
                          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                            cam.status === 'online'
                              ? 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]'
                              : cam.status === 'auth_required'
                              ? 'bg-amber-400'
                              : 'bg-rose-500'
                          }`}
                        />
                        <div className="truncate">
                          <p className="font-bold text-slate-200 truncate group-hover:text-blue-400 transition-colors">
                            {cam.name}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400 truncate">
                            {cam.host} • {cam.manufacturer || 'Genérica'}
                          </p>
                        </div>
                      </div>
                      {isAssigned ? (
                        <span className="text-[10px] font-mono text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-800/40">
                          Na grade
                        </span>
                      ) : (
                        <div className="p-1 rounded-lg bg-slate-800 group-hover:bg-blue-600 group-hover:text-white text-slate-400 transition">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Save Layout Modal */}
      {showSaveModal && (
        <SaveLayoutModal
          gridSize={gridSize}
          assignedCameras={assignedCameras}
          onClose={() => setShowSaveModal(false)}
          onSaved={() => onRefreshLayouts()}
        />
      )}
    </div>
  );
};

