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
    <div className="p-5 sm:p-7 space-y-6 h-full overflow-y-auto select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5 mb-1">
            <div className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Compass className="w-4.5 h-4.5" />
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              Descoberta de Câmeras na Rede Local
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Localize câmeras IP automaticamente via multicast WS-Discovery (ONVIF) ou varredura controlada por CIDR.
          </p>
        </div>
      </div>

      {/* Discovery Trigger Card */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <form onSubmit={handleStartScan} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Network Interface */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5 text-blue-400" /> Interface de Rede
              </label>
              <select
                value={selectedIface}
                onChange={(e) => handleSelectInterface(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition shadow-inner font-mono"
              >
                {interfaces.map((i) => (
                  <option key={i.name} value={i.name} className="bg-slate-900">
                    {i.name} ({i.ips.join(', ')})
                  </option>
                ))}
              </select>
            </div>

            {/* Subnet CIDR */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-blue-400" /> Sub-rede / CIDR Alvo
              </label>
              <input
                type="text"
                value={cidr}
                onChange={(e) => setCidr(e.target.value)}
                placeholder="Ex: 192.168.1.0/24"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-blue-500 transition shadow-inner"
                required
              />
            </div>

            {/* Action Button */}
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isButtonDisabled}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 disabled:opacity-50"
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
        <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center space-x-3 text-xs text-slate-400 shadow-inner">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="leading-relaxed">
            Varredura segura estritamente restrita à rede local autorizada (RFC 1918). Portas testadas: 80, 554, 8000, 8080, 8899, 443.
          </span>
        </div>
      </div>

      {/* Active / Selected Discovery Job Details */}
      {activeJob && (
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner flex-shrink-0">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                  Varredura: {activeJob.cidr || 'WS-Discovery'}
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold border ${
                      activeJob.status === 'completed'
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60 shadow-sm'
                        : activeJob.status === 'running'
                        ? 'bg-blue-950/80 text-blue-300 border-blue-800/60 animate-pulse'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {activeJob.status.toUpperCase()}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {activeJob.scanned_hosts} de {activeJob.total_hosts} IPs verificados • {activeJob.found_devices} dispositivos detectados
                </p>
              </div>
            </div>

            {activeJob.status === 'running' && (
              <button
                onClick={() => handleCancelScan(activeJob.id)}
                className="px-3.5 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              >
                <StopCircle className="w-4 h-4" /> Cancelar
              </button>
            )}
          </div>

          {/* Progress Bar */}
          {activeJob.status === 'running' && (
            <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800 shadow-inner">
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(59,130,246,0.6)]"
                  style={{ width: `${activeJob.progress}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>Progresso: {activeJob.progress}%</span>
                <span>Varrendo portas ONVIF/RTSP...</span>
              </div>
            </div>
          )}

          {/* Discovered Devices Cards */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              Dispositivos Encontrados ({activeJob.results?.length || 0})
            </h4>

            {!activeJob.results || activeJob.results.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-slate-800 p-4">
                Nenhum dispositivo encontrado nesta varredura até o momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {activeJob.results.map((dev) => (
                  <div
                    key={dev.id}
                    className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition flex flex-col justify-between space-y-3 shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-extrabold font-mono text-white tracking-wide">{dev.ip}</span>
                          <span className="text-[10px] font-mono text-slate-400">Porta: {dev.port}</span>
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-900 text-blue-400 border border-slate-800">
                            {dev.discovered_via === 'ws_discovery' ? 'WS-DISCOVERY' : 'SCAN'}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-slate-300">
                          {dev.manufacturer || 'Fabricante Desconhecido'} {dev.model ? `• ${dev.model}` : ''}
                        </div>
                        {dev.mac_address && (
                          <div className="text-[10px] font-mono text-slate-500">MAC: {dev.mac_address}</div>
                        )}
                        {dev.onvif_url && (
                          <div className="text-[10px] font-mono text-slate-500 truncate max-w-xs" title={dev.onvif_url}>
                            ONVIF: {dev.onvif_url}
                          </div>
                        )}
                      </div>

                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border shadow-sm ${
                          dev.probe_status === 'probed'
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                            : dev.probe_status === 'auth_required'
                            ? 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        {dev.probe_status.toUpperCase()}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end space-x-2 pt-2.5 border-t border-slate-900">
                      <button
                        onClick={() => setSelectedDeviceForProbe({ job: activeJob, device: dev })}
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700/80 transition flex items-center gap-1.5 shadow-sm"
                      >
                        <Search className="w-3.5 h-3.5 text-blue-400" />
                        Sondar / Credenciais
                      </button>
                      <button
                        onClick={() => setSelectedDeviceForProbe({ job: activeJob, device: dev })}
                        className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition flex items-center gap-1.5 shadow-md shadow-blue-600/20"
                      >
                        <Plus className="w-3.5 h-3.5" />
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
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl space-y-3.5">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400" /> Histórico de Varreduras
        </h3>

        {jobs.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
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
                className={`py-3 px-3 rounded-xl flex items-center justify-between text-xs cursor-pointer hover:bg-slate-800/50 transition-all ${
                  activeJob?.id === j.id ? 'bg-slate-800/80 border border-slate-700/80' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="font-mono font-bold text-slate-200">{j.cidr || 'WS-Discovery'}</span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {new Date(j.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-[11px] text-slate-400 font-mono">{j.found_devices} encontrados</span>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      j.status === 'completed'
                        ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60'
                        : j.status === 'running'
                        ? 'bg-blue-950/80 text-blue-400 border-blue-800/60'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
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

