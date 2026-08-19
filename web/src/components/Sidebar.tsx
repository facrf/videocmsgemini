import React from 'react';
import {
  LayoutDashboard,
  Grid,
  Camera as CameraIcon,
  Compass,
  LayoutGrid,
  Settings,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'live' | 'cameras' | 'discovery' | 'layouts' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  cameraCount?: number;
  discoveredCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  cameraCount = 0,
  discoveredCount = 0,
}) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Painel Central', icon: LayoutDashboard },
    { id: 'live' as NavTab, label: 'Mosaico (Live View)', icon: Grid, badge: '1-32', badgeColor: 'bg-blue-950 text-blue-300 border-blue-700/60 font-mono' },
    { id: 'cameras' as NavTab, label: 'Catálogo Câmeras', icon: CameraIcon, badge: cameraCount > 0 ? `${cameraCount}` : undefined },
    { id: 'discovery' as NavTab, label: 'Descoberta de Rede', icon: Compass, badge: discoveredCount > 0 ? `${discoveredCount} novo(s)` : undefined, badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-700 animate-pulse font-mono' },
    { id: 'layouts' as NavTab, label: 'Grades & Layouts', icon: LayoutGrid },
    { id: 'settings' as NavTab, label: 'Configurações', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#080d18] border-r border-slate-800/80 flex flex-col justify-between select-none z-20 shadow-2xl relative">
      <div className="py-4">
        <div className="px-5 mb-3 flex items-center justify-between">
          <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase font-mono">
            Módulos VMS
          </span>
          <span className="flex h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
        </div>
        <nav className="space-y-1.5 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600/25 via-indigo-600/15 to-transparent text-white border border-blue-500/50 shadow-lg shadow-blue-500/10'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60 border border-transparent'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-gradient-to-b from-blue-400 to-cyan-400 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,1)]" />
                )}
                <div className="flex items-center space-x-3">
                  <div className={`p-1.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                      : 'bg-slate-900/90 text-slate-400 group-hover:text-white group-hover:bg-slate-800'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="tracking-wide text-xs">{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full border shadow-sm ${
                      item.badgeColor ||
                      (isActive
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-800')
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Security & SSRF Shield Badge */}
      <div className="p-4 m-3 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800/90 shadow-xl space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-200 font-bold text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>SSRF Shield Ativo</span>
          </div>
          <span className="text-[9px] font-mono uppercase bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-800/80 font-black">
            RFC 1918
          </span>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
          Criptografia AES-256-GCM em repouso e isolamento de rede local.
        </p>
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-400" /> Ingestão 1:N</span>
          <span className="text-emerald-400 font-bold">● Protegido</span>
        </div>
      </div>
    </aside>
  );
};
