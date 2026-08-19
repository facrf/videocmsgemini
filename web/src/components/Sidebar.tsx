import React from 'react';
import {
  LayoutDashboard,
  Grid,
  Camera as CameraIcon,
  Compass,
  LayoutGrid,
  Settings,
  ShieldCheck,
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
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'live' as NavTab, label: 'Live View (Mosaico)', icon: Grid, badge: '1-32', badgeColor: 'bg-blue-900/60 text-blue-300 border-blue-700/60' },
    { id: 'cameras' as NavTab, label: 'Câmeras', icon: CameraIcon, badge: cameraCount > 0 ? `${cameraCount}` : undefined },
    { id: 'discovery' as NavTab, label: 'Descoberta de Rede', icon: Compass, badge: discoveredCount > 0 ? `${discoveredCount} novo(s)` : undefined, badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-700 animate-pulse' },
    { id: 'layouts' as NavTab, label: 'Layouts Salvos', icon: LayoutGrid },
    { id: 'settings' as NavTab, label: 'Configurações & Info', icon: Settings },
  ];

  return (
    <aside className="w-60 bg-slate-900/90 backdrop-blur-md border-r border-slate-800/80 flex flex-col justify-between select-none z-20 shadow-xl">
      <div className="py-4">
        <div className="px-5 mb-2.5 flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
            Navegação Principal
          </span>
          <span className="flex h-1.5 w-1.5 rounded-full bg-blue-500/80" />
        </div>
        <nav className="space-y-1.5 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600/20 via-indigo-600/10 to-transparent text-blue-400 border border-blue-500/40 shadow-sm shadow-blue-500/5'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-gradient-to-b from-blue-400 to-cyan-400 rounded-r-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                )}
                <div className="flex items-center space-x-3">
                  <div className={`p-1 rounded-lg transition ${
                    isActive ? 'bg-blue-600/30 text-blue-300' : 'text-slate-400 group-hover:text-slate-200 group-hover:bg-slate-800'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="tracking-wide">{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border shadow-sm ${
                      item.badgeColor ||
                      (isActive
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700/80')
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
      <div className="p-3.5 m-3 rounded-xl bg-gradient-to-b from-slate-950/80 to-slate-900/80 border border-slate-800/90 shadow-inner">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center space-x-2 text-slate-200 font-semibold text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Rede Protegida</span>
          </div>
          <span className="text-[9px] font-mono uppercase bg-emerald-950/80 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800/60 font-bold">
            RFC 1918
          </span>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
          SSRF Shield & Criptografia AES-256-GCM ativa em repouso.
        </p>
      </div>
    </aside>
  );
};

