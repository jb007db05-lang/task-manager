import React, { useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import NotificationBox, { Notification } from './NotificationBox';
import { useInvitationInbox } from './InvitationNotificationPanel';

interface TopbarProps {
  title: string;
  breadcrumbs?: React.ReactNode;
  user?: { name: string | null; email: string };
  notifications: Notification[];
  isNotificationsOpen: boolean;
  onNotificationsToggle: () => void;
  onNotificationsClose: () => void;
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
  onNotificationClick: (notification: Notification) => void;
  rightContent?: React.ReactNode;
}

const Topbar: React.FC<TopbarProps> = ({
  title,
  breadcrumbs,
  notifications,
  isNotificationsOpen,
  onNotificationsToggle,
  onNotificationsClose,
  onMarkAsRead,
  onClearAll,
  onNotificationClick,
  rightContent
}) => {
  const inbox = useInvitationInbox();
  const bellRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter(n => !n.isRead).length + inbox.count;

  useEffect(() => {
    if (!isNotificationsOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) onNotificationsClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onNotificationsClose();
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [isNotificationsOpen, onNotificationsClose]);

  return (
    <header className="relative z-40 flex items-center justify-between gap-4 px-6 h-14 shrink-0 bg-white/85 backdrop-blur border-b border-olive-200">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 min-w-0 text-[13px]">
        {breadcrumbs ? (
          <>
            <div className="flex items-center gap-1.5 text-olive-500 min-w-0">{breadcrumbs}</div>
            <span className="text-olive-300">/</span>
            <span className="text-olive-900 font-medium truncate">{title}</span>
          </>
        ) : (
          <h1 className="text-sm font-medium text-olive-900 truncate m-0">{title}</h1>
        )}
      </nav>

      <div className="flex items-center gap-2 shrink-0">
        {rightContent}

        <div className="relative" ref={bellRef}>
          <button
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            aria-expanded={isNotificationsOpen}
            className={`relative icon-btn !w-9 !h-9 ${isNotificationsOpen ? 'bg-olive-100 text-olive-900' : ''}`}
            onClick={onNotificationsToggle}
            type="button"
          >
            <Bell size={17} strokeWidth={1.8} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[15px] h-[15px] px-1 rounded-full bg-brand-600 ring-2 ring-white text-[10px] font-semibold leading-[15px] text-white text-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {isNotificationsOpen && (
            <NotificationBox
              inbox={inbox}
              notifications={notifications}
              onClose={onNotificationsClose}
              onMarkAsRead={onMarkAsRead}
              onClearAll={onClearAll}
              onNotificationClick={onNotificationClick}
            />
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
