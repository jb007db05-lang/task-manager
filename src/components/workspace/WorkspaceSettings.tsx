import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Copy, FolderKanban, Lock, Mail, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';

import EmptyState from '@/components/EmptyState';
import UserAvatar from '@/components/UserAvatar';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmationContext';
import workspaceService, {
  type PermissionCatalog,
  type PermissionKey,
  type PermissionSet,
  type WorkspaceMember,
  type WorkspaceRole
} from '@/services/workspaces';
import { addProjectMember, getProjectMembers, removeProjectMember } from '@/services/projects';
import { toDisplayErrorMessage } from '@/utils/apiError';

const ROLE_LABEL: Record<WorkspaceRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  MEMBER: 'Member',
  GUEST: 'Guest'
};

type Tab = 'members' | 'projects';

/* ------------------------------------------------------------------ members */

interface MemberRowProps {
  member: WorkspaceMember;
  catalog: PermissionCatalog;
  editable: boolean;
  onSaved: (member: WorkspaceMember) => void;
  onRemove: (member: WorkspaceMember) => void;
}

/** One member: role, and a permission checklist saved independently. */
function MemberRow({ member, catalog, editable, onSaved, onRemove }: MemberRowProps): JSX.Element {
  const { activeWorkspaceId } = useWorkspace();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PermissionSet>(member.permissions);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(member.permissions), [member.permissions]);

  const changed = useMemo(
    () => (Object.keys(draft) as PermissionKey[]).filter((k) => draft[k] !== member.permissions[k]),
    [draft, member.permissions]
  );
  const granted = Object.values(member.permissions).filter(Boolean).length;
  const groups = useMemo(() => {
    const map = new Map<string, PermissionCatalog['permissions']>();
    catalog.permissions.forEach((p) => map.set(p.group, [...(map.get(p.group) ?? []), p]));
    return [...map.entries()];
  }, [catalog]);

  const save = async () => {
    setSaving(true);
    try {
      const patch = Object.fromEntries(changed.map((k) => [k, draft[k]])) as Partial<PermissionSet>;
      onSaved(await workspaceService.updateMemberPermissions(activeWorkspaceId, member.id, patch));
      showToast({ variant: 'success', message: `Saved permissions for ${member.name}.` });
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (role: WorkspaceRole) => {
    try {
      onSaved(await workspaceService.updateMemberRole(activeWorkspaceId, member.id, role));
      showToast({ variant: 'success', message: `${member.name} is now ${ROLE_LABEL[role].toLowerCase()}.` });
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    }
  };

  const [copied, setCopied] = useState(false);

  const copyInviteLink = async () => {
    const url = member.token
      ? `${window.location.origin}/register?token=${member.token}&email=${encodeURIComponent(member.email)}`
      : `${window.location.origin}/register?email=${encodeURIComponent(member.email)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      showToast({ variant: 'success', message: `Invite link for ${member.email} copied to clipboard!` });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast({ variant: 'error', message: 'Failed to copy to clipboard.' });
    }
  };

  return (
    <li className="border-b border-olive-100 last:border-0">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <UserAvatar email={member.email} name={member.name} size="lg" />
        <div className="flex-1 min-w-[180px]">
          <div className="text-[14px] font-medium text-olive-950 flex items-center gap-2">
            <span>{member.name}</span>
            {member.isPending && (
              <span className="badge badge-amber text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5">
                Pending Invite
              </span>
            )}
          </div>
          <div className="text-xs text-olive-500">{member.email}</div>
        </div>

        {member.isPending && (
          <button
            className="btn btn-sm btn-ghost gap-1.5 text-olive-700 hover:text-brand-800"
            onClick={() => void copyInviteLink()}
            title="Copy registration link for testing"
            type="button"
          >
            {copied ? <Check size={14} className="text-brand-600" /> : <Copy size={14} />}
            <span className="text-[12px]">{copied ? 'Copied' : 'Copy link'}</span>
          </button>
        )}

        {member.isPending ? (
          <span className="badge badge-slate">{ROLE_LABEL[member.role]}</span>
        ) : editable ? (
          <select
            aria-label={`Role for ${member.name}`}
            className="input-base !h-8 !w-auto !text-[13px]"
            onChange={(e) => void changeRole(e.target.value as WorkspaceRole)}
            value={member.role}
          >
            {catalog.assignableRoles.map((role) => (
              <option key={role} value={role}>{ROLE_LABEL[role]}</option>
            ))}
          </select>
        ) : (
          <span className={`badge ${member.isAdmin ? 'badge-green' : 'badge-slate'}`}>{ROLE_LABEL[member.role]}</span>
        )}

        {!member.isPending && (
          <button
            aria-expanded={open}
            className={`btn btn-sm gap-1.5 transition-all ${
              open
                ? 'btn-primary'
                : 'border border-olive-200 bg-white hover:bg-olive-50 text-olive-800 shadow-2xs'
            }`}
            onClick={() => setOpen((o) => !o)}
            title="Click to view and edit individual permissions"
            type="button"
          >
            <ShieldCheck size={14} className={open ? 'text-white' : 'text-brand-600'} />
            <span className="text-[12px] font-medium">
              {member.isAdmin ? 'All permissions' : `Permissions (${granted}/${catalog.permissions.length})`}
            </span>
            <ChevronDown size={13} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </button>
        )}

        {editable && (
          <button
            aria-label={member.isPending ? `Revoke invitation for ${member.email}` : `Remove ${member.name}`}
            className="icon-btn text-olive-400 hover:text-red-600"
            onClick={() => onRemove(member)}
            title={member.isPending ? 'Revoke invitation' : 'Remove from workspace'}
            type="button"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {open && !member.isPending && (
        <div className="px-4 pb-4 animate-fadeIn">
          {member.isAdmin ? (
            <p className="m-0 rounded-lg bg-olive-50 border border-olive-200 px-3 py-2.5 text-[13px] text-olive-600">
              {ROLE_LABEL[member.role]}s can do everything in this workspace. Change the role to choose individual permissions.
            </p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                {groups.map(([group, perms]) => (
                  <fieldset className="m-0 p-0 border-0" key={group}>
                    <legend className="section-label mb-2">{group}</legend>
                    <div className="grid gap-1">
                      {perms.map((p) => (
                        <label
                          className={`flex items-start gap-2.5 rounded-md px-2 py-1.5 ${editable ? 'cursor-pointer hover:bg-olive-50' : ''}`}
                          key={p.key}
                          title={p.description}
                        >
                          <input
                            checked={draft[p.key]}
                            className="w-4 h-4 mt-0.5 accent-brand-600"
                            disabled={!editable}
                            onChange={(e) => setDraft({ ...draft, [p.key]: e.target.checked })}
                            type="checkbox"
                          />
                          <span>
                            <span className="block text-[13px] text-olive-900">{p.label}</span>
                            <span className="block text-[11px] leading-snug text-olive-500">{p.description}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
              {editable && (
                <div className="flex items-center justify-end gap-2 mt-3">
                  {changed.length > 0 && (
                    <span className="text-xs text-olive-500 mr-auto">
                      {changed.length} unsaved {changed.length === 1 ? 'change' : 'changes'}
                    </span>
                  )}
                  <button className="btn btn-sm btn-ghost" disabled={!changed.length} onClick={() => setDraft(member.permissions)} type="button">
                    Reset
                  </button>
                  <button className="btn btn-sm btn-primary" disabled={!changed.length || saving} onClick={() => void save()} type="button">
                    {saving ? 'Saving…' : 'Save permissions'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </li>
  );
}

function MembersTab({ members, setMembers, catalog }: {
  members: WorkspaceMember[];
  setMembers: (fn: (prev: WorkspaceMember[]) => WorkspaceMember[]) => void;
  catalog: PermissionCatalog;
}): JSX.Element {
  const { access, activeWorkspaceId, activeWorkspace, refresh } = useWorkspace();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('MEMBER');
  const [inviting, setInviting] = useState(false);
  const isAdmin = Boolean(access?.isAdmin);

  const invite = async () => {
    if (!email.trim()) return;
    setInviting(true);
    try {
      const member = await workspaceService.inviteMember(activeWorkspaceId, email.trim(), role);
      setMembers((prev) => [...prev, member]);
      setEmail('');
      if (member.isPending) {
        if (member.token) {
          const url = `${window.location.origin}/register?token=${member.token}&email=${encodeURIComponent(member.email)}`;
          try {
            await navigator.clipboard.writeText(url);
            showToast({
              variant: 'success',
              message: `Invite created & link copied to clipboard!`,
            });
          } catch {
            showToast({
              variant: 'success',
              message: `Invitation email sent to ${member.email}.`,
            });
          }
        } else {
          showToast({
            variant: 'success',
            message: `Invitation email sent to ${member.email}. They can sign up to join.`,
          });
        }
      } else {
        showToast({
          variant: 'success',
          message: `${member.name} joined ${activeWorkspace?.name ?? 'the workspace'}.`,
        });
      }
      void refresh();
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    } finally {
      setInviting(false);
    }
  };

  const remove = async (member: WorkspaceMember) => {
    const isPending = Boolean(member.isPending);
    const ok = await confirm({
      title: isPending ? `Revoke invitation for ${member.email}?` : `Remove ${member.name}?`,
      message: isPending
        ? 'This invitation link will no longer be valid.'
        : 'They lose access to every project and shared prompt in this workspace. Their time entries are kept.',
      confirmText: isPending ? 'Revoke Invite' : 'Remove',
      type: 'danger'
    });
    if (!ok) return;
    try {
      await workspaceService.removeMember(activeWorkspaceId, member.id);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      showToast({
        variant: 'success',
        message: isPending ? `Revoked invitation for ${member.email}.` : `Removed ${member.name}.`,
      });
      void refresh();
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    }
  };

  return (
    <div className="grid gap-4">
      {isAdmin && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <UserPlus size={16} className="text-brand-700" />
            <h3 className="m-0 text-[14px] font-semibold text-olive-950">Add a member</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-olive-400 pointer-events-none" />
              <input
                aria-label="Email address"
                className="input-base !pl-9"
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void invite()}
                placeholder="teammate@company.com"
                type="email"
                value={email}
              />
            </div>
            <select aria-label="Role" className="input-base !w-auto" onChange={(e) => setRole(e.target.value as WorkspaceRole)} value={role}>
              {catalog.assignableRoles.map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
              ))}
            </select>
            <button className="btn btn-primary" disabled={inviting || !email.trim()} onClick={() => void invite()} type="button">
              {inviting ? 'Adding…' : 'Add member'}
            </button>
          </div>
          <p className="field-hint mt-2 mb-0">
            If they don't have an account, an invitation email with a signup link will be sent automatically.
          </p>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 h-11 border-b border-olive-200 bg-olive-50/60">
          <span className="text-[13px] font-medium text-olive-700">{members.length} {members.length === 1 ? 'member' : 'members'}</span>
          {!isAdmin && (
            <span className="inline-flex items-center gap-1.5 text-xs text-olive-500"><Lock size={12} /> Only admins can change access</span>
          )}
        </div>
        <ul className="m-0 p-0 list-none">
          {members.map((member) => (
            <MemberRow
              catalog={catalog}
              editable={isAdmin && member.role !== 'OWNER' && member.id !== access?.memberId}
              key={member.id}
              member={member}
              onRemove={(m) => void remove(m)}
              onSaved={(updated) => setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ project access */

function ProjectAccessTab({ members }: { members: WorkspaceMember[] }): JSX.Element {
  const { activeWorkspaceId, access } = useWorkspace();
  const { showToast } = useToast();
  const [projects, setProjects] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [selected, setSelected] = useState<string>('');
  const [granted, setGranted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    void workspaceService.getWorkspaceDetails(activeWorkspaceId).then((ws) => {
      setProjects(ws.projects);
      setSelected((current) => current || ws.projects[0]?.id || '');
    });
  }, [activeWorkspaceId]);

  const loadAccess = useCallback(async (projectId: string) => {
    if (!projectId) return;
    setLoading(true);
    try {
      const projectMembers = await getProjectMembers(projectId);
      setGranted(new Set(projectMembers.map((m) => m.userId)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccess(selected);
  }, [selected, loadAccess]);

  const toggle = async (member: WorkspaceMember, give: boolean) => {
    setBusy(member.userId);
    try {
      if (give) await addProjectMember(selected, member.userId);
      else await removeProjectMember(selected, member.userId);
      setGranted((prev) => {
        const next = new Set(prev);
        if (give) next.add(member.userId);
        else next.delete(member.userId);
        return next;
      });
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  if (projects.length === 0) {
    return <EmptyState icon={FolderKanban} title="No projects yet" description="Create a project, then choose who can open it." />;
  }

  return (
    <div className="grid md:grid-cols-[240px_1fr] gap-4">
      <nav aria-label="Projects" className="card p-1.5 h-fit">
        {projects.map((p) => (
          <button
            aria-current={p.id === selected}
            className={`flex items-center gap-2.5 w-full px-2.5 h-9 rounded-md text-left text-[13px] ${p.id === selected ? 'bg-brand-50 text-brand-900 font-medium' : 'text-olive-700 hover:bg-olive-50'}`}
            key={p.id}
            onClick={() => setSelected(p.id)}
            type="button"
          >
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: p.color }} />
            <span className="truncate">{p.name}</span>
          </button>
        ))}
      </nav>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-olive-200">
          <h3 className="m-0 text-[14px] font-semibold text-olive-950">Who can open this project</h3>
          <p className="m-0 mt-0.5 text-xs text-olive-500">Admins always have access. Members only see projects ticked here.</p>
        </div>
        {loading ? (
          <div className="p-4 grid gap-2">{[0, 1, 2].map((i) => <div className="skeleton h-10" key={i} />)}</div>
        ) : (
          <ul className="m-0 p-0 list-none">
            {members.map((member) => {
              const has = member.isAdmin || granted.has(member.userId);
              return (
                <li className="flex items-center gap-3 px-4 py-2.5 border-b border-olive-100 last:border-0" key={member.id}>
                  <UserAvatar email={member.email} name={member.name} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-olive-900 truncate">{member.name}</div>
                    <div className="text-[11px] text-olive-500">{ROLE_LABEL[member.role]}</div>
                  </div>
                  {member.isAdmin ? (
                    <span className="inline-flex items-center gap-1 text-xs text-brand-700"><Check size={13} /> Admin access</span>
                  ) : (
                    <label className="inline-flex items-center gap-2 text-[13px] text-olive-700 cursor-pointer">
                      <input
                        checked={has}
                        className="w-4 h-4 accent-brand-600"
                        disabled={!access?.isAdmin || busy === member.userId}
                        onChange={(e) => void toggle(member, e.target.checked)}
                        type="checkbox"
                      />
                      Can open
                    </label>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ page */

/** Settings → Workspace: members, roles, permission flags and project access. */
function WorkspaceSettings(): JSX.Element {
  const { activeWorkspace, activeWorkspaceId, access } = useWorkspace();
  const [tab, setTab] = useState<Tab>('members');
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [catalog, setCatalog] = useState<PermissionCatalog | null>(null);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    void Promise.all([
      workspaceService.listMembers(activeWorkspaceId),
      workspaceService.getPermissionCatalog()
    ]).then(([list, cat]) => {
      setMembers(list);
      setCatalog(cat);
    });
  }, [activeWorkspaceId]);

  if (!catalog || !access) {
    return <div className="grid gap-3">{[0, 1, 2].map((i) => <div className="skeleton h-16" key={i} />)}</div>;
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-600 text-white font-semibold flex items-center justify-center">
            {activeWorkspace?.name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h2 className="m-0 text-[17px] font-semibold tracking-tight text-olive-950">{activeWorkspace?.name}</h2>
            <p className="m-0 text-[13px] text-olive-500">
              Everything here — projects, prompts, insights — is visible only to this workspace's members.
            </p>
          </div>
        </div>
        <div className="flex items-center p-0.5 rounded-lg bg-olive-100 border border-olive-200/70" role="tablist">
          {([['members', 'Members', Users], ['projects', 'Project access', FolderKanban]] as const).map(([key, label, Icon]) => (
            <button
              aria-selected={tab === key}
              className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[13px] transition-colors ${tab === key ? 'bg-white shadow-xs text-olive-950 font-medium' : 'text-olive-500 hover:text-olive-800'}`}
              key={key}
              onClick={() => setTab(key)}
              role="tab"
              type="button"
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'members' ? (
        <MembersTab catalog={catalog} members={members} setMembers={setMembers} />
      ) : (
        <ProjectAccessTab members={members} />
      )}
    </div>
  );
}

export default WorkspaceSettings;
