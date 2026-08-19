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
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60 shadow-sm';
      case 'Warning':
        return 'bg-amber-950/80 text-amber-300 border-amber-800/60 shadow-sm';
      case 'Failed':
        return 'bg-rose-950/80 text-rose-300 border-rose-800/60 shadow-sm';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                Diagnóstico Técnico: {camera.name}
              </h3>
              <p className="text-xs font-mono text-slate-400">{camera.host}:{camera.port} (RTSP: {camera.rtsp_port})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-950/60 border border-blue-800/50 flex items-center justify-center mb-3 shadow-lg">
                <RefreshCw className="w-7 h-7 text-blue-400 animate-spin-custom" />
              </div>
              <p className="text-sm text-slate-200 font-bold">Executando checklist de diagnóstico (10 etapas)...</p>
              <p className="text-xs text-slate-500 mt-1 font-mono">Testando Host, Portas TCP, ONVIF, Autenticação, Perfis e RTSP</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs shadow-inner">
              <p className="font-bold mb-1">Erro no diagnóstico:</p>
              <p>{error}</p>
            </div>
          ) : report ? (
            <>
              {/* Summary Bar */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between shadow-md ${
                  report.passed
                    ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                    : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                }`}
              >
                <div className="flex items-center space-x-2.5 text-xs font-bold">
                  {report.passed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  )}
                  <span>{report.summary}</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {new Date(report.tested_at).toLocaleTimeString('pt-BR')}
                </span>
              </div>

              {/* 10 Stages Table */}
              <div className="space-y-2.5">
                {report.stages.map((stage, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-start justify-between space-x-3 hover:border-slate-700 transition shadow-inner"
                  >
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="mt-0.5">{getStatusIcon(stage.status)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-200">{stage.name}</span>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(stage.status)}`}>
                            {stage.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 font-mono break-all leading-relaxed">
                          {stage.details}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">
                      {stage.duration_ms} ms
                    </span>
                  </div>
                ))}
              </div>

              {/* Detected Profiles List */}
              {report.capabilities?.profiles && report.capabilities.profiles.length > 0 && (
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl shadow-inner">
                  <h4 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-400" /> Perfis de Vídeo Detectados
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {report.capabilities.profiles.map((p, i) => (
                      <div key={i} className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-xs font-mono">
                        <div className="flex items-center justify-between text-slate-200 font-bold mb-1">
                          <span>{p.name}</span>
                          <span className="text-blue-400 text-[10px] bg-blue-950 px-1.5 py-0.2 rounded border border-blue-800">
                            {p.is_substream ? 'SUBSTREAM' : 'MAINSTREAM'}
                          </span>
                        </div>
                        <div className="text-slate-400 text-[11px] space-y-0.5">
                          <div>Codec: <span className="text-white">{p.encoder || 'H.264'}</span></div>
                          {p.width > 0 && (
                            <div>Resolução: <span className="text-white">{p.width}x{p.height}</span> ({p.fps} fps)</div>
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
        <div className="px-6 py-3.5 border-t border-slate-800/80 bg-slate-950/70 flex items-center justify-between">
          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700/80 flex items-center gap-1.5 transition disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin-custom text-blue-400' : ''}`} />
            <span>Repetir Diagnóstico</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl transition shadow-lg shadow-blue-600/25"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

