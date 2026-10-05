import React from 'react';
import { Bell } from 'lucide-react';
import UserAvatar from './UserAvatar';
import NotificationBox, { Notification } from './NotificationBox';

interface TopbarProps {
  title: string;
  breadcrumbs?: React.ReactNode;
  user: { name: string | null; email: string };
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
  user,
  notifications,
  isNotificationsOpen,
  onNotificationsToggle,
  onNotificationsClose,
  onMarkAsRead,
  onClearAll,
  onNotificationClick,
  rightContent
}) => {
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="relative z-50 flex items-center justify-between gap-4 px-6 h-[52px] shrink-0 bg-white border-b border-gray-200">
      {/* Left — title + breadcrumbs */}
      <div className="flex items-center gap-1.5 min-w-0">
        {breadcrumbs ? (
          <div className="flex items-center gap-1 text-[0.75rem] text-gray-400 min-w-0">
            {breadcrumbs}
            <span className="text-gray-300 mx-1">/</span>
            <span className="text-gray-700 font-medium truncate">{title}</span>
          </div>
        ) : (
          <h1 className="text-[0.875rem] font-semibold text-gray-900 truncate">{title}</h1>
        )}
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-3 shrink-0">
        {rightContent}

        {/* Bell */}
        <div className="relative">
          <button
            className="flex items-center justify-center w-7 h-7 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            onClick={onNotificationsToggle}
            type="button"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-800 text-[11px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {isNotificationsOpen && (
            <NotificationBox
              notifications={notifications}
              onClose={onNotificationsClose}
              onMarkAsRead={onMarkAsRead}
              onClearAll={onClearAll}
              onNotificationClick={onNotificationClick}
            />
          )}
        </div>

        {/* User */}
        <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
          <UserAvatar name={user.name} email={user.email} size="sm" showTooltip={false} />
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-[0.75rem] font-medium text-gray-800">{user.name || 'User'}</span>
            <span className="text-[11px] text-gray-400">{user.email}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;