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
    const iface = interfaces.find((i) => i.name === ifaceName);
    if (iface && iface.subnets.length > 0) {
      setCidr(iface.subnets[0]);
    }
  };

  const isButtonDisabled = Boolean(starting || (activeJob && activeJob.status === 'running'));

  return (
    <div className="p-5 sm:p-7 space-y-6 h-full overflow-y-auto select-none bg-[#060911]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <div className="p-2 rounded-2xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 shadow-inner">
              <Compass className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight font-mono">
              Descoberta de Câmeras na Rede Local
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Localização automática via multicast WS-Discovery (ONVIF) e varredura de portas controlada por CIDR
          </p>
        </div>
      </div>

      {/* Discovery Trigger Card */}
      <div className="bg-[#0a0f1d]/90 border border-slate-800/90 rounded-3xl p-6 shadow-2xl space-y-5">
        <form onSubmit={handleStartScan} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Network Interface */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5 font-mono">
                <Network className="w-3.5 h-3.5 text-blue-400" /> Interface de Rede
              </label>
              <select
                value={selectedIface}
                onChange={(e) => handleSelectInterface(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:border-blue-500 transition shadow-inner font-mono font-bold"
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
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5 font-mono">
                <Radio className="w-3.5 h-3.5 text-cyan-400" /> Sub-rede / CIDR Alvo
              </label>
              <input
                type="text"
                value={cidr}
                onChange={(e) => setCidr(e.target.value)}
                placeholder="Ex: 192.168.1.0/24"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-mono text-white focus:outline-none focus:border-cyan-500 transition shadow-inner font-bold"
                required
              />
            </div>

            {/* Action Button */}
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isButtonDisabled}
                className="w-full py-3 px-5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-cyan-600/25 hover:scale-105 disabled:opacity-50"
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
        <div className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-2xl flex items-center space-x-3 text-xs text-slate-400 shadow-inner font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="leading-relaxed">
            Varredura segura RFC 1918. Portas testadas: 80, 554, 8000, 8080, 8899, 37777 (Dahua, Intelbras, Hikvision, Genéricas).
          </span>
        </div>
      </div>

      {/* Active / Selected Discovery Job Details */}
      {activeJob && (
        <div className="bg-[#0a0f1d]/90 border border-slate-800/90 rounded-3xl p-6 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner flex-shrink-0">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2.5 font-mono">
                  Varredura: {activeJob.cidr || 'WS-Discovery'}
                  <span
                    className={`text-[10px] px-3 py-0.5 rounded-full font-mono font-black border ${
                      activeJob.status === 'completed'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800/80 shadow-sm'
                        : activeJob.status === 'running'
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-800/80 animate-pulse'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
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
                className="px-4 py-2 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm hover:scale-105"
              >
                <StopCircle className="w-4 h-4" /> Cancelar
              </button>
            )}
          </div>

          {/* Progress Bar & Radar */}
          {activeJob.status === 'running' && (
            <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-inner">
              <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 h-2.5 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(6,182,212,1)]"
                  style={{ width: `${activeJob.progress}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span className="font-bold text-cyan-400">Progresso: {activeJob.progress}%</span>
                <span>Varrendo portas ONVIF / RTSP em paralelo...</span>
              </div>
            </div>
          )}

          {/* Discovered Devices Cards */}
          <div>
            <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2 font-mono">
              <Layers className="w-4 h-4 text-cyan-400" />
              Dispositivos Encontrados ({activeJob.results?.length || 0})
            </h4>

            {!activeJob.results || activeJob.results.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs bg-slate-950/60 rounded-2xl border border-slate-800/80 p-6">
                Nenhum dispositivo detectado nesta varredura até o momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeJob.results.map((dev) => (
                  <div
                    key={dev.id}
                    className="p-5 rounded-2xl bg-slate-950 border border-slate-800/90 hover:border-cyan-500/60 transition flex flex-col justify-between space-y-4 shadow-xl"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-black font-mono text-white tracking-wide">{dev.ip}</span>
                          <span className="text-[10px] font-mono text-slate-400 font-bold">Porta: {dev.port}</span>
                          <span className="text-[9px] font-mono font-black px-2 py-0.5 rounded-md bg-slate-900 text-cyan-400 border border-slate-800">
                            {dev.discovered_via === 'ws_discovery' ? 'WS-DISCOVERY' : 'SCAN'}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-200">
                          {dev.manufacturer || 'Fabricante Desconhecido'} {dev.model ? `• ${dev.model}` : ''}
                        </div>
                        {dev.mac_address && (
                          <div className="text-[10px] font-mono text-slate-500">MAC: {dev.mac_address}</div>
                        )}
                      </div>

                      <span
                        className={`text-[10px] font-mono font-black px-2.5 py-1 rounded-full border shadow-sm ${
                          dev.probe_status === 'probed'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : dev.probe_status === 'auth_required'
                            ? 'bg-amber-950 text-amber-300 border-amber-800'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        {dev.probe_status.toUpperCase()}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-900">
                      <button
                        onClick={() => setSelectedDeviceForProbe({ job: activeJob, device: dev })}
                        className="px-3.5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl border border-slate-800 transition flex items-center gap-1.5 shadow-sm"
                      >
                        <Search className="w-3.5 h-3.5 text-cyan-400" />
                        Sondar / Credenciais
                      </button>
                      <button
                        onClick={() => setSelectedDeviceForProbe({ job: activeJob, device: dev })}
                        className="px-4 py-2 text-xs font-black bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl transition flex items-center gap-1.5 shadow-md shadow-blue-600/20"
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
      <div className="bg-[#0a0f1d]/90 border border-slate-800/90 rounded-3xl p-6 shadow-2xl space-y-4">
        <h3 className="text-sm font-black text-white flex items-center gap-2 font-mono uppercase tracking-wider">
          <Clock className="w-4 h-4 text-cyan-400" /> Histórico de Varreduras
        </h3>

        {jobs.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-xs">
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
                className={`py-3.5 px-4 rounded-2xl flex items-center justify-between text-xs cursor-pointer hover:bg-slate-900/60 transition-all ${
                  activeJob?.id === j.id ? 'bg-slate-900 border border-slate-700/80 shadow-md' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="font-mono font-black text-slate-200">{j.cidr || 'WS-Discovery'}</span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {new Date(j.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-[11px] text-slate-400 font-mono font-bold">{j.found_devices} detectados</span>
                  <span
                    className={`text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full border ${
                      j.status === 'completed'
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        : j.status === 'running'
                        ? 'bg-blue-950 text-blue-400 border-blue-800'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
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
