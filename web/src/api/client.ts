import {
  Camera,
  CameraCapabilities,
  DiagnosticReport,
  DiscoveryJob,
  DiscoveryResult,
  Group,
  Layout,
  NetworkInterfaceInfo,
  SystemStats,
} from '../types';

const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`;
    try {
      const data = await res.json();
      if (typeof data.error === 'object' && data.error !== null && data.error.message) {
        errorMsg = data.error.message;
      } else if (typeof data.error === 'string') {
        errorMsg = data.error;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  // Handle empty responses
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return {} as T;
  }

  return res.json();
}

export const api = {
  // Health & Stats
  getHealth: () => request<{ status: string; version: string; service: string }>('/health'),
  getStats: () => request<SystemStats>('/stats'),
  getInterfaces: async (): Promise<NetworkInterfaceInfo[]> => {
    const res = await request<NetworkInterfaceInfo[]>('/network/interfaces');
    return (res || []).map((i) => ({
      ...i,
      ips: i.ips || [],
      subnets: i.subnets || [],
    }));
  },

  // Cameras
  listCameras: async (params?: { search?: string; status?: string; group?: string; tag?: string }): Promise<Camera[]> => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    if (params?.group) query.set('group', params.group);
    if (params?.tag) query.set('tag', params.tag);
    const qs = query.toString();
    const res = await request<Camera[]>(`/cameras${qs ? `?${qs}` : ''}`);
    return (res || []).map((c) => ({
      ...c,
      tags: c.tags || [],
      groups: c.groups || [],
      capabilities: {
        ...(c.capabilities || {}),
        profiles: c.capabilities?.profiles || [],
      },
    }));
  },
  getCamera: async (id: string): Promise<Camera> => {
    const res = await request<Camera>(`/cameras/${id}`);
    return {
      ...res,
      tags: res.tags || [],
      groups: res.groups || [],
      capabilities: {
        ...(res.capabilities || {}),
        profiles: res.capabilities?.profiles || [],
      },
    };
  },
  createCamera: (cam: Partial<Camera>) =>
    request<Camera>('/cameras', { method: 'POST', body: JSON.stringify(cam) }),
  updateCamera: (id: string, cam: Partial<Camera>) =>
    request<Camera>(`/cameras/${id}`, { method: 'PUT', body: JSON.stringify(cam) }),
  updateCameraIP: (id: string, host: string, port = 80) =>
    request<{ success: boolean; message: string }>(`/cameras/${id}/update-ip`, {
      method: 'POST',
      body: JSON.stringify({ host, port }),
    }),
  deleteCamera: (id: string) =>
    request<{ message: string }>(`/cameras/${id}`, { method: 'DELETE' }),
  testCamera: (id: string, password?: string) =>
    request<{ success: boolean; message?: string; error?: string }>(`/cameras/${id}/test`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
  testAllCameras: async () => {
    const res = await request<{ total: number; results: Array<{ id: string; name: string; host: string; success: boolean; error?: string }> }>('/cameras/test-all', {
      method: 'POST',
    });
    return {
      total: res?.total || 0,
      results: res?.results || [],
    };
  },
  getCameraCapabilities: async (id: string): Promise<CameraCapabilities> => {
    const res = await request<CameraCapabilities>(`/cameras/${id}/capabilities`);
    return {
      ...(res || {}),
      profiles: res?.profiles || [],
    };
  },
  getCameraDiagnostics: async (id: string): Promise<DiagnosticReport> => {
    const res = await request<DiagnosticReport>(`/cameras/${id}/diagnostics`);
    return {
      ...res,
      stages: res?.stages || [],
      capabilities: {
        ...(res?.capabilities || {}),
        profiles: res?.capabilities?.profiles || [],
      },
    };
  },
  getSnapshotUrl: (id: string) => `${API_BASE}/cameras/${id}/snapshot?t=${Date.now()}`,
  getLiveStreamUrl: (id: string, profile = 'sub') => `${API_BASE}/cameras/${id}/live?profile=${profile}`,

  // PTZ Controls
  ptzMove: (id: string, pan: number, tilt: number, zoom: number) =>
    request<{ success: boolean; message: string }>(`/cameras/${id}/ptz/move`, {
      method: 'POST',
      body: JSON.stringify({ pan, tilt, zoom }),
    }),
  ptzStop: (id: string) =>
    request<{ success: boolean; message: string }>(`/cameras/${id}/ptz/stop`, {
      method: 'POST',
    }),
  ptzGetPresets: async (id: string) => {
    const res = await request<Array<{ token: string; name: string }>>(`/cameras/${id}/ptz/presets`);
    return res || [];
  },
  ptzGotoPreset: (id: string, presetId: string) =>
    request<{ success: boolean; message: string }>(`/cameras/${id}/ptz/presets/${presetId}/goto`, {
      method: 'POST',
    }),

  // Discovery
  startDiscovery: (iface = '', cidr = '') =>
    request<DiscoveryJob>('/discovery', {
      method: 'POST',
      body: JSON.stringify({ interface_name: iface, cidr }),
    }),
  listDiscoveryJobs: async (): Promise<DiscoveryJob[]> => {
    const res = await request<DiscoveryJob[]>('/discovery');
    return (res || []).map((j) => ({
      ...j,
      results: j.results || [],
    }));
  },
  getDiscoveryJob: async (id: string): Promise<DiscoveryJob> => {
    const res = await request<DiscoveryJob>(`/discovery/${id}`);
    return {
      ...res,
      results: res?.results || [],
    };
  },
  cancelDiscoveryJob: (id: string) =>
    request<{ message: string }>(`/discovery/${id}/cancel`, { method: 'POST' }),
  probeDevice: (jobId: string, deviceId: string, username: string, password: string) =>
    request<DiscoveryResult>(`/discovery/${jobId}/devices/${deviceId}/probe`, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  addDiscoveredDevice: (jobId: string, deviceId: string, name: string, username: string, password: string) =>
    request<Camera>(`/discovery/${jobId}/devices/${deviceId}/add`, {
      method: 'POST',
      body: JSON.stringify({ name, username, password }),
    }),

  // Layouts
  listLayouts: async (): Promise<Layout[]> => {
    const res = await request<Layout[]>('/layouts');
    return (res || []).map((l) => ({
      ...l,
      items: l.items || [],
    }));
  },
  getLayout: async (id: string): Promise<Layout> => {
    const res = await request<Layout>(`/layouts/${id}`);
    return {
      ...res,
      items: res?.items || [],
    };
  },
  createLayout: (layout: Partial<Layout>) =>
    request<Layout>('/layouts', { method: 'POST', body: JSON.stringify(layout) }),
  updateLayout: (id: string, layout: Partial<Layout>) =>
    request<Layout>(`/layouts/${id}`, { method: 'PUT', body: JSON.stringify(layout) }),
  deleteLayout: (id: string) =>
    request<{ message: string }>(`/layouts/${id}`, { method: 'DELETE' }),

  // Groups
  listGroups: async (): Promise<Group[]> => {
    const res = await request<Group[]>('/groups');
    return res || [];
  },
  createGroup: (name: string, description = '') =>
    request<Group>('/groups', { method: 'POST', body: JSON.stringify({ name, description }) }),
  deleteGroup: (id: string) =>
    request<{ message: string }>(`/groups/${id}`, { method: 'DELETE' }),

  // Active Streams
  listActiveStreams: async () => {
    const res = await request<any[]>('/streams');
    return res || [];
  },
};
