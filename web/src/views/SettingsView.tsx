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
    <div className="p-5 sm:p-7 space-y-6 h-full overflow-y-auto max-w-5xl select-none bg-[#0a0a12]">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-2">
        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/40 text-slate-300 shadow-sm">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
            Configurações & Arquitetura
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Informações operacionais, parâmetros de segurança, integridade do banco e status do servidor
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* General Server Info Card */}
        <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium text-slate-100 flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-500" /> Servidor Backend VideoCMS
            </h3>
            <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-medium">
              ESTÁVEL
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-900 rounded-xl border border-slate-700/40 space-y-1">
              <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">Porta HTTP</span>
              <p className="text-slate-100 font-mono text-sm">15000</p>
            </div>
            <div className="p-4 bg-slate-900 rounded-xl border border-slate-700/40 space-y-1">
              <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">Origem Unificada</span>
              <p className="text-slate-100 font-mono text-sm">http://localhost:15000</p>
            </div>
            <div className="p-4 bg-slate-900 rounded-xl border border-slate-700/40 space-y-1">
              <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">Banco de Dados</span>
              <p className="text-slate-100 font-mono text-sm">./data/cms.db</p>
            </div>
            <div className="p-4 bg-slate-900 rounded-xl border border-slate-700/40 space-y-1">
              <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">Health Check Probe</span>
              <p className="text-slate-100 text-sm">30s (Automático)</p>
            </div>
            <div className="p-4 bg-slate-900 rounded-xl border border-slate-700/40 space-y-1">
              <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">Canal SSE (Real-Time)</span>
              <p className={`text-sm font-medium ${sseConnected ? 'text-emerald-500' : 'text-rose-500'}`}>
                {sseConnected ? 'Conectado & Ativo' : 'Desconectado'}
              </p>
            </div>
            <div className="p-4 bg-slate-900 rounded-xl border border-slate-700/40 space-y-1">
              <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">Total Câmeras DB</span>
              <p className="text-slate-100 text-sm">{stats?.total_cameras || 0} dispositivos</p>
            </div>
          </div>
        </div>

        {/* Security & SSRF Card */}
        <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" /> Política de Segurança & Proteção SSRF
            </h3>
            <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-medium">
              PROTEGIDO
            </span>
          </div>

          <div className="space-y-4">
            <div className="p-5 bg-slate-900 rounded-xl border border-slate-700/40 space-y-3">
              <div className="flex items-center space-x-2 text-slate-200 font-medium">
                <Lock className="w-4 h-4 text-emerald-500" />
                <span>Criptografia de Senhas em Repouso</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Todas as senhas de câmeras são criptografadas em repouso com algoritmo <strong>AES-256-GCM</strong> derivado da chave <code className="text-cyan-500 bg-slate-800 px-1.5 py-0.5 rounded font-mono text-xs">CMS_SECRET_KEY</code>. Nenhuma credencial trafega em texto puro em logs ou URLs persistidas.
              </p>
            </div>

            <div className="p-5 bg-slate-900 rounded-xl border border-slate-700/40 space-y-3">
              <div className="flex items-center space-x-2 text-slate-200 font-medium">
                <Radio className="w-4 h-4 text-cyan-500" />
                <span>Allowlist de Redes Privadas Autorizadas (RFC 1918)</span>
              </div>
              <p className="text-slate-300 font-mono text-sm bg-slate-800/50 p-3 rounded-lg border border-slate-700/40">
                10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8
              </p>
              <p className="text-sm text-slate-500 leading-relaxed">
                Endereços de metadados de nuvem (169.254.169.254) e redes públicas são estritamente bloqueados na camada de transporte HTTP/TCP para mitigar qualquer risco de SSRF.
              </p>
            </div>
          </div>
        </div>

        {/* Streaming Architecture Info */}
        <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-6 shadow-sm space-y-3">
          <h3 className="text-base font-medium text-slate-100 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-500" /> Arquitetura de Transmissão (StreamManager)
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            O <strong>StreamManager</strong> implementa ingestão compartilhada de alto desempenho: <strong>1 Conexão Física por Câmera → N Visualizadores no Navegador</strong>. A grade de até 32 posições utiliza substreams adaptativos de baixa latência em modo mosaico e comuta automaticamente para o stream principal ao ampliar uma câmera específica.
          </p>
        </div>
      </div>
    </div>
  );
};
