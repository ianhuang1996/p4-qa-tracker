import React, { useState } from 'react';
import { LayoutDashboard, CheckSquare, Bug, ChevronLeft, ChevronRight, Menu, X, LogOut, Moon, Sun, Bell } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { AppPage } from '../types';
import { getAvatarColor } from '../utils/qaUtils';

interface SidebarProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  user: FirebaseUser;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  unreadCount?: number;
  onNotificationClick?: () => void;
}

const NAV_ITEMS: { page: AppPage; label: string; icon: React.ReactNode }[] = [
  { page: 'overview', label: '今日總覽', icon: <LayoutDashboard size={20} /> },
  { page: 'todo', label: '每日待辦', icon: <CheckSquare size={20} /> },
  { page: 'qa', label: 'QA 追蹤', icon: <Bug size={20} /> },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage, onNavigate, collapsed, onToggleCollapse,
  user, onLogout, isDarkMode, onToggleDarkMode,
  unreadCount = 0, onNotificationClick
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const displayName = user.displayName || '使用者';

  const handleNavigate = (page: AppPage) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  const navContent = (
    <>
      {/* Logo */}
      <div className="p-4 flex items-center justify-between border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-sm shrink-0">
            OV
          </div>
          {!collapsed && <span className="text-sm font-bold tracking-tight whitespace-nowrap">OVideo Team</span>}
        </div>
        {/* Mobile close */}
        <button onClick={() => setMobileOpen(false)} className="lg:hidden p-1 text-gray-400 hover:text-white">
          <X size={20} />
        </button>
      </div>

      {/* Nav */}
      <nav className="p-2 space-y-1">
        {NAV_ITEMS.map(item => (
          <button
            key={item.page}
            onClick={() => handleNavigate(item.page)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${
              currentPage === item.page
                ? 'bg-blue-600/20 text-blue-400'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
            title={collapsed ? item.label : undefined}
            aria-label={item.label}
          >
            {currentPage === item.page && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-500 rounded-r-full" />
            )}
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}

        {/* Notification bell */}
        {onNotificationClick && (
          <button
            onClick={onNotificationClick}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors relative"
            title={collapsed ? '通知' : undefined}
            aria-label="通知"
          >
            <span className="shrink-0 relative">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </span>
            {!collapsed && (
              <span className="flex items-center gap-2">
                通知
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                )}
              </span>
            )}
          </button>
        )}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom section — always visible */}
      <div className="border-t border-gray-800 p-2 space-y-1">
        {/* Dark mode toggle */}
        <button
          onClick={onToggleDarkMode}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          title={collapsed ? (isDarkMode ? '淺色模式' : '深色模式') : undefined}
        >
          <span className="shrink-0">{isDarkMode ? <Sun size={18} /> : <Moon size={18} />}</span>
          {!collapsed && <span className="text-xs">{isDarkMode ? '淺色模式' : '深色模式'}</span>}
        </button>

        {/* Collapse toggle — desktop only */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
          aria-label={collapsed ? '展開側邊欄' : '收合側邊欄'}
        >
          <span className="shrink-0">{collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}</span>
          {!collapsed && <span className="text-xs">收合</span>}
        </button>
      </div>

      {/* User info + Logout */}
      <div className="border-t border-gray-800 p-3">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs text-white font-bold shrink-0 ${getAvatarColor(displayName)}`}>
            {displayName.charAt(0)}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-200 truncate">{displayName}</p>
              <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={onLogout}
              className="p-1.5 text-gray-500 hover:text-red-400 transition-colors shrink-0"
              title="登出"
              aria-label="登出"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900 text-white rounded-lg shadow-lg"
        aria-label="開啟選單"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white flex flex-col transition-transform duration-200 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex bg-gray-900 text-white flex-col shrink-0 transition-all duration-200 h-screen sticky top-0 ${
        collapsed ? 'w-16' : 'w-56'
      }`}>
        {navContent}
      </aside>
    </>
  );
};
