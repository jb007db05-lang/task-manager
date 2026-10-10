import React from 'react';
import {
  FolderKanban,
  Plus,
  Settings,
  Activity,
  BarChart3,
  LogOut,
  BookOpen,
  Target,
  Plug,
  Library,
  FlaskConical,
  LayoutGrid,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react';
import logoImg from '@/assets/logo.png';
import { useWorkspace } from '@/context/WorkspaceContext';
import WorkspaceMenu from '@/components/workspace/WorkspaceMenu';

export type SidebarView =
  | 'dashboard'
  | 'settings'
  | 'event-tracking'
  | 'semantic-intelligence'
  | 'prompts'
  | 'playground'
  | 'sdk-docs'
  | 'engagement'
  | 'sdk-integrations'
  | 'sdk-integration-detail';

interface SidebarProps {
  activeView: SidebarView;
  selectedProjectView: string;
  allProjectsValue: string;
  onProjectSelect: (projectId: string) => void;
  onViewChange: (view: SidebarView, tab?: string) => void;
  onNewProject: () => void;
  onPlanWithAi?: () => void;
  onPlanMyDay?: () => void;
  onLogout: () => void;
  user?: { name: string | null; email: string };
  activeIntegrationId?: string;
  activeIntegrationName?: string;
  /** Sandbox integrations show a SANDBOX badge instead of LIVE. */
  activeIntegrationSandbox?: boolean;
  activeTab?: string;
}

function NavItem({
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={[
        'group relative flex items-center gap-2.5 w-full h-8 px-2.5 rounded-md text-[13px] transition-colors outline-none',
        'focus-visible:ring-2 focus-visible:ring-brand-400/60',
        isActive
          ? 'bg-white/[0.08] text-white font-medium'
          : 'text-white/60 hover:text-white hover:bg-white/[0.04]',
      ].join(' ')}
    >
      {isActive && <span className="absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-r bg-brand-400" />}
      <Icon
        size={16}
        strokeWidth={1.75}
        className={isActive ? 'text-brand-300' : 'text-white/40 group-hover:text-white/70'}
      />
      <span className="truncate">{label}</span>
    </button>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }): JSX.Element {
  return <div className="px-2.5 pt-5 pb-1.5 text-[11px] font-medium text-white/35">{children}</div>;
}

const initialsOf = (name: string | null | undefined, email: string): string => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] || email[0] || 'U').toUpperCase();
};

const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  selectedProjectView,
  allProjectsValue,
  onProjectSelect,
  onViewChange,
  onNewProject,
  onLogout,
  user,
  activeIntegrationId,
  activeIntegrationName,
  activeIntegrationSandbox = false,
  activeTab,
}) => {
  const { can } = useWorkspace();
  const projectsActive = selectedProjectView === allProjectsValue && activeView === 'dashboard';
  const inProject = activeView === 'dashboard' && selectedProjectView !== allProjectsValue;

  return (
    <aside className="flex flex-col w-[240px] shrink-0 h-full select-none bg-[var(--bg-sidebar)] border-r border-black/40">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 h-14 shrink-0">
        <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center shadow-sm">
          <img src={logoImg} alt="" className="w-[18px] h-[18px] object-contain" />
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-white">Pristine</span>
      </div>

      {!activeIntegrationId && <WorkspaceMenu onOpenSettings={() => onViewChange('settings', 'workspace')} />}

      <nav className="flex flex-col flex-1 overflow-y-auto px-3 pb-3 hide-scrollbar">
        {activeIntegrationId ? (
          <>
            <button
              type="button"
              onClick={() => onViewChange('sdk-integrations')}
              className="flex items-center gap-1.5 mt-1 mb-3 px-2.5 h-7 text-xs text-white/50 hover:text-white transition-colors"
            >
              <ArrowLeft size={13} />
              All integrations
            </button>

            <div className="mx-0.5 p-3 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-1.5">
                <Plug size={13} className="text-brand-300 shrink-0" />
                <span className="text-[13px] font-medium text-white truncate">{activeIntegrationName || 'Loading…'}</span>
              </div>
              {activeIntegrationSandbox ? (
                <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-400/15 text-amber-200">
                  Sandbox
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-brand-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                  Live
                </span>
              )}
            </div>

            <GroupLabel>Integration</GroupLabel>
            <div className="flex flex-col gap-0.5">
              <NavItem icon={LayoutGrid} label="Overview" isActive={activeTab === 'overview'} onClick={() => onViewChange('sdk-integration-detail', 'overview')} />
              <NavItem icon={BookOpen} label="Guides" isActive={activeTab === 'guides'} onClick={() => onViewChange('sdk-integration-detail', 'guides')} />
              <NavItem icon={Target} label="Surveys" isActive={activeTab === 'surveys'} onClick={() => onViewChange('sdk-integration-detail', 'surveys')} />
              <NavItem icon={Activity} label="Events" isActive={activeTab === 'events'} onClick={() => onViewChange('sdk-integration-detail', 'events')} />
            </div>
          </>
        ) : (
          <>
            {can('project.create') && (
            <button
              type="button"
              onClick={onNewProject}
              className="flex items-center justify-center gap-2 h-8 mt-1 mb-1 rounded-md bg-white/[0.06] border border-white/[0.08] text-[13px] font-medium text-white hover:bg-white/[0.1] transition-colors"
            >
              <Plus size={15} strokeWidth={2} />
              New project
            </button>
            )}

            <GroupLabel>Work</GroupLabel>
            <div className="flex flex-col gap-0.5">
              <NavItem icon={FolderKanban} label="Projects" isActive={projectsActive || inProject} onClick={() => onProjectSelect(allProjectsValue)} />
              {can('intelligence.view') && (
                <NavItem icon={BarChart3} label="Insights" isActive={activeView === 'semantic-intelligence'} onClick={() => onViewChange('semantic-intelligence')} />
              )}
            </div>

            {can('library.access') && (
              <>
                <GroupLabel>Prompts</GroupLabel>
                <div className="flex flex-col gap-0.5">
                  <NavItem icon={Library} label="Library" isActive={activeView === 'prompts'} onClick={() => onViewChange('prompts')} />
                  <NavItem icon={FlaskConical} label="Playground" isActive={activeView === 'playground'} onClick={() => onViewChange('playground')} />
                </div>
              </>
            )}

            <GroupLabel>Developers</GroupLabel>
            <div className="flex flex-col gap-0.5">
              <NavItem icon={Plug} label="SDK integrations" isActive={activeView === 'sdk-integrations'} onClick={() => onViewChange('sdk-integrations')} />
              <NavItem icon={BookOpen} label="Documentation" isActive={activeView === 'sdk-docs'} onClick={() => onViewChange('sdk-docs')} />
            </div>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 pt-2 pb-3 border-t border-white/[0.06]">
        <NavItem icon={Settings} label="Settings" isActive={activeView === 'settings'} onClick={() => onViewChange('settings')} />
        {user && (
          <div className="group flex items-center gap-2.5 mt-2 px-1.5 py-1.5 rounded-md">
            <div className="w-7 h-7 rounded-full bg-brand-700 text-brand-50 text-[11px] font-semibold flex items-center justify-center shrink-0">
              {initialsOf(user.name, user.email)}
            </div>
            <div className="flex-1 min-w-0 leading-tight">
              <div className="text-[13px] font-medium text-white truncate">{user.name || 'Account'}</div>
              <div className="text-[11px] text-white/40 truncate">{user.email}</div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              title="Sign out"
              aria-label="Sign out"
              className="w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <LogOut size={15} strokeWidth={1.75} />
            </button>
          </div>
        )}
        {!user && (
          <NavItem icon={LogOut} label="Sign out" isActive={false} onClick={onLogout} />
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
