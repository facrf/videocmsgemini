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
    { id: 'live' as NavTab, label: 'Live View (Mosaico)', icon: Grid },
    { id: 'cameras' as NavTab, label: 'Câmeras', icon: CameraIcon, badge: cameraCount },
    { id: 'discovery' as NavTab, label: 'Descoberta', icon: Compass, badge: discoveredCount > 0 ? discoveredCount : undefined },
    { id: 'layouts' as NavTab, label: 'Layouts', icon: LayoutGrid },
    { id: 'settings' as NavTab, label: 'Configurações', icon: Settings },
  ];

  return (
    <aside className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col justify-between select-none">
      <div className="py-4">
        <div className="px-4 mb-3 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
          Menu Principal
        </div>
        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-blue-500/30 text-blue-300' : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Security & SSRF Badge */}
      <div className="p-3 m-2 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-400 text-[11px]">
        <div className="flex items-center space-x-2 text-slate-300 font-medium mb-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Rede Protegida</span>
        </div>
        <p className="text-[10px] text-slate-500">
          SSRF Shield & Criptografia AES-GCM ativa
        </p>
      </div>
    </aside>
  );
};
