import { useEffect, useRef, useState } from 'react';
import { Check, ChevronsUpDown, Plus, Settings } from 'lucide-react';

import Modal from '@/components/Modal';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useToast } from '@/context/ToastContext';
import { toDisplayErrorMessage } from '@/utils/apiError';

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  MEMBER: 'Member',
  GUEST: 'Guest'
};

/** Sidebar switcher: pick the workspace everything else is scoped to. */
export function WorkspaceMenu({ onOpenSettings }: { onOpenSettings: () => void }): JSX.Element {
  const { workspaces, activeWorkspace, switchWorkspace, createWorkspace } = useWorkspace();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const created = await createWorkspace(name.trim());
      showToast({ variant: 'success', message: `Created “${created.name}”.` });
      setCreating(false);
      setName('');
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const distinctWorkspaces = Array.from(new Map(workspaces.map((ws) => [ws.id, ws])).values());

  return (
    <div className="relative px-3 pt-1 pb-2" ref={ref}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-2.5 w-full min-h-[46px] py-1.5 px-2.5 rounded-lg bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.07] transition-colors text-left"
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        <span className="w-7 h-7 rounded-md bg-brand-600 text-white text-[12px] font-semibold flex items-center justify-center shrink-0 shadow-sm">
          {(activeWorkspace?.name ?? '?').slice(0, 1).toUpperCase()}
        </span>
        <span className="flex-1 min-w-0 leading-tight">
          <div className="flex items-center justify-between gap-1.5">
            <span className="block text-[13px] font-medium text-white truncate">{activeWorkspace?.name ?? 'Loading…'}</span>
            {activeWorkspace && (
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                activeWorkspace.role === 'OWNER'
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                  : activeWorkspace.role === 'ADMIN'
                  ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                  : 'bg-white/10 text-white/70 border border-white/15'
              }`}>
                {ROLE_LABEL[activeWorkspace.role] || activeWorkspace.role}
              </span>
            )}
          </div>
          <span className="block text-[11px] text-white/40 mt-0.5">
            {activeWorkspace ? `${Math.max(1, activeWorkspace.memberCount ?? 1)} ${Math.max(1, activeWorkspace.memberCount ?? 1) === 1 ? 'member' : 'members'}` : ' '}
          </span>
        </span>
        <ChevronsUpDown size={14} className="text-white/40 shrink-0" />
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 z-50 rounded-xl bg-white shadow-xl ring-1 ring-olive-950/10 p-1.5 animate-modalIn" role="listbox">
          <div className="px-2 pt-1 pb-1.5 text-[11px] font-medium text-olive-500 uppercase tracking-wider">Workspaces</div>
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {distinctWorkspaces.map((ws) => (
              <button
                aria-selected={ws.id === activeWorkspace?.id}
                className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-left transition-colors ${
                  ws.id === activeWorkspace?.id ? 'bg-olive-50' : 'hover:bg-olive-50/70'
                }`}
                key={ws.id}
                onClick={() => {
                  switchWorkspace(ws.id);
                  setOpen(false);
                }}
                role="option"
                type="button"
              >
                <span className="w-7 h-7 rounded-md bg-brand-50 text-brand-800 text-[11px] font-semibold flex items-center justify-center shrink-0 border border-brand-200/50">
                  {ws.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[13px] font-medium text-olive-900 truncate">{ws.name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                      ws.role === 'OWNER'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : ws.role === 'ADMIN'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-olive-100 text-olive-700 border border-olive-200'
                    }`}>
                      {ROLE_LABEL[ws.role] || ws.role}
                    </span>
                  </div>
                  <span className="block text-[11px] text-olive-500 mt-0.5">
                    {Math.max(1, ws.memberCount ?? 1)} {Math.max(1, ws.memberCount ?? 1) === 1 ? 'member' : 'members'} · {ws.projectCount ?? 0} {ws.projectCount === 1 ? 'project' : 'projects'}
                  </span>
                </span>
                {ws.id === activeWorkspace?.id && <Check size={14} className="text-brand-600 shrink-0 ml-1" />}
              </button>
            ))}
          </div>
          <div className="my-1 border-t border-olive-100" />
          <button
            className="flex items-center gap-2 w-full px-2 h-9 rounded-lg text-[13px] text-olive-700 hover:bg-olive-50"
            onClick={() => {
              setOpen(false);
              onOpenSettings();
            }}
            type="button"
          >
            <Settings size={14} /> Members & permissions
          </button>
          <button
            className="flex items-center gap-2 w-full px-2 h-9 rounded-lg text-[13px] text-olive-700 hover:bg-olive-50"
            onClick={() => {
              setOpen(false);
              setCreating(true);
            }}
            type="button"
          >
            <Plus size={14} /> New workspace
          </button>
        </div>
      )}

      {creating && (
        <Modal title="New workspace" description="A separate space with its own members, projects and prompts." onClose={() => setCreating(false)}>
          <label className="grid gap-1.5 text-[13px] font-medium text-olive-700">
            <span>Name</span>
            <input
              autoFocus
              className="input-base"
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void submit()}
              placeholder="Acme product team"
              value={name}
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn btn-secondary" onClick={() => setCreating(false)} type="button">Cancel</button>
            <button className="btn btn-primary" disabled={saving || !name.trim()} onClick={() => void submit()} type="button">
              {saving ? 'Creating…' : 'Create workspace'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default WorkspaceMenu;
