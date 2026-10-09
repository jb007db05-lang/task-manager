import React from 'react';
import { Bell, MessageCircle, UserPlus } from 'lucide-react';
import InvitationNotificationPanel, { formatRelative, type InvitationInbox } from './InvitationNotificationPanel';

export interface Notification {
  id: string;
  type: 'message' | 'team_join' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  link?: string;
  projectId?: string;
}

interface NotificationBoxProps {
  notifications: Notification[];
  inbox?: InvitationInbox;
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
  onNotificationClick: (notification: Notification) => void;
}

const typeIcon = {
  message: MessageCircle,
  team_join: UserPlus,
  system: Bell,
};

const NotificationBox: React.FC<NotificationBoxProps> = ({
  notifications,
  inbox,
  onMarkAsRead,
  onClearAll,
  onNotificationClick,
}) => {
  const unreadCount = notifications.filter((n) => !n.isRead).length + (inbox?.count ?? 0);
  const isEmpty = notifications.length === 0 && (inbox?.count ?? 0) === 0;

  return (
    <div className="absolute right-0 top-full mt-2 w-[380px] max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-olive-200 overflow-hidden animate-modalIn z-[60]">
      <div className="flex items-center justify-between px-4 h-12 border-b border-olive-100">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-olive-900 m-0">Notifications</h3>
          {unreadCount > 0 && <span className="badge badge-green !h-5 !px-1.5 text-[11px]">{unreadCount} new</span>}
        </div>
        {!isEmpty && (
          <button
            onClick={() => {
              onClearAll();
              inbox?.clearAll();
            }}
            className="text-xs font-medium text-olive-500 hover:text-olive-900 transition-colors"
            type="button"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="max-h-[460px] overflow-y-auto custom-scrollbar">
        {inbox && <InvitationNotificationPanel inbox={inbox} />}

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-10 h-10 rounded-full bg-olive-100 text-olive-400 flex items-center justify-center mb-3">
              <Bell size={18} />
            </div>
            <p className="text-sm font-medium text-olive-900 m-0">You're all caught up</p>
            <p className="text-xs text-olive-500 mt-1 m-0">New messages and team updates will appear here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-olive-100 m-0 p-0 list-none">
            {notifications.map((notification) => {
              const Icon = typeIcon[notification.type] ?? Bell;
              return (
                <li key={notification.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onNotificationClick(notification)}
                    onKeyDown={(e) => e.key === 'Enter' && onNotificationClick(notification)}
                    className="group relative flex gap-3 px-4 py-3 hover:bg-olive-50 transition-colors"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        notification.type === 'team_join' ? 'bg-brand-50 text-brand-700' : 'bg-olive-100 text-olive-600'
                      }`}
                    >
                      <Icon size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <h4 className={`text-[13px] m-0 truncate ${notification.isRead ? 'font-normal text-olive-700' : 'font-medium text-olive-900'}`}>
                          {notification.title}
                        </h4>
                        <span className="text-[11px] text-olive-400 shrink-0">{formatRelative(notification.timestamp)}</span>
                      </div>
                      <p className="text-xs text-olive-500 line-clamp-2 m-0 mt-0.5 leading-relaxed">{notification.message}</p>
                      {!notification.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkAsRead(notification.id);
                          }}
                          className="mt-1.5 text-[11px] font-medium text-brand-700 hover:text-brand-800"
                          type="button"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                    {!notification.isRead && <span className="absolute right-4 bottom-4 w-1.5 h-1.5 rounded-full bg-brand-500" />}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default NotificationBox;
