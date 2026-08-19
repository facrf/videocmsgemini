import { create } from 'zustand';
import { Camera, DiscoveryJob, Layout, SystemStats } from '../types';
import { api } from '../api/client';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const STORAGE_KEY = 'videocms_live_state_v1';

interface StoredLiveState {
  gridSize?: number;
  layoutId?: string;
  pinnedSlots?: Record<number, boolean>;
  cameraIds?: Record<number, string>;
}

function loadStoredLiveState(): StoredLiveState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

function saveStoredLiveState(state: StoredLiveState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

interface AppState {
  // Data
  cameras: Camera[];
  tags: string[];
  stats: SystemStats | null;
  recentJobs: DiscoveryJob[];
  layouts: Layout[];
  isRefreshing: boolean;
  sseConnected: boolean;

  // Live View & "Fixa Tela" State
  liveGridSize: number;
  liveAssignedCameras: Record<number, Camera>;
  pinnedSlots: Record<number, boolean>;
  activeLayoutId: string;
  isFixedScreen: boolean;

  // Global UI State
  diagnosticsCamera: Camera | null;
  snapshotCamera: Camera | null;
  showAddCameraModal: boolean;
  toasts: Toast[];

  // Actions
  setSseConnected: (connected: boolean) => void;
  setDiagnosticsCamera: (cam: Camera | null) => void;
  setSnapshotCamera: (cam: Camera | null) => void;
  setShowAddCameraModal: (show: boolean) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;

  // Live View Actions
  setLiveGridSize: (size: number) => void;
  assignCameraToSlot: (slot: number, camera: Camera) => void;
  removeSlot: (slot: number) => void;
  setLiveAssignedCameras: (cams: Record<number, Camera>) => void;
  togglePinSlot: (slot: number) => void;
  applyLayout: (layout: Layout) => void;
  fixCurrentAsDefaultLayout: (customName?: string) => Promise<boolean>;

  // Data Fetching
  loadData: () => Promise<void>;
  loadCameras: () => Promise<void>;
  loadStats: () => Promise<void>;
  loadJobs: () => Promise<void>;
  loadLayouts: () => Promise<void>;
  loadTags: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => {
  const initialStored = loadStoredLiveState();

  return {
    cameras: [],
    tags: [],
    stats: null,
    recentJobs: [],
    layouts: [],
    isRefreshing: false,
    sseConnected: false,

    liveGridSize: initialStored?.gridSize || 4,
    liveAssignedCameras: {},
    pinnedSlots: initialStored?.pinnedSlots || {},
    activeLayoutId: initialStored?.layoutId || '',
    isFixedScreen: false,

    diagnosticsCamera: null,
    snapshotCamera: null,
    showAddCameraModal: false,
    toasts: [],

    setSseConnected: (connected) => set({ sseConnected: connected }),
    setDiagnosticsCamera: (cam) => set({ diagnosticsCamera: cam }),
    setSnapshotCamera: (cam) => set({ snapshotCamera: cam }),
    setShowAddCameraModal: (show) => set({ showAddCameraModal: show }),

    showToast: (message, type = 'info') => {
      const id = Math.random().toString(36).substring(2, 9);
      set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
      setTimeout(() => {
        get().removeToast(id);
      }, 4500);
    },

    removeToast: (id) => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    },

    setLiveGridSize: (size) => {
      set({ liveGridSize: size, activeLayoutId: '' });
      const current = get();
      saveStoredLiveState({
        gridSize: size,
        layoutId: '',
        pinnedSlots: current.pinnedSlots,
        cameraIds: Object.fromEntries(
          Object.entries(current.liveAssignedCameras).map(([k, v]) => [k, v.id])
        ),
      });
    },

    assignCameraToSlot: (slot, camera) => {
      set((state) => {
        const next = { ...state.liveAssignedCameras, [slot]: camera };
        saveStoredLiveState({
          gridSize: state.liveGridSize,
          layoutId: state.activeLayoutId,
          pinnedSlots: state.pinnedSlots,
          cameraIds: Object.fromEntries(
            Object.entries(next).map(([k, v]) => [k, v.id])
          ),
        });
        return { liveAssignedCameras: next };
      });
    },

    removeSlot: (slot) => {
      set((state) => {
        const next = { ...state.liveAssignedCameras };
        delete next[slot];
        const nextPinned = { ...state.pinnedSlots };
        delete nextPinned[slot];
        saveStoredLiveState({
          gridSize: state.liveGridSize,
          layoutId: state.activeLayoutId,
          pinnedSlots: nextPinned,
          cameraIds: Object.fromEntries(
            Object.entries(next).map(([k, v]) => [k, v.id])
          ),
        });
        return { liveAssignedCameras: next, pinnedSlots: nextPinned };
      });
    },

    setLiveAssignedCameras: (cams) => {
      set((state) => {
        saveStoredLiveState({
          gridSize: state.liveGridSize,
          layoutId: state.activeLayoutId,
          pinnedSlots: state.pinnedSlots,
          cameraIds: Object.fromEntries(
            Object.entries(cams).map(([k, v]) => [k, v.id])
          ),
        });
        return { liveAssignedCameras: cams };
      });
    },

    togglePinSlot: (slot) => {
      set((state) => {
        const isPinned = !state.pinnedSlots[slot];
        const nextPinned = { ...state.pinnedSlots, [slot]: isPinned };
        saveStoredLiveState({
          gridSize: state.liveGridSize,
          layoutId: state.activeLayoutId,
          pinnedSlots: nextPinned,
          cameraIds: Object.fromEntries(
            Object.entries(state.liveAssignedCameras).map(([k, v]) => [k, v.id])
          ),
        });
        return { pinnedSlots: nextPinned };
      });
    },

    applyLayout: (layout) => {
      if (!layout) return;
      const { cameras } = get();
      const newMap: Record<number, Camera> = {};
      (layout.items || []).forEach((item) => {
        const cam = cameras.find((c) => c && c.id === item.camera_id);
        if (cam) {
          newMap[item.position] = cam;
        }
      });

      const size = layout.grid_size || 4;
      set({
        liveGridSize: size,
        liveAssignedCameras: newMap,
        activeLayoutId: layout.id || '',
        isFixedScreen: true,
      });

      saveStoredLiveState({
        gridSize: size,
        layoutId: layout.id || '',
        pinnedSlots: get().pinnedSlots,
        cameraIds: Object.fromEntries(
          Object.entries(newMap).map(([k, v]) => [k, v.id])
        ),
      });
    },

    fixCurrentAsDefaultLayout: async (customName) => {
      const { liveGridSize, liveAssignedCameras, activeLayoutId, layouts, showToast, loadLayouts } = get();
      const assignedCount = Object.keys(liveAssignedCameras).length;
      if (assignedCount === 0) {
        showToast('Adicione ao menos uma câmera para fixar a tela como padrão.', 'error');
        return false;
      }

      try {
        const items = Object.entries(liveAssignedCameras).map(([pos, cam]) => ({
          position: Number(pos),
          camera_id: cam.id,
          preferred_profile: 'auto' as const,
        }));

        const existing = layouts.find((l) => l.id === activeLayoutId);
        const name = customName || (existing ? existing.name : `Mosaico Principal (${liveGridSize}x)`);

        if (existing && existing.id) {
          await api.updateLayout(existing.id, {
            name,
            grid_size: liveGridSize,
            is_default: true,
            items,
          });
          await api.setDefaultLayout(existing.id);
        } else {
          const created = await api.createLayout({
            name,
            grid_size: liveGridSize,
            is_default: true,
            items,
          });
          set({ activeLayoutId: created.id });
        }

        await loadLayouts();
        showToast(`Tela fixada! Layout "${name}" salvo como padrão.`, 'success');
        return true;
      } catch (err: any) {
        showToast(`Erro ao fixar tela: ${err.message}`, 'error');
        return false;
      }
    },

    loadData: async () => {
      set({ isRefreshing: true });
      try {
        const [cameras, stats, recentJobs, layouts, tags] = await Promise.all([
          api.listCameras(),
          api.getStats(),
          api.listDiscoveryJobs(),
          api.listLayouts(),
          api.listTags().catch(() => []),
        ]);

        const safeCameras = cameras || [];
        const safeLayouts = layouts || [];

        set({
          cameras: safeCameras,
          stats: stats || null,
          recentJobs: recentJobs || [],
          layouts: safeLayouts,
          tags: tags || [],
        });

        // Initialize Live View if not populated yet
        const current = get();
        if (Object.keys(current.liveAssignedCameras).length === 0 && safeCameras.length > 0) {
          const defLayout = safeLayouts.find((l) => l && l.is_default);
          if (defLayout) {
            current.applyLayout(defLayout);
          } else {
            // Check stored camera ids from localStorage
            const stored = loadStoredLiveState();
            if (stored?.cameraIds && Object.keys(stored.cameraIds).length > 0) {
              const restored: Record<number, Camera> = {};
              Object.entries(stored.cameraIds).forEach(([posStr, camId]) => {
                const cam = safeCameras.find((c) => c.id === camId);
                if (cam) restored[Number(posStr)] = cam;
              });
              if (Object.keys(restored).length > 0) {
                set({
                  liveAssignedCameras: restored,
                  liveGridSize: stored.gridSize || current.liveGridSize,
                  activeLayoutId: stored.layoutId || '',
                });
                return;
              }
            }

            // Fallback to first N cameras
            const initial: Record<number, Camera> = {};
            safeCameras.slice(0, current.liveGridSize).forEach((c, idx) => {
              if (c) initial[idx] = c;
            });
            set({ liveAssignedCameras: initial });
          }
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        set({ isRefreshing: false });
      }
    },

    loadCameras: async () => {
      try {
        const cameras = await api.listCameras();
        set({ cameras: cameras || [] });
      } catch (err) {}
    },

    loadStats: async () => {
      try {
        const stats = await api.getStats();
        set({ stats: stats || null });
      } catch (err) {}
    },

    loadJobs: async () => {
      try {
        const jobs = await api.listDiscoveryJobs();
        set({ recentJobs: jobs || [] });
      } catch (err) {}
    },

    loadLayouts: async () => {
      try {
        const layouts = await api.listLayouts();
        set({ layouts: layouts || [] });
      } catch (err) {}
    },

    loadTags: async () => {
      try {
        const tags = await api.listTags();
        set({ tags: tags || [] });
      } catch (err) {}
    },
  };
});
