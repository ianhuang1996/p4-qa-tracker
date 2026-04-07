import React, { useState } from 'react';
import { Bell, Check, Trash2, AlertCircle, UserPlus, MessageSquare, X, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Notification } from '../types';
import { useNotifications } from '../hooks/useNotifications';
import { User as FirebaseUser } from 'firebase/auth';

type FilterType = 'all' | 'status_change' | 'assignment' | 'comment';

interface NotificationCenterProps {
  user: FirebaseUser | null;
  onItemClick: (itemId: string) => void;
  onClose?: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ user, onItemClick, onClose }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications(user);
  const [filter, setFilter] = useState<FilterType>('all');

  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.type === filter);

  const statusCount = notifications.filter(n => !n.isRead && n.type === 'status_change').length;
  const assignmentCount = notifications.filter(n => !n.isRead && n.type === 'assignment').length;
  const commentCount = notifications.filter(n => !n.isRead && n.type === 'comment').length;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'status_change': return <AlertCircle size={16} className="text-amber-500" />;
      case 'assignment': return <UserPlus size={16} className="text-blue-500" />;
      case 'comment': return <MessageSquare size={16} className="text-teal-500" />;
      default: return <Bell size={16} className="text-gray-500" />;
    }
  };

  const getMessage = (notif: Notification) => {
    switch (notif.type) {
      case 'status_change':
        return (
          <span>
            <span className="font-bold">{notif.fromUserName}</span> 將狀態從{' '}
            <span className="px-1 py-0.5 bg-gray-100 rounded text-[10px]">{notif.oldValue}</span> 變更為{' '}
            <span className="px-1 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold">{notif.newValue}</span>
          </span>
        );
      case 'assignment':
        return (
          <span>
            <span className="font-bold">{notif.fromUserName}</span> 將此項目指派給了你
          </span>
        );
      case 'comment':
        return (
          <span>
            <span className="font-bold">{notif.fromUserName}</span> 發表了評論
            {notif.newValue && <span className="text-gray-400 ml-1">「{notif.newValue.substring(0, 30)}...」</span>}
          </span>
        );
      default:
        return <span>新通知</span>;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">通知</h3>
          {unreadCount > 0 && <p className="text-[10px] text-gray-400 mt-0.5">{unreadCount} 則未讀</p>}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead()}
              className="text-[10px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-lg"
            >
              <Check size={10} /> 全部已讀
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100 bg-white">
        {([
          { key: 'all' as FilterType, label: '全部', count: unreadCount },
          { key: 'status_change' as FilterType, label: '狀態', count: statusCount },
          { key: 'assignment' as FilterType, label: '指派', count: assignmentCount },
          { key: 'comment' as FilterType, label: '留言', count: commentCount },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 ${
              filter === tab.key ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-[9px] px-1 rounded-full ${
                filter === tab.key ? 'bg-white/20' : 'bg-red-100 text-red-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Bell size={32} className="mx-auto mb-2 opacity-20" />
            <p className="text-xs">{filter === 'all' ? '目前沒有通知' : '此類型沒有通知'}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((notif) => (
              <div
                key={notif.id}
                className={`px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer relative group ${!notif.isRead ? 'bg-blue-50/30' : ''}`}
                onClick={() => {
                  onItemClick(notif.itemId);
                  if (!notif.isRead) markAsRead(notif.id);
                }}
              >
                {!notif.isRead && (
                  <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-full" />
                )}
                <div className="flex gap-3">
                  <div className="mt-0.5 shrink-0">{getIcon(notif.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-900 leading-snug mb-0.5">{getMessage(notif)}</p>
                    <p className="text-[10px] text-gray-500 font-medium truncate">{notif.itemTitle}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {formatDistanceToNow(notif.createdAt, { addSuffix: true, locale: zhTW })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
