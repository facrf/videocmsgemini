import { create } from 'zustand';
import { Camera, DiscoveryJob, Layout, SystemStats } from '../types';
import { api } from '../api/client';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppState {
  // Data
  cameras: Camera[];
  stats: SystemStats | null;
  recentJobs: DiscoveryJob[];
  layouts: Layout[];
  isRefreshing: boolean;
  sseConnected: boolean;

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
  
  // Data Fetching
  loadData: () => Promise<void>;
  loadCameras: () => Promise<void>;
  loadStats: () => Promise<void>;
  loadJobs: () => Promise<void>;
  loadLayouts: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  cameras: [],
  stats: null,
  recentJobs: [],
  layouts: [],
  isRefreshing: false,
  sseConnected: false,

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

  loadData: async () => {
    set({ isRefreshing: true });
    try {
      const [cameras, stats, recentJobs, layouts] = await Promise.all([
        api.listCameras(),
        api.getStats(),
        api.listDiscoveryJobs(),
        api.listLayouts(),
      ]);
      set({ cameras: cameras || [], stats: stats || null, recentJobs: recentJobs || [], layouts: layouts || [] });
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
  }
}));
