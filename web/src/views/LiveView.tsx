import React, { useState, useEffect } from 'react';
import {
  LayoutGrid,
  Save,
  RefreshCw,
  Camera as CameraIcon,
  Plus,
  X,
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
  const [selectedSlotForAssignment, setSelectedSlotForAssignment] = useState<number | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const gridSizes = [1, 4, 6, 9, 12, 16, 25, 32];

  // Auto-populate default layout or first N cameras on load
  useEffect(() => {
    if (Object.keys(assignedCameras).length === 0 && cameras.length > 0) {
      // Find default layout if exists
      const defLayout = layouts.find((l) => l.is_default);
      if (defLayout) {
        applyLayout(defLayout);
      } else {
        // Auto assign available cameras to initial slots
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
      {/* Live View Toolbar */}
      <div className="h-12 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between z-20">
        {/* Left: Grid Size Selector Buttons */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          <span className="text-xs font-semibold text-slate-400 mr-1 hidden sm:inline-block">Grade:</span>
          {gridSizes.map((size) => (
            <button
              key={size}
              onClick={() => handleGridSizeChange(size)}
              className={`px-2 py-1 text-xs font-mono rounded transition ${
                gridSize === size && maximizedSlot === null
                  ? 'bg-blue-600 text-white font-bold shadow'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              {size}
            </button>
          ))}
        </div>

        {/* Center: Saved Layouts Dropdown */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2 py-1 rounded border border-slate-700">
            <LayoutGrid className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedLayoutId}
              onChange={(e) => handleSelectLayout(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-slate-900">Layouts Salvos...</option>
              {layouts.map((l) => (
                <option key={l.id} value={l.id} className="bg-slate-900">
                  {l.name} ({l.grid_size} câmeras)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowSaveModal(true)}
            title="Salvar layout atual"
            className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 flex items-center gap-1 transition"
          >
            <Save className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Salvar Layout</span>
          </button>
        </div>

        {/* Right: Camera Drawer & Refresh */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setSelectedSlotForAssignment(null);
              setShowDrawer(!showDrawer);
            }}
            className={`px-2.5 py-1 text-xs font-medium rounded border transition flex items-center gap-1.5 ${
              showDrawer
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <CameraIcon className="w-3.5 h-3.5" />
            <span>Câmeras ({cameras.length})</span>
          </button>

          <button
            onClick={refreshAllStreams}
            title="Recarregar todos os streams"
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Grid Viewport */}
      <div className="flex-1 p-2 bg-slate-950 overflow-hidden relative">
        {renderSlots()}

        {/* Slide-over Camera Assignment Drawer */}
        {showDrawer && (
          <div className="absolute top-0 right-0 bottom-0 w-72 bg-slate-900/95 backdrop-blur-md border-l border-slate-800 shadow-2xl z-30 flex flex-col">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center space-x-2">
                <CameraIcon className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-white">
                  {selectedSlotForAssignment !== null
                    ? `Atribuir ao Slot #${selectedSlotForAssignment + 1}`
                    : 'Catálogo de Câmeras'}
                </span>
              </div>
              <button
                onClick={() => {
                  setShowDrawer(false);
                  setSelectedSlotForAssignment(null);
                }}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 overflow-y-auto flex-1 space-y-2">
              <p className="text-[11px] text-slate-400 mb-2">
                {selectedSlotForAssignment !== null
                  ? 'Clique em uma câmera abaixo para colocá-la nesta posição:'
                  : 'Clique em uma câmera para preencher a próxima posição livre:'}
              </p>

              {cameras.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  Nenhuma câmera cadastrada.
                </div>
              ) : (
                cameras.map((cam) => {
                  const isAssigned = Object.values(assignedCameras).some((c) => c.id === cam.id);
                  return (
                    <div
                      key={cam.id}
                      onClick={() => {
                        let targetSlot = selectedSlotForAssignment;
                        if (targetSlot === null) {
                          // Find first empty slot
                          for (let i = 0; i < gridSize; i++) {
                            if (!assignedCameras[i]) {
                              targetSlot = i;
                              break;
                            }
                          }
                          if (targetSlot === null) targetSlot = 0; // replace first slot
                        }
                        handleAssignCameraToSlot(targetSlot, cam);
                      }}
                      className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/60 cursor-pointer transition flex items-center justify-between group text-xs"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            cam.status === 'online' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        <div className="truncate">
                          <p className="font-semibold text-slate-200 truncate group-hover:text-blue-400">
                            {cam.name}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400 truncate">{cam.host}</p>
                        </div>
                      </div>
                      {isAssigned ? (
                        <span className="text-[10px] text-slate-500 font-mono">Na grade</span>
                      ) : (
                        <Plus className="w-4 h-4 text-slate-500 group-hover:text-blue-400" />
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
