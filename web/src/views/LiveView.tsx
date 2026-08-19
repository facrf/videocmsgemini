import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutGrid,
  Save,
  RefreshCw,
  Camera as CameraIcon,
  Plus,
  X,
  Search,
  Play,
  Pause,
  Sparkles,
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

  // Auto-Cycle / Carousel state
  const [isPatrolling, setIsPatrolling] = useState(false);
  const patrolIntervalSec = 10;
  const patrolIndexRef = useRef(0);

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

  // Patrol / Auto-Cycle timer
  useEffect(() => {
    if (!isPatrolling || cameras.length <= gridSize) return;

    const timer = setInterval(() => {
      patrolIndexRef.current = (patrolIndexRef.current + gridSize) % cameras.length;
      const nextBatch: Record<number, Camera> = {};
      for (let i = 0; i < gridSize; i++) {
        const camIndex = (patrolIndexRef.current + i) % cameras.length;
        nextBatch[i] = cameras[camIndex];
      }
      setAssignedCameras(nextBatch);
    }, patrolIntervalSec * 1000);

    return () => clearInterval(timer);
  }, [isPatrolling, cameras, gridSize, patrolIntervalSec]);

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

  const handleAutoFillOnline = () => {
    const online = cameras.filter((c) => c.status === 'online');
    const newMap: Record<number, Camera> = {};
    online.slice(0, gridSize).forEach((c, idx) => {
      newMap[idx] = c;
    });
    setAssignedCameras(newMap);
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
    <div className="flex flex-col h-full bg-[#060911] select-none overflow-hidden relative">
      {/* Live View Modern Control Toolbar */}
      <div className="h-14 bg-[#0a0f1d]/95 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between z-20 shadow-xl gap-2 flex-wrap sm:flex-nowrap">
        {/* Left: Grid Size Selector */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-2xl border border-slate-800/90 shadow-inner">
            <span className="text-[10px] font-black text-slate-500 uppercase px-2 hidden md:inline-block font-mono">
              Grade:
            </span>
            {gridSizes.map((size) => (
              <button
                key={size}
                onClick={() => handleGridSizeChange(size)}
                className={`px-3 py-1.5 text-xs font-mono font-bold rounded-xl transition-all duration-200 ${
                  gridSize === size && maximizedSlot === null
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-1 ring-blue-400/40'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Layouts Dropdown & Auto-fill */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 bg-slate-950 px-3.5 py-1.5 rounded-2xl border border-slate-800/90 shadow-inner">
            <LayoutGrid className="w-4 h-4 text-cyan-400" />
            <select
              value={selectedLayoutId}
              onChange={(e) => handleSelectLayout(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer font-bold font-mono"
            >
              <option value="" className="bg-slate-900 text-slate-400">Layouts Salvos...</option>
              {layouts.map((l) => (
                <option key={l.id} value={l.id} className="bg-slate-900 text-white">
                  {l.name} ({l.grid_size}x) {l.is_default ? '★' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowSaveModal(true)}
            title="Salvar layout atual com posições"
            className="px-3.5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-2xl border border-slate-700/80 flex items-center gap-1.5 transition shadow-sm hover:scale-105"
          >
            <Save className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Salvar Layout</span>
          </button>

          <button
            onClick={handleAutoFillOnline}
            title="Preencher grade com câmeras online"
            className="px-3 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-2xl border border-slate-700/80 hidden lg:flex items-center gap-1.5 transition shadow-sm hover:scale-105"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Preencher Online</span>
          </button>
        </div>

        {/* Right: Patrol, Drawer & Refresh */}
        <div className="flex items-center space-x-2">
          {/* Patrol Carousel Toggle */}
          <button
            onClick={() => setIsPatrolling(!isPatrolling)}
            title={isPatrolling ? 'Pausar Rotação Automática' : 'Iniciar Rotação Automática (Patrulha)'}
            className={`px-3 py-2 text-xs font-bold rounded-2xl border transition-all flex items-center gap-1.5 shadow-md ${
              isPatrolling
                ? 'bg-emerald-950 text-emerald-300 border-emerald-700/80 shadow-[0_0_10px_rgba(16,185,129,0.2)] animate-pulse'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/80'
            }`}
          >
            {isPatrolling ? <Pause className="w-3.5 h-3.5 text-emerald-400" /> : <Play className="w-3.5 h-3.5 text-slate-400" />}
            <span className="hidden sm:inline">Patrulha ({patrolIntervalSec}s)</span>
          </button>

          <button
            onClick={() => {
              setSelectedSlotForAssignment(null);
              setShowDrawer(!showDrawer);
            }}
            className={`px-3.5 py-2 text-xs font-bold rounded-2xl border transition-all flex items-center gap-2 shadow-md ${
              showDrawer
                ? 'bg-blue-600/30 text-blue-300 border-blue-500 shadow-blue-500/20'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/80'
            }`}
          >
            <CameraIcon className="w-4 h-4 text-blue-400" />
            <span>Câmeras ({cameras.length})</span>
          </button>

          <button
            onClick={refreshAllStreams}
            title="Recarregar todos os streams"
            className="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition shadow-md hover:scale-105"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid Viewport */}
      <div className="flex-1 p-2 sm:p-3 bg-[#060911] overflow-hidden relative">
        {renderSlots()}

        {/* Slide-over Camera Assignment Drawer */}
        {showDrawer && (
          <div className="absolute top-0 right-0 bottom-0 w-84 bg-[#0a0f1d]/95 backdrop-blur-2xl border-l border-slate-800 shadow-2xl z-30 flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-inner">
                  <CameraIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-black text-white block">
                    {selectedSlotForAssignment !== null
                      ? `Vincular ao Slot #${selectedSlotForAssignment + 1}`
                      : 'Catálogo de Câmeras'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Clique em uma câmera para posicioná-la na grade
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDrawer(false);
                  setSelectedSlotForAssignment(null);
                }}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-900 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search filter in drawer */}
            <div className="p-3.5 border-b border-slate-800/80 bg-slate-950/60">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={drawerSearch}
                  onChange={(e) => setDrawerSearch(e.target.value)}
                  placeholder="Filtrar por nome, IP ou fabricante..."
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 shadow-inner font-mono"
                />
              </div>
            </div>

            <div className="p-3.5 overflow-y-auto flex-1 space-y-2.5">
              {filteredDrawerCameras.length === 0 ? (
                <div className="text-center py-16 text-xs text-slate-500">
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
                      className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/90 hover:border-blue-500/60 hover:bg-slate-900/90 cursor-pointer transition-all flex items-center justify-between group text-xs shadow-md"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <span
                          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                            cam.status === 'online'
                              ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                              : cam.status === 'auth_required'
                              ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                              : 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                          }`}
                        />
                        <div className="truncate">
                          <p className="font-bold text-white truncate group-hover:text-blue-400 transition-colors font-mono">
                            {cam.name}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400 truncate">
                            {cam.host} • {cam.manufacturer || 'Genérica'}
                          </p>
                        </div>
                      </div>
                      {isAssigned ? (
                        <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-950/80 px-2.5 py-1 rounded-full border border-blue-800/50">
                          Na grade
                        </span>
                      ) : (
                        <div className="p-1.5 rounded-xl bg-slate-900 group-hover:bg-blue-600 group-hover:text-white text-slate-400 transition">
                          <Plus className="w-4 h-4" />
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
