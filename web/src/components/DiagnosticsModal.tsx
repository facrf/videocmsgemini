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
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'Warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case 'Failed':
        return <XCircle className="w-5 h-5 text-rose-400" />;
      default:
        return <Clock className="w-5 h-5 text-slate-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OK':
        return 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30';
      case 'Warning':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'Failed':
        return 'bg-rose-600/20 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700/40';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/40 rounded-xl max-w-2xl w-full overflow-hidden shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-700/40 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Diagnóstico Técnico: {camera.name}
              </h3>
              <p className="text-sm text-slate-400 font-mono">
                {camera.host}:{camera.port} (RTSP: {camera.rtsp_port})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mb-4">
                <RefreshCw className="w-8 h-8 text-blue-400 animate-spin-custom" />
              </div>
              <p className="text-sm text-slate-200 font-medium">Executando checklist de diagnóstico (10 etapas)...</p>
              <p className="text-sm text-slate-400 mt-1">Testando Host, Portas TCP, ONVIF, Autenticação, Perfis e RTSP</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-rose-600/20 border border-rose-500/30 text-rose-400 text-sm">
              <p className="font-semibold mb-1">Erro no diagnóstico:</p>
              <p>{error}</p>
            </div>
          ) : report ? (
            <>
              {/* Summary Bar */}
              <div
                className={`p-4 rounded-lg border flex items-center justify-between ${
                  report.passed
                    ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}
              >
                <div className="flex items-center space-x-2 text-sm font-medium">
                  {report.passed ? (
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  )}
                  <span>{report.summary}</span>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(report.tested_at).toLocaleTimeString('pt-BR')}
                </span>
              </div>

              {/* 10 Stages Table */}
              <div className="space-y-2">
                {(report.stages || []).map((stage, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/40 flex items-start justify-between space-x-3"
                  >
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="mt-0.5">{getStatusIcon(stage.status)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-slate-200">{stage.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusBadge(stage.status)}`}>
                            {stage.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 mt-1 break-all">
                          {stage.details}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap font-mono">
                      {stage.duration_ms} ms
                    </span>
                  </div>
                ))}
              </div>

              {/* Detected Profiles List */}
              {report.capabilities?.profiles && report.capabilities.profiles.length > 0 && (
                <div className="p-4 bg-slate-800/50 border border-slate-700/40 rounded-lg space-y-3">
                  <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2 uppercase tracking-wide">
                    <Layers className="w-4 h-4 text-blue-400" /> Perfis de Vídeo Detectados
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(report.capabilities.profiles || []).map((p, i) => (
                      <div key={i} className="p-3 bg-slate-800 rounded-lg border border-slate-700/40 text-sm space-y-1">
                        <div className="flex items-center justify-between text-slate-200 font-medium">
                          <span>{p.name}</span>
                          <span className="text-blue-400 text-xs bg-blue-900/20 px-2 py-0.5 rounded-md border border-blue-800/50">
                            {p.is_substream ? 'SUBSTREAM' : 'MAINSTREAM'}
                          </span>
                        </div>
                        <div className="text-slate-400 text-xs space-y-1 mt-2">
                          <div>Codec: <span className="text-slate-200">{p.encoder || 'H.264'}</span></div>
                          {p.width > 0 && (
                            <div>Resolução: <span className="text-slate-200">{p.width}x{p.height}</span> ({p.fps} fps)</div>
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
        <div className="px-5 py-4 border-t border-slate-700/40 flex items-center justify-between">
          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700/40 flex items-center gap-2 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin-custom text-blue-400' : ''}`} />
            <span>Repetir Diagnóstico</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
