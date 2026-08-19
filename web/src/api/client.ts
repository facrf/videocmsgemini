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
  getInterfaces: () => request<NetworkInterfaceInfo[]>('/network/interfaces'),

  // Cameras
  listCameras: (params?: { search?: string; status?: string; group?: string; tag?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    if (params?.group) query.set('group', params.group);
    if (params?.tag) query.set('tag', params.tag);
    const qs = query.toString();
    return request<Camera[]>(`/cameras${qs ? `?${qs}` : ''}`);
  },
  getCamera: (id: string) => request<Camera>(`/cameras/${id}`),
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
  testAllCameras: () =>
    request<{ total: number; results: Array<{ id: string; name: string; host: string; success: boolean; error?: string }> }>('/cameras/test-all', {
      method: 'POST',
    }),
  getCameraCapabilities: (id: string) => request<CameraCapabilities>(`/cameras/${id}/capabilities`),
  getCameraDiagnostics: (id: string) => request<DiagnosticReport>(`/cameras/${id}/diagnostics`),
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
  ptzGetPresets: (id: string) =>
    request<Array<{ token: string; name: string }>>(`/cameras/${id}/ptz/presets`),
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
  listDiscoveryJobs: () => request<DiscoveryJob[]>('/discovery'),
  getDiscoveryJob: (id: string) => request<DiscoveryJob>(`/discovery/${id}`),
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
  listLayouts: () => request<Layout[]>('/layouts'),
  getLayout: (id: string) => request<Layout>(`/layouts/${id}`),
  createLayout: (layout: Partial<Layout>) =>
    request<Layout>('/layouts', { method: 'POST', body: JSON.stringify(layout) }),
  updateLayout: (id: string, layout: Partial<Layout>) =>
    request<Layout>(`/layouts/${id}`, { method: 'PUT', body: JSON.stringify(layout) }),
  deleteLayout: (id: string) =>
    request<{ message: string }>(`/layouts/${id}`, { method: 'DELETE' }),

  // Groups
  listGroups: () => request<Group[]>('/groups'),
  createGroup: (name: string, description = '') =>
    request<Group>('/groups', { method: 'POST', body: JSON.stringify({ name, description }) }),
  deleteGroup: (id: string) =>
    request<{ message: string }>(`/groups/${id}`, { method: 'DELETE' }),

  // Active Streams
  listActiveStreams: () => request<any[]>('/streams'),
};
