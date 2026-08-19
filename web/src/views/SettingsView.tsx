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
    <div className="p-6 space-y-6 h-full overflow-y-auto max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" /> Configurações & Arquitetura do Sistema
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Informações operacionais, parâmetros de segurança e status do servidor
        </p>
      </div>

      <div className="space-y-4">
        {/* General Server Info Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-400" /> Servidor Backend VideoCMS
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 space-y-1">
              <span className="text-slate-500 font-mono text-[10px]">PORTA HTTP DA APLICAÇÃO</span>
              <p className="text-white font-mono font-semibold">15000 (CMS_PORT)</p>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 space-y-1">
              <span className="text-slate-500 font-mono text-[10px]">ORIGEM UNIFICADA</span>
              <p className="text-white font-mono font-semibold">http://localhost:15000</p>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 space-y-1">
              <span className="text-slate-500 font-mono text-[10px]">BANCO DE DADOS PERSISTENTE</span>
              <p className="text-white font-mono font-semibold">SQLite WAL (./data/cms.db)</p>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 space-y-1">
              <span className="text-slate-500 font-mono text-[10px]">INTERVALO HEALTH CHECK</span>
              <p className="text-white font-mono font-semibold">30 segundos (CMS_CAMERA_HEALTH_INTERVAL)</p>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 space-y-1">
              <span className="text-slate-500 font-mono text-[10px]">STATUS SSE</span>
              <p className={`font-mono font-semibold ${sseConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
                {sseConnected ? 'Conectado e Ativo' : 'Desconectado'}
              </p>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 space-y-1">
              <span className="text-slate-500 font-mono text-[10px]">TOTAL CÂMERAS NO BANCO</span>
              <p className="text-white font-mono font-semibold">{stats?.total_cameras || 0} cadastradas</p>
            </div>
          </div>
        </div>

        {/* Security & SSRF Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Política de Segurança & Proteção contra SSRF
          </h3>
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400 font-semibold">
                <Lock className="w-3.5 h-3.5" />
                <span>Criptografia de Credenciais em Repouso</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Todas as senhas de câmeras são criptografadas em repouso com algoritmo AES-256-GCM derivado de <code className="text-blue-300">CMS_SECRET_KEY</code>. Nenhuma senha trafega em texto puro em URLs persistidas.
              </p>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center space-x-2 text-blue-400 font-semibold">
                <Radio className="w-3.5 h-3.5" />
                <span>Faixas de Rede Permitidas para Descoberta & Conexão (Allowlist)</span>
              </div>
              <p className="text-slate-400 font-mono text-[11px] bg-slate-900 p-2 rounded border border-slate-800">
                10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8
              </p>
              <p className="text-[11px] text-slate-500">
                Endereços de nuvem (169.254.169.254) e internet pública são estritamente bloqueados para prevenir ataques SSRF.
              </p>
            </div>
          </div>
        </div>

        {/* Streaming Architecture Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" /> Arquitetura de Transmissão (StreamManager)
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            O StreamManager implementa ingestão compartilhada: <strong>1 Conexão de Câmera → N Visualizadores no Navegador</strong>.
            A grade de até 32 posições utiliza substreams adaptativos de baixa latência e comuta automaticamente para o stream principal ao ampliar uma câmera específica.
          </p>
        </div>
      </div>
    </div>
  );
};
