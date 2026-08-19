import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  X,
  Layers,
} from 'lucide-react';
import { Camera, DiagnosticReport } from '../types';
import { api } from '../api/client';

interface DiagnosticsModalProps {
  camera: Camera;
  onClose: () => void;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({ camera, onClose }) => {
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCameraDiagnostics(camera.id);
      setReport(res);
    } catch (err: any) {
      setError(err.message || 'Falha ao executar diagnóstico');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, [camera.id]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OK':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'Warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'Failed':
        return <XCircle className="w-4 h-4 text-rose-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OK':
        return 'bg-emerald-950/90 text-emerald-300 border-emerald-700/80 shadow-sm';
      case 'Warning':
        return 'bg-amber-950/90 text-amber-300 border-amber-700/80 shadow-sm';
      case 'Failed':
        return 'bg-rose-950/90 text-rose-300 border-rose-700/80 shadow-sm';
      default:
        return 'bg-slate-900 text-slate-400 border-slate-800';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 select-none">
      <div className="bg-[#0b101d] border border-slate-700/80 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-[#070b14]">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white font-mono flex items-center gap-2">
                Diagnóstico Técnico: {camera.name}
              </h3>
              <p className="text-xs font-mono text-slate-400">
                {camera.host}:{camera.port} (RTSP: {camera.rtsp_port})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-3xl bg-blue-950/60 border border-blue-800/60 flex items-center justify-center mb-4 shadow-xl">
                <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin-custom" />
              </div>
              <p className="text-sm text-slate-200 font-extrabold font-mono">Executando checklist de diagnóstico (10 etapas)...</p>
              <p className="text-xs text-slate-400 mt-1 font-mono">Testando Host, Portas TCP, ONVIF, Autenticação, Perfis e RTSP</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs shadow-inner">
              <p className="font-bold mb-1">Erro no diagnóstico:</p>
              <p>{error}</p>
            </div>
          ) : report ? (
            <>
              {/* Summary Bar */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between shadow-xl ${
                  report.passed
                    ? 'bg-emerald-950/50 border-emerald-700/80 text-emerald-300'
                    : 'bg-amber-950/50 border-amber-700/80 text-amber-300'
                }`}
              >
                <div className="flex items-center space-x-2.5 text-xs font-bold font-mono">
                  {report.passed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  )}
                  <span>{report.summary}</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400 font-bold">
                  {new Date(report.tested_at).toLocaleTimeString('pt-BR')}
                </span>
              </div>

              {/* 10 Stages Table */}
              <div className="space-y-2.5">
                {(report.stages || []).map((stage, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800/90 flex items-start justify-between space-x-3 hover:border-slate-700 transition shadow-inner"
                  >
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="mt-0.5">{getStatusIcon(stage.status)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-200 font-mono">{stage.name}</span>
                          <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full border ${getStatusBadge(stage.status)}`}>
                            {stage.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 font-mono break-all leading-relaxed">
                          {stage.details}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap font-bold">
                      {stage.duration_ms} ms
                    </span>
                  </div>
                ))}
              </div>

              {/* Detected Profiles List */}
              {report.capabilities?.profiles && report.capabilities.profiles.length > 0 && (
                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl shadow-inner space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2 font-mono uppercase tracking-wider">
                    <Layers className="w-4 h-4 text-cyan-400" /> Perfis de Vídeo Detectados
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(report.capabilities.profiles || []).map((p, i) => (
                      <div key={i} className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 text-xs font-mono space-y-1">
                        <div className="flex items-center justify-between text-slate-200 font-bold">
                          <span>{p.name}</span>
                          <span className="text-cyan-400 text-[10px] bg-cyan-950 px-2 py-0.5 rounded-md border border-cyan-800 font-black">
                            {p.is_substream ? 'SUBSTREAM' : 'MAINSTREAM'}
                          </span>
                        </div>
                        <div className="text-slate-400 text-[11px] space-y-0.5">
                          <div>Codec: <span className="text-white font-bold">{p.encoder || 'H.264'}</span></div>
                          {p.width > 0 && (
                            <div>Resolução: <span className="text-white font-bold">{p.width}x{p.height}</span> ({p.fps} fps)</div>
                          )}
                          {p.rtsp_uri && (
                            <div className="text-slate-500 truncate" title={p.rtsp_uri}>URI: {p.rtsp_uri}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#070b14] flex items-center justify-between">
          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="px-4 py-2.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-2xl border border-slate-700/80 flex items-center gap-2 transition disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin-custom text-cyan-400' : ''}`} />
            <span>Repetir Diagnóstico</span>
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl transition shadow-lg shadow-blue-600/30 hover:scale-105"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
