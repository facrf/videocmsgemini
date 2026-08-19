export type CameraStatus = 'unknown' | 'online' | 'offline' | 'auth_required' | 'unsupported' | 'error';

export interface StreamProfile {
  name: string;
  token: string;
  encoder: string;
  width: number;
  height: number;
  fps: number;
  rtsp_uri?: string;
  is_substream: boolean;
}

export interface CameraCapabilities {
  onvif: boolean;
  rtsp: boolean;
  ptz: boolean;
  audio: boolean;
  snapshot: boolean;
  events: boolean;
  main_stream: boolean;
  sub_stream: boolean;
  profiles?: StreamProfile[];
}

export interface Camera {
  id: string;
  name: string;
  host: string;
  port: number;
  rtsp_port: number;
  manufacturer: string;
  model: string;
  serial_number: string;
  mac_address: string;
  firmware_version: string;
  onvif_url: string;
  rtsp_path: string;
  substream_path: string;
  snapshot_path: string;
  username: string;
  has_password: boolean;
  password?: string;
  preferred_profile: string;
  preferred_transport: string;
  codec: string;
  capabilities: CameraCapabilities;
  enabled: boolean;
  status: CameraStatus;
  status_message: string;
  last_seen_at?: string;
  created_at: string;
  updated_at: string;
  groups?: string[];
  tags?: string[];
}

export interface DiagnosticStage {
  name: string;
  status: 'OK' | 'Warning' | 'Failed' | 'Skipped';
  details: string;
  duration_ms: number;
}

export interface DiagnosticReport {
  camera_id: string;
  camera_name: string;
  host: string;
  stages: DiagnosticStage[];
  passed: boolean;
  summary: string;
  capabilities: CameraCapabilities;
  tested_at: string;
}

export type JobStatus = 'queued' | 'running' | 'completed' | 'cancelled' | 'failed';

export interface DiscoveryResult {
  id: string;
  job_id: string;
  ip: string;
  port: number;
  mac_address: string;
  manufacturer: string;
  model: string;
  onvif_url: string;
  discovered_via: string;
  probe_status: 'pending' | 'probed' | 'auth_required' | 'unsupported';
  probe_details?: Record<string, any>;
  created_at: string;
}

export interface DiscoveryJob {
  id: string;
  interface_name: string;
  cidr: string;
  status: JobStatus;
  progress: number;
  total_hosts: number;
  scanned_hosts: number;
  found_devices: number;
  error_message?: string;
  created_at: string;
  completed_at?: string;
  results?: DiscoveryResult[];
}

export interface NetworkInterfaceInfo {
  name: string;
  hardware_addr: string;
  ips: string[];
  subnets: string[];
}

export interface LayoutItem {
  id?: string;
  layout_id?: string;
  position: number;
  camera_id: string;
  camera_name?: string;
  camera_host?: string;
  preferred_profile: 'auto' | 'main' | 'sub';
}

export interface Layout {
  id: string;
  name: string;
  grid_size: number; // 1, 4, 6, 9, 12, 16, 25, 32
  is_default: boolean;
  items: LayoutItem[];
  created_at?: string;
  updated_at?: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  camera_count: number;
  created_at: string;
}

export interface SystemStats {
  total_cameras: number;
  online: number;
  offline: number;
  auth_required: number;
  error_status: number;
  active_streams: number;
  sse_clients: number;
  recent_jobs: number;
}
