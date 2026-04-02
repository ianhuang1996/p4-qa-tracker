import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, AlertCircle, UserPlus, MessageSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Notification } from '../types';
import { useNotifications } from '../hooks/useNotifications';
import { User as FirebaseUser } from 'firebase/auth';

interface NotificationCenterProps {
  user: FirebaseUser | null;
  onItemClick: (itemId: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ user, onItemClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications(user);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'status_change': return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case 'assignment': return <UserPlus className="w-4 h-4 text-blue-500" />;
      case 'comment': return <MessageSquare className="w-4 h-4 text-teal-500" />;
      default: return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getMessage = (notif: Notification) => {
    switch (notif.type) {
      case 'status_change':
        return (
          <span>
            <span className="font-bold">{notif.fromUserName}</span> 將狀態從 
            <span className="mx-1 px-1.5 py-0.5 bg-gray-100 rounded text-xs">{notif.oldValue}</span> 變更為 
            <span className="mx-1 px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-bold">{notif.newValue}</span>
          </span>
        );
      case 'assignment':
        return (
          <span>
            <span className="font-bold">{notif.fromUserName}</span> 將此項目指派給了您
          </span>
        );
      case 'comment':
        return (
          <span>
            <span className="font-bold">{notif.fromUserName}</span> 在此項目發表了評論
          </span>
        );
      default:
        return <span>新通知</span>;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
          >
            <div className="p-4 border-bottom border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900">通知中心</h3>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsRead()}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> 全部已讀
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Bell className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>目前沒有通知</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer relative group ${!notif.isRead ? 'bg-blue-50/30' : ''}`}
                      onClick={() => {
                        onItemClick(notif.itemId);
                        if (!notif.isRead) markAsRead(notif.id);
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex gap-3">
                        <div className="mt-1 flex-shrink-0">
                          {getIcon(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 leading-snug mb-1">
                            {getMessage(notif)}
                          </p>
                          <p className="text-xs text-gray-500 font-medium truncate mb-1">
                            項目: {notif.itemTitle}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {formatDistanceToNow(notif.createdAt, { addSuffix: true, locale: zhTW })}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notif.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {!notif.isRead && (
                        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-full" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {notifications.length > 0 && (
              <div className="p-3 bg-gray-50/50 border-top border-gray-100 text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                  顯示最近 {notifications.length} 則通知
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
