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
    <aside className="w-full md:w-56 bg-slate-900 border-t md:border-t-0 md:border-r border-slate-700/40 flex md:flex-col justify-between select-none z-20 order-last md:order-first overflow-x-auto md:overflow-visible">
      <div className="py-2 md:py-4 flex md:block w-full">
        <div className="hidden md:block px-4 mb-4">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            NAVEGAÇÃO
          </span>
        </div>
        <nav className="flex md:space-y-1 md:px-2 w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex-1 md:w-full flex flex-col md:flex-row items-center justify-center md:justify-between p-2 md:px-3 md:py-2 md:rounded-lg text-[10px] md:text-sm font-medium transition-colors border-b-2 md:border-b-0 md:border-l-2 ${
                  isActive
                    ? 'bg-blue-600/10 text-blue-400 border-blue-500'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-transparent'
                }`}
              >
                <div className="flex flex-col md:flex-row items-center md:space-x-3 space-y-1 md:space-y-0">
                  <Icon className="w-5 h-5 md:w-4 md:h-4" />
                  <span className="truncate max-w-[60px] md:max-w-none">{item.label.split(' ')[0]}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`hidden md:inline-block text-[10px] px-2 py-0.5 rounded-full ${
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
