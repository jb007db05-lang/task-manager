import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bell,
  BellDot,
  CheckCircle,
  XCircle,
  Clock,
  X,
  Users,
  ChevronRight,
} from 'lucide-react';
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

const formatRelative = (date?: Date | string): string => {
  if (!date) return 'Just now';
  const d = date instanceof Date ? date : new Date(date);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

function InvitationNotificationPanel() {
  const [open, setOpen] = useState(false);
  const [myInvitations, setMyInvitations] = useState<PendingInvitation[]>([]);
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [actioning, setActioning] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const totalCount = myInvitations.length + adminNotifications.length;

  const loadMyInvitations = useCallback(async () => {
    try {
      const invitations = await getMyInvitations();
      setMyInvitations(invitations);
    } catch {
      // silently fail — not critical
    }
  }, []);

  useEffect(() => {
    void loadMyInvitations();

    // Real-time: someone sent me an invite
    const onReceived = (data: PendingInvitation) => {
      setMyInvitations((prev) => {
        if (prev.some((inv) => inv.id === data.id)) return prev;
        return [data, ...prev];
      });
    };

    // Real-time: someone accepted my invite (admin notification)
    const onAccepted = (data: {
      projectId: string;
      projectName: string;
      acceptedBy: string;
      acceptedByEmail: string;
    }) => {
      setAdminNotifications((prev) => [
        {
          id: `${Date.now()}`,
          kind: 'accepted',
          projectName: data.projectName,
          personName: data.acceptedBy,
          personEmail: data.acceptedByEmail,
          timestamp: new Date(),
        },
        ...prev,
      ]);
    };

    // Real-time: someone rejected my invite
    const onRejected = (data: {
      projectId: string;
      projectName: string;
      rejectedBy: string;
      rejectedByEmail: string;
    }) => {
      setAdminNotifications((prev) => [
        {
          id: `${Date.now()}`,
          kind: 'rejected',
          projectName: data.projectName,
          personName: data.rejectedBy,
          personEmail: data.rejectedByEmail,
          timestamp: new Date(),
        },
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

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleAccept = async (invitation: PendingInvitation) => {
    setActioning(invitation.id);
    try {
      await acceptInvitation(invitation.token);
      setMyInvitations((prev) => prev.filter((inv) => inv.id !== invitation.id));
    } catch {
      // show nothing — user can retry
    } finally {
      setActioning(null);
    }
  };

  const handleReject = async (invitation: PendingInvitation) => {
    setActioning(invitation.id);
    try {
      await rejectInvitation(invitation.token);
      setMyInvitations((prev) => prev.filter((inv) => inv.id !== invitation.id));
    } catch {
      // show nothing — user can retry
    } finally {
      setActioning(null);
    }
  };

  const clearAdminNotification = (id: string) => {
    setAdminNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const hasNotifications = totalCount > 0;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        className="relative flex items-center justify-center w-9 h-9 rounded-xl border border-olive-200/80 bg-white/80 text-olive-700 hover:bg-olive-50 hover:text-olive-900 transition-all duration-200 shadow-sm"
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        type="button"
      >
        {hasNotifications ? (
          <BellDot size={17} className="text-olive-800" />
        ) : (
          <Bell size={17} />
        )}
        {hasNotifications ? (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow">
            {totalCount > 9 ? '9+' : totalCount}
          </span>
        ) : null}
      </button>

      {/* Dropdown panel */}
      {open ? (
        <div className="absolute right-0 top-full mt-2 w-[380px] max-h-[520px] bg-white rounded-2xl shadow-2xl border border-olive-200/80 z-50 flex flex-col overflow-hidden animate-in slide-in-from-top-1 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-olive-100 shrink-0">
            <h3 className="text-sm font-bold text-olive-950 flex items-center gap-2">
              <Bell size={15} className="text-olive-700" />
              Notifications
            </h3>
            <button
              className="p-1.5 rounded-lg text-olive-400 hover:text-olive-700 hover:bg-olive-50 transition-colors"
              onClick={() => setOpen(false)}
              type="button"
            >
              <X size={14} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            {/* My pending invitations */}
            {myInvitations.length > 0 ? (
              <div>
                <div className="px-4 pt-3 pb-1">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-olive-500">
                    Project Invitations
                  </span>
                </div>
                {myInvitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="mx-3 mb-2 rounded-xl border border-olive-200/60 bg-olive-50/40 p-3.5"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-olive-100 to-olive-200/60 flex items-center justify-center shrink-0">
                        <Users size={14} className="text-olive-700" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.84rem] font-bold text-olive-950 leading-tight">
                          {inv.inviterName}{' '}
                          <span className="font-normal text-olive-600">invited you to</span>
                        </p>
                        <p className="text-[0.92rem] font-extrabold text-olive-900 mt-0.5">
                          {inv.projectName}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[11px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-olive-100 text-olive-700">
                            {inv.role}
                          </span>
                          <span className="text-[0.72rem] text-olive-400 flex items-center gap-1">
                            <Clock size={10} />
                            {formatRelative(inv.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-olive-900 text-white text-[0.78rem] font-bold disabled:opacity-50 transition-all hover:bg-olive-800 active:scale-95"
                        disabled={actioning === inv.id}
                        onClick={() => void handleAccept(inv)}
                        type="button"
                      >
                        <CheckCircle size={13} />
                        {actioning === inv.id ? 'Accepting…' : 'Accept'}
                      </button>
                      <button
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-red-200 bg-white text-red-600 text-[0.78rem] font-bold disabled:opacity-50 transition-all hover:bg-red-50 active:scale-95"
                        disabled={actioning === inv.id}
                        onClick={() => void handleReject(inv)}
                        type="button"
                      >
                        <XCircle size={13} />
                        {actioning === inv.id ? 'Declining…' : 'Decline'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Admin notifications (accepted/rejected) */}
            {adminNotifications.length > 0 ? (
              <div>
                <div className="px-4 pt-3 pb-1">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-olive-500">
                    Invitation Updates
                  </span>
                </div>
                {adminNotifications.map((n) => (
                  <div
                    key={n.id}
                    className={`mx-3 mb-2 rounded-xl border p-3.5 flex items-start gap-3 ${
                      n.kind === 'accepted'
                        ? 'border-green-200/60 bg-green-50/40'
                        : 'border-red-200/60 bg-red-50/30'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        n.kind === 'accepted' ? 'bg-green-100' : 'bg-red-100'
                      }`}
                    >
                      {n.kind === 'accepted' ? (
                        <CheckCircle size={14} className="text-green-600" />
                      ) : (
                        <XCircle size={14} className="text-red-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.84rem] font-bold text-olive-950 leading-tight">
                        {n.personName}
                      </p>
                      <p className="text-[0.78rem] text-olive-600 mt-0.5">
                        {n.kind === 'accepted' ? 'accepted' : 'declined'} invitation to{' '}
                        <strong>{n.projectName}</strong>
                      </p>
                      <p className="text-[0.70rem] text-olive-400 flex items-center gap-1 mt-1">
                        <Clock size={10} />
                        {formatRelative(n.timestamp)}
                      </p>
                    </div>
                    <button
                      className="p-1 rounded text-olive-300 hover:text-olive-600 transition-colors shrink-0"
                      onClick={() => clearAdminNotification(n.id)}
                      type="button"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Empty state */}
            {totalCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <div className="w-12 h-12 rounded-2xl bg-olive-50 flex items-center justify-center mb-3 border border-olive-100">
                  <Bell size={20} className="text-olive-300" />
                </div>
                <p className="text-[0.84rem] font-semibold text-olive-700">All caught up</p>
                <p className="text-[0.76rem] text-olive-400 mt-1">
                  No pending invitations or updates
                </p>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          {totalCount > 0 ? (
            <div className="border-t border-olive-100 px-4 py-2.5 shrink-0">
              <button
                className="text-[0.75rem] text-olive-500 hover:text-olive-800 flex items-center gap-1 transition-colors"
                onClick={() => {
                  setAdminNotifications([]);
                  setMyInvitations([]);
                }}
                type="button"
              >
                Clear all
                <ChevronRight size={12} />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default InvitationNotificationPanel;
