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
  cameras = [],
  layouts = [],
  onOpenSnapshot,
  onOpenDiagnostics,
  onRefreshLayouts,
}) => {
  const safeCameras = cameras || [];
  const safeLayouts = layouts || [];
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
    if (Object.keys(assignedCameras).length === 0 && safeCameras.length > 0) {
      const defLayout = safeLayouts.find((l) => l && l.is_default);
      if (defLayout) {
        applyLayout(defLayout);
      } else {
        const initial: Record<number, Camera> = {};
        safeCameras.slice(0, gridSize).forEach((c, idx) => {
          if (c) initial[idx] = c;
        });
        setAssignedCameras(initial);
      }
    }
  }, [cameras, layouts]);

  // Patrol / Auto-Cycle timer
  useEffect(() => {
    if (!isPatrolling || safeCameras.length <= gridSize) return;

    const timer = setInterval(() => {
      patrolIndexRef.current = (patrolIndexRef.current + gridSize) % safeCameras.length;
      const nextBatch: Record<number, Camera> = {};
      for (let i = 0; i < gridSize; i++) {
        const camIndex = (patrolIndexRef.current + i) % safeCameras.length;
        if (safeCameras[camIndex]) {
          nextBatch[i] = safeCameras[camIndex];
        }
      }
      setAssignedCameras(nextBatch);
    }, patrolIntervalSec * 1000);

    return () => clearInterval(timer);
  }, [isPatrolling, safeCameras, gridSize, patrolIntervalSec]);

  const applyLayout = (layout: Layout) => {
    if (!layout) return;
    setSelectedLayoutId(layout.id || '');
    setGridSize(layout.grid_size || 4);
    setMaximizedSlot(null);

    const newMap: Record<number, Camera> = {};
    const items = layout.items || [];
    items.forEach((item) => {
      if (!item) return;
      const cam = safeCameras.find((c) => c && c.id === item.camera_id);
      if (cam) {
        newMap[item.position] = cam;
      }
    });
    setAssignedCameras(newMap);
  };

  const handleSelectLayout = (layoutId: string) => {
    if (!layoutId) return;
    const l = safeLayouts.find((item) => item && item.id === layoutId);
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
    const online = safeCameras.filter((c) => c && c.status === 'online');
    const newMap: Record<number, Camera> = {};
    online.slice(0, gridSize).forEach((c, idx) => {
      if (c) newMap[idx] = c;
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
  const filteredDrawerCameras = safeCameras.filter((c) =>
    c && (
      (c.name || '').toLowerCase().includes(drawerSearch.toLowerCase()) ||
      (c.host || '').toLowerCase().includes(drawerSearch.toLowerCase()) ||
      (c.manufacturer || '').toLowerCase().includes(drawerSearch.toLowerCase())
    )
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
    <div className="flex flex-col h-full bg-[#0a0a12] select-none overflow-hidden relative">
      {/* Live View Modern Control Toolbar */}
      <div className="min-h-[56px] py-2 bg-slate-900 border-b border-slate-700/40 px-4 sm:px-6 flex items-center justify-between z-20 shadow-sm gap-2 flex-wrap sm:flex-nowrap">
        {/* Left: Grid Size Selector */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-slate-800/50 p-1 rounded-lg border border-slate-700/40">
            <span className="text-xs font-medium text-slate-500 uppercase px-2 hidden md:inline-block">
              Grade:
            </span>
            {gridSizes.map((size) => (
              <button
                key={size}
                onClick={() => handleGridSizeChange(size)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                  gridSize === size && maximizedSlot === null
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/50'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Layouts Dropdown & Auto-fill */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/40">
            <LayoutGrid className="w-4 h-4 text-slate-400" />
            <select
              value={selectedLayoutId}
              onChange={(e) => handleSelectLayout(e.target.value)}
              className="bg-transparent text-sm text-slate-200 focus:outline-none cursor-pointer font-medium"
            >
              <option value="" className="bg-slate-900 text-slate-400">Layouts Salvos...</option>
              {safeLayouts.map((l) => (
                <option key={l.id} value={l.id} className="bg-slate-900 text-slate-100">
                  {l.name} ({l.grid_size}x) {l.is_default ? '★' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowSaveModal(true)}
            title="Salvar layout atual com posições"
            className="px-3 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700/40 flex items-center gap-1.5 transition"
          >
            <Save className="w-4 h-4 text-blue-400" />
            <span className="hidden md:inline">Salvar Layout</span>
          </button>

          <button
            onClick={handleAutoFillOnline}
            title="Preencher grade com câmeras online"
            className="px-3 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700/40 hidden lg:flex items-center gap-1.5 transition"
          >
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span>Preencher Online</span>
          </button>
        </div>

        {/* Right: Patrol, Drawer & Refresh */}
        <div className="flex items-center space-x-2">
          {/* Patrol Carousel Toggle */}
          <button
            onClick={() => setIsPatrolling(!isPatrolling)}
            title={isPatrolling ? 'Pausar Rotação Automática' : 'Iniciar Rotação Automática (Patrulha)'}
            className={`px-3 py-2 text-sm font-medium rounded-lg border transition-all flex items-center gap-1.5 ${
              isPatrolling
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/40'
            }`}
          >
            {isPatrolling ? <Pause className="w-4 h-4 text-emerald-500" /> : <Play className="w-4 h-4 text-slate-400" />}
            <span className="hidden sm:inline">Patrulha ({patrolIntervalSec}s)</span>
          </button>

          <button
            onClick={() => {
              setSelectedSlotForAssignment(null);
              setShowDrawer(!showDrawer);
            }}
            className={`px-3 py-2 text-sm font-medium rounded-lg border transition-all flex items-center gap-2 ${
              showDrawer
                ? 'bg-blue-600/10 text-blue-500 border-blue-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/40'
            }`}
          >
            <CameraIcon className="w-4 h-4 text-blue-500" />
            <span>Câmeras ({cameras.length})</span>
          </button>

          <button
            onClick={refreshAllStreams}
            title="Recarregar todos os streams"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 border border-slate-700/40 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid Viewport */}
      <div className="flex-1 p-2 sm:p-3 bg-[#0a0a12] overflow-hidden relative">
        {renderSlots()}

        {/* Slide-over Camera Assignment Drawer */}
        {showDrawer && (
          <div className="absolute top-0 right-0 bottom-0 w-80 bg-slate-900 border-l border-slate-700/40 shadow-sm z-30 flex flex-col transition-all duration-200">
            <div className="p-4 border-b border-slate-700/40 flex items-center justify-between bg-slate-900">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  <CameraIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-medium text-slate-100 block">
                    {selectedSlotForAssignment !== null
                      ? `Vincular ao Slot #${selectedSlotForAssignment + 1}`
                      : 'Catálogo de Câmeras'}
                  </span>
                  <span className="text-xs text-slate-500">
                    Clique em uma câmera para posicionar
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDrawer(false);
                  setSelectedSlotForAssignment(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search filter in drawer */}
            <div className="p-4 border-b border-slate-700/40 bg-slate-900">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={drawerSearch}
                  onChange={(e) => setDrawerSearch(e.target.value)}
                  placeholder="Filtrar por nome, IP..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-800/50 border border-slate-700/40 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {filteredDrawerCameras.length === 0 ? (
                <div className="text-center py-12 text-sm text-slate-500">
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
                      className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/40 hover:border-blue-500/50 hover:bg-slate-800 cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            cam.status === 'online'
                              ? 'bg-emerald-500'
                              : cam.status === 'auth_required'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                        />
                        <div className="truncate">
                          <p className="font-medium text-sm text-slate-100 truncate group-hover:text-blue-500 transition-colors">
                            {cam.name}
                          </p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            <span className="font-mono">{cam.host}</span> • {cam.manufacturer || 'Genérica'}
                          </p>
                        </div>
                      </div>
                      {isAssigned ? (
                        <span className="text-[10px] font-medium text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                          Na grade
                        </span>
                      ) : (
                        <div className="p-1.5 rounded-lg bg-slate-800 group-hover:bg-blue-600 group-hover:text-white text-slate-400 transition">
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
