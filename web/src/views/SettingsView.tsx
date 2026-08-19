import React from 'react';
import {
  Settings,
  ShieldCheck,
  Server,
  Radio,
  Lock,
  Cpu,
} from 'lucide-react';
import { SystemStats } from '../types';

interface SettingsViewProps {
  stats: SystemStats | null;
  sseConnected: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ stats, sseConnected }) => {
  return (
    <div className="p-5 sm:p-7 space-y-6 h-full overflow-y-auto max-w-5xl select-none bg-[#060911]">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-3 mb-1">
          <div className="p-2 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-inner">
            <Settings className="w-5 h-5" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight font-mono">
            Configurações & Arquitetura do Sistema
          </h2>
        </div>
        <p className="text-xs text-slate-400">
          Informações operacionais, parâmetros de segurança, integridade do banco e status do servidor
        </p>
      </div>

      <div className="space-y-6">
        {/* General Server Info Card */}
        <div className="bg-[#0a0f1d]/95 border border-slate-800/90 rounded-3xl p-6 shadow-2xl space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white flex items-center gap-2 font-mono uppercase tracking-wider">
              <Server className="w-4 h-4 text-blue-400" /> Servidor Backend VideoCMS
            </h3>
            <span className="px-3 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/80 text-[10px] font-mono font-black shadow-sm">
              ESTÁVEL
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5 shadow-inner">
              <span className="text-slate-500 text-[10px] font-bold">PORTA HTTP DA APLICAÇÃO</span>
              <p className="text-white font-black text-sm">15000 (CMS_PORT)</p>
            </div>
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5 shadow-inner">
              <span className="text-slate-500 text-[10px] font-bold">ORIGEM UNIFICADA</span>
              <p className="text-white font-black text-sm">http://localhost:15000</p>
            </div>
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5 shadow-inner">
              <span className="text-slate-500 text-[10px] font-bold">BANCO DE DADOS LOCAL</span>
              <p className="text-white font-black text-sm">SQLite WAL (./data/cms.db)</p>
            </div>
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5 shadow-inner">
              <span className="text-slate-500 text-[10px] font-bold">HEALTH CHECK PROBE</span>
              <p className="text-white font-black text-sm">30s (Automático)</p>
            </div>
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5 shadow-inner">
              <span className="text-slate-500 text-[10px] font-bold">CANAL SSE (REAL-TIME)</span>
              <p className={`font-black text-sm ${sseConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
                {sseConnected ? 'Conectado & Ativo' : 'Desconectado'}
              </p>
            </div>
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5 shadow-inner">
              <span className="text-slate-500 text-[10px] font-bold">TOTAL CÂMERAS NO BANCO</span>
              <p className="text-white font-black text-sm">{stats?.total_cameras || 0} dispositivos</p>
            </div>
          </div>
        </div>

        {/* Security & SSRF Card */}
        <div className="bg-[#0a0f1d]/95 border border-slate-800/90 rounded-3xl p-6 shadow-2xl space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white flex items-center gap-2 font-mono uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Política de Segurança & Proteção SSRF
            </h3>
            <span className="px-3 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/80 text-[10px] font-mono font-black shadow-sm">
              PROTEGIDO
            </span>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 shadow-inner">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                <Lock className="w-4 h-4" />
                <span>Criptografia de Senhas em Repouso</span>
              </div>
              <p className="text-slate-300 leading-relaxed font-sans">
                Todas as senhas de câmeras são criptografadas em repouso com algoritmo <strong>AES-256-GCM</strong> derivado da chave <code className="text-cyan-300 bg-slate-900 px-2 py-0.5 rounded-md font-mono border border-slate-800">CMS_SECRET_KEY</code>. Nenhuma credencial trafega em texto puro em logs ou URLs persistidas.
              </p>
            </div>

            <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3 shadow-inner">
              <div className="flex items-center space-x-2 text-cyan-400 font-bold">
                <Radio className="w-4 h-4" />
                <span>Allowlist de Redes Privadas Autorizadas (RFC 1918)</span>
              </div>
              <p className="text-slate-200 font-mono text-xs bg-slate-900 p-3 rounded-xl border border-slate-800">
                10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                Endereços de metadados de nuvem (169.254.169.254) e redes públicas são estritamente bloqueados na camada de transporte HTTP/TCP para mitigar qualquer risco de SSRF.
              </p>
            </div>
          </div>
        </div>

        {/* Streaming Architecture Info */}
        <div className="bg-[#0a0f1d]/95 border border-slate-800/90 rounded-3xl p-6 shadow-2xl space-y-3.5">
          <h3 className="text-sm font-black text-white flex items-center gap-2 font-mono uppercase tracking-wider">
            <Cpu className="w-4 h-4 text-cyan-400" /> Arquitetura de Transmissão (StreamManager)
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            O <strong>StreamManager</strong> implementa ingestão compartilhada de alto desempenho: <strong>1 Conexão Física por Câmera → N Visualizadores no Navegador</strong>. A grade de até 32 posições utiliza substreams adaptativos de baixa latência em modo mosaico e comuta automaticamente para o stream principal ao ampliar uma câmera específica.
          </p>
        </div>
      </div>
    </div>
  );
};
