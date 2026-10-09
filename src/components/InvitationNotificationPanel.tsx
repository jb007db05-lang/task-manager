import { useState, useEffect, useCallback } from 'react';
import { Check, X, Users } from 'lucide-react';
import socketService, { SocketEvents } from '@/services/socket';
import {
  getMyInvitations,
  acceptInvitation,
  rejectInvitation,
  type PendingInvitation,
} from '@/services/invitations';

interface AdminNotification {
  id: string;
  kind: 'accepted' | 'rejected';
  projectName: string;
  personName: string;
  personEmail: string;
  timestamp: Date;
}

export const formatRelative = (date?: Date | string): string => {
  if (!date) return 'Just now';
  const d = date instanceof Date ? date : new Date(date);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export interface InvitationInbox {
  myInvitations: PendingInvitation[];
  adminNotifications: AdminNotification[];
  actioning: string | null;
  count: number;
  accept: (invitation: PendingInvitation) => Promise<void>;
  reject: (invitation: PendingInvitation) => Promise<void>;
  dismissUpdate: (id: string) => void;
  clearAll: () => void;
}

/** Pending invitations for the current user plus live accept/decline updates for invites they sent. */
export function useInvitationInbox(): InvitationInbox {
  const [myInvitations, setMyInvitations] = useState<PendingInvitation[]>([]);
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [actioning, setActioning] = useState<string | null>(null);

  const loadMyInvitations = useCallback(async () => {
    try {
      setMyInvitations(await getMyInvitations());
    } catch {
      // not critical
    }
  }, []);

  useEffect(() => {
    void loadMyInvitations();

    const onReceived = (data: PendingInvitation) => {
      setMyInvitations((prev) => (prev.some((inv) => inv.id === data.id) ? prev : [data, ...prev]));
    };
    const onAccepted = (data: { projectName: string; acceptedBy: string; acceptedByEmail: string }) => {
      setAdminNotifications((prev) => [
        { id: `${Date.now()}`, kind: 'accepted', projectName: data.projectName, personName: data.acceptedBy, personEmail: data.acceptedByEmail, timestamp: new Date() },
        ...prev,
      ]);
    };
    const onRejected = (data: { projectName: string; rejectedBy: string; rejectedByEmail: string }) => {
      setAdminNotifications((prev) => [
        { id: `${Date.now()}`, kind: 'rejected', projectName: data.projectName, personName: data.rejectedBy, personEmail: data.rejectedByEmail, timestamp: new Date() },
        ...prev,
      ]);
    };

    socketService.on(SocketEvents.INVITATION_RECEIVED, onReceived);
    socketService.on(SocketEvents.INVITATION_ACCEPTED, onAccepted);
    socketService.on(SocketEvents.INVITATION_REJECTED, onRejected);
    return () => {
      socketService.off(SocketEvents.INVITATION_RECEIVED, onReceived);
      socketService.off(SocketEvents.INVITATION_ACCEPTED, onAccepted);
      socketService.off(SocketEvents.INVITATION_REJECTED, onRejected);
    };
  }, [loadMyInvitations]);

  const respond = async (invitation: PendingInvitation, action: typeof acceptInvitation) => {
    setActioning(invitation.id);
    try {
      await action(invitation.token);
      setMyInvitations((prev) => prev.filter((inv) => inv.id !== invitation.id));
    } catch {
      // user can retry
    } finally {
      setActioning(null);
    }
  };

  return {
    myInvitations,
    adminNotifications,
    actioning,
    count: myInvitations.length + adminNotifications.length,
    accept: (invitation) => respond(invitation, acceptInvitation),
    reject: (invitation) => respond(invitation, rejectInvitation),
    dismissUpdate: (id) => setAdminNotifications((prev) => prev.filter((n) => n.id !== id)),
    clearAll: () => setAdminNotifications([]),
  };
}

/** Invitation rows rendered inside the notification center. */
function InvitationNotificationPanel({ inbox }: { inbox: InvitationInbox }): JSX.Element | null {
  const { myInvitations, adminNotifications, actioning, accept, reject, dismissUpdate } = inbox;
  if (myInvitations.length === 0 && adminNotifications.length === 0) return null;

  return (
    <div className="border-b border-olive-100">
      {myInvitations.map((inv) => (
        <div key={inv.id} className="flex gap-3 px-4 py-3.5 bg-brand-50/40">
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
            <Users size={15} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-olive-700 leading-snug m-0">
              <span className="font-medium text-olive-900">{inv.inviterName}</span> invited you to{' '}
              <span className="font-medium text-olive-900">{inv.projectName}</span> as {inv.role.toLowerCase()}
            </p>
            <p className="text-xs text-olive-500 mt-0.5 mb-2.5">{formatRelative(inv.createdAt)}</p>
            <div className="flex gap-2">
              <button
                className="btn btn-sm btn-primary"
                disabled={actioning === inv.id}
                onClick={() => void accept(inv)}
                type="button"
              >
                <Check size={14} />
                {actioning === inv.id ? 'Working…' : 'Accept'}
              </button>
              <button
                className="btn btn-sm btn-secondary"
                disabled={actioning === inv.id}
                onClick={() => void reject(inv)}
                type="button"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      ))}
      {adminNotifications.map((n) => (
        <div key={n.id} className="group flex gap-3 px-4 py-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              n.kind === 'accepted' ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-600'
            }`}
          >
            {n.kind === 'accepted' ? <Check size={15} /> : <X size={15} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-olive-700 leading-snug m-0">
              <span className="font-medium text-olive-900">{n.personName}</span>{' '}
              {n.kind === 'accepted' ? 'joined' : 'declined the invitation to'}{' '}
              <span className="font-medium text-olive-900">{n.projectName}</span>
            </p>
            <p className="text-xs text-olive-500 mt-0.5 m-0">{formatRelative(n.timestamp)}</p>
          </div>
          <button
            aria-label="Dismiss"
            className="icon-btn !w-6 !h-6 opacity-0 group-hover:opacity-100"
            onClick={() => dismissUpdate(n.id)}
            type="button"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

export default InvitationNotificationPanel;
