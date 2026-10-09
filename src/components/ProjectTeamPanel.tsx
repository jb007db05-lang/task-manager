import UserAvatar from './UserAvatar';
import { useState, useEffect, useCallback } from 'react';
import { LogOut, Shield, Trash2, UserPlus, Users, Loader2, Mail, Clock, RotateCcw } from 'lucide-react';
import type { ProjectMember } from '@/types/project';
import { getProjectInvitations, revokeInvitation, type ProjectInvitation } from '@/services/invitations';

interface ProjectTeamPanelProps {
  canManageTeam: boolean;
  currentUserId: string | null;
  isMutating: boolean;
  members: ProjectMember[];
  projectId: string;
  onInviteMember: (email: string, role: 'ADMIN' | 'MEMBER') => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
  onLeaveProject: () => Promise<void>;
}

const formatRelative = (date?: string): string => {
  if (!date) return '';
  const d = new Date(date);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

function ProjectTeamPanel({
  canManageTeam,
  currentUserId,
  isMutating,
  members,
  projectId,
  onInviteMember,
  onRemoveMember,
  onLeaveProject
}: ProjectTeamPanelProps): JSX.Element {
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [inviteLoading, setInviteLoading] = useState<boolean>(false);
  const [pendingInvitations, setPendingInvitations] = useState<ProjectInvitation[]>([]);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const loadPendingInvitations = useCallback(async () => {
    if (!canManageTeam || !projectId) return;
    try {
      const invitations = await getProjectInvitations(projectId);
      setPendingInvitations(invitations);
    } catch {
      // silently fail
    }
  }, [canManageTeam, projectId]);

  useEffect(() => {
    void loadPendingInvitations();
  }, [loadPendingInvitations]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    try {
      await onInviteMember(inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      // Reload pending invitations list
      await loadPendingInvitations();
    } catch {
      // Handled by parent error state/toast
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRevoke = async (invitation: ProjectInvitation) => {
    setRevokingId(invitation.id);
    try {
      await revokeInvitation(invitation.id);
      setPendingInvitations((prev) => prev.filter((inv) => inv.id !== invitation.id));
    } catch {
      // silently fail
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <section className="grid">
      {canManageTeam ? (
        <form onSubmit={handleSendInvite} className="px-6 py-5 border-b border-olive-100">
          <label className="field-label" htmlFor="invite-email">Invite by email</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="invite-email"
              className="input-base flex-1"
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="name@company.com"
              required
              type="email"
              value={inviteEmail}
            />
            <select
              aria-label="Role"
              className="input-base sm:!w-32"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER')}
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button className="btn btn-primary" disabled={inviteLoading || isMutating} type="submit">
              {inviteLoading ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
              Send invite
            </button>
          </div>
          <p className="field-hint mb-0">People with an account get an in-app invitation; others receive an email to sign up and join.</p>
        </form>
      ) : (
        <p className="m-0 px-6 py-4 border-b border-olive-100 text-[13px] text-olive-500">
          Only project admins can invite or remove members.
        </p>
      )}

      <div className="px-6 py-5 grid gap-5">
        <div>
          <h4 className="section-label m-0 mb-2 flex items-center gap-1.5">
            <Users size={13} />
            Members · {members.length}
          </h4>
          <ul className="m-0 p-0 list-none rounded-xl border border-olive-200 divide-y divide-olive-100 max-h-[18rem] overflow-y-auto">
            {members.map((member) => {
              const isAdmin = member.role === 'ADMIN';
              const isCurrentUser = member.userId === currentUserId;
              const email = member.user?.email ?? '';
              return (
                <li key={member.userId} className="group flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar name={member.user?.name ?? null} email={email || '?'} size="md" showTooltip={false} />
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-olive-950 truncate flex items-center gap-1.5">
                        {member.user?.name || email || 'Unknown member'}
                        {isCurrentUser && <span className="text-olive-400 font-normal">(you)</span>}
                      </div>
                      {member.user?.name && <div className="text-xs text-olive-500 truncate">{email}</div>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`badge ${isAdmin ? 'badge-green' : 'badge-slate'} !h-5 !text-[11px]`}>
                      {isAdmin && <Shield size={10} />}
                      {isAdmin ? 'Admin' : 'Member'}
                    </span>
                    {isCurrentUser ? (
                      <button
                        className="btn btn-sm btn-ghost !h-7 !text-red-600 hover:!bg-red-50"
                        disabled={isMutating}
                        onClick={() => void onLeaveProject()}
                        type="button"
                      >
                        <LogOut size={13} />
                        Leave
                      </button>
                    ) : null}
                    {canManageTeam && !isCurrentUser ? (
                      <button
                        aria-label="Remove member"
                        className="icon-btn !w-7 !h-7 hover:!text-red-600 hover:!bg-red-50 disabled:opacity-30 disabled:hover:!bg-transparent disabled:hover:!text-olive-500"
                        disabled={isMutating || isAdmin}
                        onClick={() => void onRemoveMember(member.userId)}
                        title={isAdmin ? 'Project admins cannot be removed' : 'Remove member'}
                        type="button"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {canManageTeam && pendingInvitations.length > 0 ? (
          <div>
            <h4 className="section-label m-0 mb-2 flex items-center gap-1.5">
              <Clock size={13} />
              Pending · {pendingInvitations.length}
            </h4>
            <ul className="m-0 p-0 list-none rounded-xl border border-dashed border-olive-300 divide-y divide-olive-100">
              {pendingInvitations.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-olive-100 flex items-center justify-center shrink-0">
                      <Mail size={14} className="text-olive-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] text-olive-800 truncate">{inv.email}</div>
                      <div className="text-xs text-olive-500">
                        {inv.role === 'ADMIN' ? 'Admin' : 'Member'}
                        {inv.createdAt ? ` · invited ${formatRelative(inv.createdAt)}` : ''}
                      </div>
                    </div>
                  </div>
                  <button
                    className="btn btn-sm btn-ghost !h-7"
                    disabled={revokingId === inv.id}
                    onClick={() => void handleRevoke(inv)}
                    type="button"
                  >
                    {revokingId === inv.id ? <RotateCcw size={13} className="animate-spin" /> : null}
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default ProjectTeamPanel;
