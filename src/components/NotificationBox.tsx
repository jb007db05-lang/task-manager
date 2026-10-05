import React from 'react';
import { Bell, MessageCircle, UserPlus, X, ExternalLink, Clock } from 'lucide-react';

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
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
  onNotificationClick: (notification: Notification) => void;
}

const NotificationBox: React.FC<NotificationBoxProps> = ({
  notifications,
  onClose,
  onMarkAsRead,
  onClearAll,
  onNotificationClick,
}) => {
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div
      className="absolute right-0 mt-3 w-[380px] bg-white  rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)]  border border-olive-200  overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300"
      style={{ zIndex: 9999 }}
    >
      {/* Header */}
      <div className="px-5 py-4 bg-olive-50  border-b border-olive-200  flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-olive-600 " />
          <h3 className="text-sm font-bold text-olive-950  uppercase tracking-wider">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-olive-100  text-olive-600  text-[11px] font-bold rounded-full">
              {unreadCount} New
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-[11px] font-bold text-olive-500 hover:text-olive-600  transition-colors uppercase tracking-tight"
            >
              Clear All
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-olive-400 hover:text-olive-600  transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-[480px] overflow-y-auto custom-scrollbar">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-16 h-16 bg-olive-100  rounded-full flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-olive-300 " />
            </div>
            <p className="text-olive-950  font-bold mb-1">All caught up!</p>
            <p className="text-olive-500  text-sm">
              No new notifications at the moment.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-olive-100 ">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => onNotificationClick(notification)}
                className={[
                  'p-5 transition-all cursor-pointer relative group',
                  notification.isRead
                    ? 'bg-transparent opacity-80'
                    : 'bg-olive-50/30',
                  'hover:bg-olive-50',
                ].join(' ')}
              >
                {!notification.isRead && (
                  <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-olive-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.6)]" />
                )}

                <div className="flex gap-4">
                  <div className={[
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm',
                    notification.type === 'message' ? 'bg-olive-100 text-olive-600' :
                    notification.type === 'team_join' ? 'bg-green-100 text-green-600' :
                    'bg-olive-100 text-olive-600',
                  ].join(' ')}>
                    {notification.type === 'message' ? <MessageCircle size={20} /> :
                      notification.type === 'team_join' ? <UserPlus size={20} /> :
                        <Bell size={20} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-sm font-bold text-olive-950  leading-tight">
                        {notification.title}
                      </h4>
                      <div className="flex items-center gap-1 text-[11px] text-olive-400  font-medium shrink-0">
                        <Clock size={10} />
                        {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <p className="text-xs text-olive-600  line-clamp-2 leading-relaxed">
                      {notification.message}
                    </p>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-olive-500  uppercase tracking-widest flex items-center gap-1">
                        View details <ExternalLink size={10} />
                      </span>
                      {!notification.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkAsRead(notification.id);
                          }}
                          className="text-[11px] font-bold text-olive-400 hover:text-olive-600  transition-colors uppercase"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-5 py-3 bg-olive-50  border-t border-olive-200  text-center">
          <button
            onClick={onClose}
            className="text-xs font-bold text-olive-500 hover:text-olive-700   transition-colors"
          >
            Close Notifications
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationBox;
