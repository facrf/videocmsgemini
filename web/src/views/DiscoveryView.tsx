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
  jobs,
  onRefreshJobs,
  onCameraAdded,
  showToast,
}) => {
  const [interfaces, setInterfaces] = useState<NetworkInterfaceInfo[]>([]);
  const [selectedIface, setSelectedIface] = useState<string>('');
  const [cidr, setCidr] = useState<string>('');
  const [starting, setStarting] = useState(false);
  const [activeJob, setActiveJob] = useState<DiscoveryJob | null>(null);
  const [selectedDeviceForProbe, setSelectedDeviceForProbe] = useState<{ job: DiscoveryJob; device: DiscoveryResult } | null>(null);

  // Fetch network interfaces on load
  useEffect(() => {
    api.getInterfaces().then((ifaces) => {
      setInterfaces(ifaces);
      if (ifaces.length > 0) {
        setSelectedIface(ifaces[0].name);
        if (ifaces[0].subnets.length > 0) {
          setCidr(ifaces[0].subnets[0]);
        }
      }
    }).catch(() => {});
  }, []);

  // Update active job from latest jobs list or load details
  useEffect(() => {
    const running = jobs.find((j) => j.status === 'running');
    if (running) {
      api.getDiscoveryJob(running.id).then((j) => setActiveJob(j)).catch(() => {});
    } else if (jobs.length > 0 && !activeJob) {
      api.getDiscoveryJob(jobs[0].id).then((j) => setActiveJob(j)).catch(() => {});
    }
  }, [jobs]);

  const handleStartScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setStarting(true);
    try {
      const job = await api.startDiscovery(selectedIface, cidr);
      showToast('Varredura e WS-Discovery iniciados com sucesso!', 'info');
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
      showToast('Cancelamento da varredura solicitado.', 'info');
      onRefreshJobs();
    } catch (err: any) {
      showToast(`Erro ao cancelar: ${err.message}`, 'error');
    }
  };

  const handleSelectInterface = (ifaceName: string) => {
    setSelectedIface(ifaceName);
    const iface = interfaces.find((i) => i.name === ifaceName);
    if (iface && iface.subnets.length > 0) {
      setCidr(iface.subnets[0]);
    }
  };

  const isButtonDisabled = Boolean(starting || (activeJob && activeJob.status === 'running'));

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Compass className="w-5 h-5 text-blue-400" /> Descoberta de Câmeras na Rede Local
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Localize câmeras IP automaticamente via multicast WS-Discovery (ONVIF) ou varredura controlada por CIDR.
        </p>
      </div>

      {/* Discovery Trigger Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <form onSubmit={handleStartScan} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Network Interface */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Network className="w-3.5 h-3.5 text-blue-400" /> Interface de Rede
              </label>
              <select
                value={selectedIface}
                onChange={(e) => handleSelectInterface(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {interfaces.map((i) => (
                  <option key={i.name} value={i.name}>
                    {i.name} ({i.ips.join(', ')})
                  </option>
                ))}
              </select>
            </div>

            {/* Subnet CIDR */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 text-blue-400" /> Sub-rede / CIDR Alvo
              </label>
              <input
                type="text"
                value={cidr}
                onChange={(e) => setCidr(e.target.value)}
                placeholder="Ex: 192.168.1.0/24"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            {/* Action Button */}
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isButtonDisabled}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-md"
              >
                {starting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin-custom" />
                    <span>Iniciando...</span>
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
        <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center space-x-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>
            Varredura segura restrita à rede local autorizada (RFC 1918). Portas candidatas: 80, 554, 8000, 8080, 8899, 443.
          </span>
        </div>
      </div>

      {/* Active / Selected Discovery Job Details */}
      {activeJob && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Varredura: {activeJob.cidr}
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                      activeJob.status === 'completed'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : activeJob.status === 'running'
                        ? 'bg-blue-950 text-blue-400 border border-blue-800 animate-pulse'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {activeJob.status.toUpperCase()}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {activeJob.scanned_hosts} de {activeJob.total_hosts} IPs verificados • {activeJob.found_devices} dispositivos encontrados
                </p>
              </div>
            </div>

            {activeJob.status === 'running' && (
              <button
                onClick={() => handleCancelScan(activeJob.id)}
                className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-400 border border-rose-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <StopCircle className="w-4 h-4" /> Cancelar
              </button>
            )}
          </div>

          {/* Progress Bar */}
          {activeJob.status === 'running' && (
            <div className="space-y-1">
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${activeJob.progress}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>Progresso: {activeJob.progress}%</span>
                <span>Varrendo portas ONVIF/RTSP...</span>
              </div>
            </div>
          )}

          {/* Discovered Devices Cards */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
              Dispositivos Encontrados ({activeJob.results?.length || 0})
            </h4>

            {!activeJob.results || activeJob.results.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs bg-slate-950/40 rounded-lg border border-slate-800">
                Nenhum dispositivo encontrado nesta varredura até o momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeJob.results.map((dev) => (
                  <div
                    key={dev.id}
                    className="p-4 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold font-mono text-white">{dev.ip}</span>
                          <span className="text-[10px] font-mono text-slate-400">Porta: {dev.port}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-blue-400 border border-slate-800">
                            {dev.discovered_via === 'ws_discovery' ? 'WS-DISCOVERY' : 'SCAN'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-300">
                          {dev.manufacturer || 'Fabricante Desconhecido'} {dev.model ? `• ${dev.model}` : ''}
                        </div>
                        {dev.mac_address && (
                          <div className="text-[10px] font-mono text-slate-500">MAC: {dev.mac_address}</div>
                        )}
                        {dev.onvif_url && (
                          <div className="text-[10px] font-mono text-slate-500 truncate max-w-xs">
                            ONVIF: {dev.onvif_url}
                          </div>
                        )}
                      </div>

                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          dev.probe_status === 'probed'
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                            : dev.probe_status === 'auth_required'
                            ? 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        {dev.probe_status.toUpperCase()}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-900">
                      <button
                        onClick={() => setSelectedDeviceForProbe({ job: activeJob, device: dev })}
                        className="px-3 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition flex items-center gap-1"
                      >
                        <Search className="w-3 h-3 text-blue-400" />
                        Sondar / Credenciais
                      </button>
                      <button
                        onClick={() => setSelectedDeviceForProbe({ job: activeJob, device: dev })}
                        className="px-3 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded transition flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
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
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400" /> Histórico de Varreduras
        </h3>

        {jobs.length === 0 ? (
          <div className="py-6 text-center text-slate-500 text-xs">
            Nenhuma varredura anterior registrada.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {jobs.map((j) => (
              <div
                key={j.id}
                onClick={() => {
                  api.getDiscoveryJob(j.id).then((res) => setActiveJob(res));
                }}
                className={`py-2.5 px-2 rounded-lg flex items-center justify-between text-xs cursor-pointer hover:bg-slate-800/50 transition ${
                  activeJob?.id === j.id ? 'bg-slate-800/80 border border-slate-700' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="font-mono font-semibold text-slate-200">{j.cidr || 'WS-Discovery'}</span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {new Date(j.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-[11px] text-slate-400 font-mono">{j.found_devices} encontrados</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                      j.status === 'completed'
                        ? 'bg-emerald-950 text-emerald-400'
                        : j.status === 'running'
                        ? 'bg-blue-950 text-blue-400'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {j.status}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-600" />
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
