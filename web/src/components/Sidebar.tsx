import React from 'react';
import {
  LayoutDashboard,
  Grid,
  Camera as CameraIcon,
  Compass,
  LayoutGrid,
  Settings,
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
    { id: 'live' as NavTab, label: 'Mosaico (Live View)', icon: Grid, badge: '1-32' },
    { id: 'cameras' as NavTab, label: 'Catálogo Câmeras', icon: CameraIcon, badge: cameraCount > 0 ? `${cameraCount}` : undefined },
    { id: 'discovery' as NavTab, label: 'Descoberta de Rede', icon: Compass, badge: discoveredCount > 0 ? `${discoveredCount} novo(s)` : undefined },
    { id: 'layouts' as NavTab, label: 'Grades & Layouts', icon: LayoutGrid },
    { id: 'settings' as NavTab, label: 'Configurações', icon: Settings },
  ];

  return (
    <aside className="w-56 bg-slate-900 border-r border-slate-700/40 flex flex-col justify-between select-none z-20">
      <div className="py-4">
        <div className="px-4 mb-4">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            NAVEGAÇÃO
          </span>
        </div>
        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600/10 text-blue-400 border-l-2 border-blue-500'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-l-2 border-transparent'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-slate-800 text-slate-400 border border-slate-700/40'
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
    </aside>
  );
};
