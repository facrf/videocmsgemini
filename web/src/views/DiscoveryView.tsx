import React, { useState, useEffect } from 'react';
import {
  Compass,
  Search,
  Play,
  StopCircle,
  RefreshCw,
  Plus,
  Network,
  Radio,
  Clock,
  ChevronRight,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import { DiscoveryJob, DiscoveryResult, NetworkInterfaceInfo } from '../types';
import { api } from '../api/client';
import { ProbeDeviceModal } from '../components/ProbeDeviceModal';

interface DiscoveryViewProps {
  jobs: DiscoveryJob[];
  onRefreshJobs: () => void;
  onCameraAdded: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const DiscoveryView: React.FC<DiscoveryViewProps> = ({
  jobs = [],
  onRefreshJobs,
  onCameraAdded,
  showToast,
}) => {
  const safeJobs = jobs || [];
  const [interfaces, setInterfaces] = useState<NetworkInterfaceInfo[]>([]);
  const [selectedIface, setSelectedIface] = useState<string>('');
  const [cidr, setCidr] = useState<string>('');
  const [starting, setStarting] = useState(false);
  const [activeJob, setActiveJob] = useState<DiscoveryJob | null>(null);
  const [selectedDeviceForProbe, setSelectedDeviceForProbe] = useState<{ job: DiscoveryJob; device: DiscoveryResult } | null>(null);

  // Fetch network interfaces on load
  useEffect(() => {
    api.getInterfaces().then((ifaces) => {
      const safeIfaces = ifaces || [];
      setInterfaces(safeIfaces);
      if (safeIfaces.length > 0) {
        setSelectedIface(safeIfaces[0].name || '');
        if (safeIfaces[0].subnets && safeIfaces[0].subnets.length > 0) {
          setCidr(safeIfaces[0].subnets[0]);
        }
      }
    }).catch(() => {
      setInterfaces([]);
    });
  }, []);

  // Update active job from latest jobs list or load details
  useEffect(() => {
    const running = safeJobs.find((j) => j && j.status === 'running');
    if (running && running.id) {
      api.getDiscoveryJob(running.id).then((j) => { if (j) setActiveJob(j); }).catch(() => {});
    } else if (safeJobs.length > 0 && !activeJob) {
      if (safeJobs[0] && safeJobs[0].id) {
        api.getDiscoveryJob(safeJobs[0].id).then((j) => { if (j) setActiveJob(j); }).catch(() => {});
      }
    }
  }, [safeJobs]);

  const handleStartScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setStarting(true);
    try {
      const job = await api.startDiscovery(selectedIface, cidr);
      showToast('Varredura e WS-Discovery iniciados!', 'info');
      setActiveJob(job);
      onRefreshJobs();
    } catch (err: any) {
      showToast(`Erro ao iniciar descoberta: ${err.message}`, 'error');
    } finally {
      setStarting(false);
    }
  };

  const handleCancelScan = async (jobId: string) => {
    try {
      await api.cancelDiscoveryJob(jobId);
      showToast('Cancelamento solicitado.', 'info');
      onRefreshJobs();
    } catch (err: any) {
      showToast(`Erro ao cancelar: ${err.message}`, 'error');
    }
  };

  const handleSelectInterface = (ifaceName: string) => {
    setSelectedIface(ifaceName);
    const iface = (interfaces || []).find((i) => i && i.name === ifaceName);
    if (iface && iface.subnets && iface.subnets.length > 0) {
      setCidr(iface.subnets[0]);
    }
  };

  const isButtonDisabled = Boolean(starting || (activeJob && activeJob.status === 'running'));

  return (
    <div className="p-5 sm:p-7 space-y-6 h-full overflow-y-auto select-none bg-[#0a0a12] text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 border border-slate-700/40">
              <Compass className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-100 tracking-tight">
              Descoberta de Câmeras na Rede Local
            </h2>
          </div>
          <p className="text-sm text-slate-400">
            Localização automática via multicast WS-Discovery (ONVIF) e varredura de portas controlada por CIDR
          </p>
        </div>
      </div>

      {/* Discovery Trigger Card */}
      <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-6 shadow-sm space-y-5">
        <form onSubmit={handleStartScan} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Network Interface */}
            <div>
              <label className="block text-sm font-medium text-slate-100 mb-1.5 flex items-center gap-1.5">
                <Network className="w-4 h-4 text-slate-400" /> Interface de Rede
              </label>
              <select
                value={selectedIface}
                onChange={(e) => handleSelectInterface(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700/40 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors shadow-sm"
              >
                {interfaces.length === 0 ? (
                  <option value="">Nenhuma interface detectada</option>
                ) : (
                  interfaces.map((i) => (
                    <option key={i.name} value={i.name}>
                      {i.name} ({(i.ips || []).join(', ') || 'sem IP'})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Subnet CIDR */}
            <div>
              <label className="block text-sm font-medium text-slate-100 mb-1.5 flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-slate-400" /> Sub-rede / CIDR Alvo
              </label>
              <input
                type="text"
                value={cidr}
                onChange={(e) => setCidr(e.target.value)}
                placeholder="Ex: 192.168.1.0/24"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700/40 rounded-lg text-sm font-mono text-slate-100 focus:outline-none focus:border-blue-500 transition-colors shadow-sm"
                required
              />
            </div>

            {/* Action Button */}
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isButtonDisabled}
                className="w-full py-3 px-5 bg-blue-600 hover:bg-blue-500 text-slate-100 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {starting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin-custom" />
                    <span>Iniciando Varredura...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Iniciar Descoberta</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Security Alert */}
        <div className="p-4 bg-slate-900 border border-slate-700/40 rounded-lg flex items-center space-x-3 text-sm text-slate-400 shadow-sm">
          <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <span className="leading-relaxed">
            Varredura segura RFC 1918. Portas testadas: 80, 554, 8000, 8080, 8899, 37777 (Dahua, Intelbras, Hikvision, Genéricas).
          </span>
        </div>
      </div>

      {/* Active / Selected Discovery Job Details */}
      {activeJob && (
        <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 border border-slate-700/40 flex items-center justify-center text-blue-500 shadow-sm flex-shrink-0">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  Varredura: <span className="font-mono">{activeJob.cidr || 'WS-Discovery'}</span>
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${
                      activeJob.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        : activeJob.status === 'running'
                        ? 'bg-blue-500/10 text-blue-500 border-blue-500/20 animate-pulse'
                        : 'bg-slate-800 text-slate-400 border-slate-700/40'
                    }`}
                  >
                    {activeJob.status.toUpperCase()}
                  </span>
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  {activeJob.scanned_hosts} de {activeJob.total_hosts} IPs verificados • {activeJob.found_devices} dispositivos detectados
                </p>
              </div>
            </div>

            {activeJob.status === 'running' && (
              <button
                onClick={() => handleCancelScan(activeJob.id)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-rose-500 border border-slate-700/40 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
              >
                <StopCircle className="w-4 h-4" /> Cancelar
              </button>
            )}
          </div>

          {/* Progress Bar & Radar */}
          {activeJob.status === 'running' && (
            <div className="space-y-2 bg-slate-900 p-4 rounded-lg border border-slate-700/40 shadow-sm">
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${activeJob.progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span className="font-medium text-blue-500">Progresso: {activeJob.progress}%</span>
                <span>Varrendo portas ONVIF / RTSP em paralelo...</span>
              </div>
            </div>
          )}

          {/* Discovered Devices Cards */}
          <div>
            <h4 className="text-sm font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-400" />
              Dispositivos Encontrados ({activeJob.results?.length || 0})
            </h4>

            {!activeJob.results || activeJob.results.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm bg-slate-900 rounded-lg border border-slate-700/40 p-6 shadow-sm">
                Nenhum dispositivo detectado nesta varredura até o momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(activeJob.results || []).map((dev) => (
                  <div
                    key={dev.id}
                    className="p-5 rounded-xl bg-slate-900 border border-slate-700/40 flex flex-col justify-between space-y-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1.5">
                        <div className="flex items-center space-x-2">
                          <span className="text-base font-medium font-mono text-slate-100">{dev.ip}</span>
                          <span className="text-xs font-mono text-slate-400">Porta: {dev.port}</span>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/40">
                            {dev.discovered_via === 'ws_discovery' ? 'WS-DISC' : 'SCAN'}
                          </span>
                        </div>
                        <div className="text-sm text-slate-300">
                          {dev.manufacturer || 'Fabricante Desconhecido'} {dev.model ? `• ${dev.model}` : ''}
                        </div>
                        {dev.mac_address && (
                          <div className="text-xs font-mono text-slate-500">MAC: {dev.mac_address}</div>
                        )}
                      </div>

                      <span
                        className={`text-[10px] font-medium px-2.5 py-1 rounded-full border shadow-sm ${
                          dev.probe_status === 'probed'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : dev.probe_status === 'auth_required'
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700/40'
                        }`}
                      >
                        {dev.probe_status.toUpperCase()}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-700/40">
                      <button
                        onClick={() => setSelectedDeviceForProbe({ job: activeJob, device: dev })}
                        className="px-4 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg border border-slate-700/40 transition-colors flex items-center gap-2 shadow-sm"
                      >
                        <Search className="w-4 h-4 text-slate-400" />
                        Sondar / Credenciais
                      </button>
                      <button
                        onClick={() => setSelectedDeviceForProbe({ job: activeJob, device: dev })}
                        className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-slate-100 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Cadastrar no CMS
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* History of Past Jobs */}
      <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" /> Histórico de Varreduras
        </h3>

        {safeJobs.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            Nenhuma varredura anterior registrada.
          </div>
        ) : (
          <div className="divide-y divide-slate-700/40">
            {safeJobs.map((j) => (
              <div
                key={j.id}
                onClick={() => {
                  api.getDiscoveryJob(j.id).then((res) => { if (res) setActiveJob(res); });
                }}
                className={`py-4 px-4 rounded-lg flex items-center justify-between cursor-pointer hover:bg-slate-800/80 transition-colors ${
                  activeJob?.id === j.id ? 'bg-slate-800 border-l-2 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-center space-x-4">
                  <span className="font-mono text-sm font-medium text-slate-200">{j.cidr || 'WS-Discovery'}</span>
                  <span className="text-xs text-slate-500">
                    {new Date(j.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-slate-400">{j.found_devices} detectados</span>
                  <span
                    className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full border ${
                      j.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        : j.status === 'running'
                        ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                        : 'bg-slate-800 text-slate-400 border-slate-700/40'
                    }`}
                  >
                    {j.status}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Probe Device Modal */}
      {selectedDeviceForProbe && (
        <ProbeDeviceModal
          jobId={selectedDeviceForProbe.job.id}
          device={selectedDeviceForProbe.device}
          onClose={() => setSelectedDeviceForProbe(null)}
          onAdded={() => {
            onCameraAdded();
            onRefreshJobs();
            showToast('Câmera cadastrada com sucesso!', 'success');
          }}
        />
      )}
    </div>
  );
};
