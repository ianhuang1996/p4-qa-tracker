import { useState, useMemo } from 'react';
import { FileText } from 'lucide-react';
import { Toaster } from 'sonner';
import { AppProvider, useAppContext } from './contexts/AppContext';
import { useNotifications } from './hooks/useNotifications';
import { useQAItems } from './hooks/useQAItems';
import { useTodos } from './hooks/useTodos';
import { getTodayStr } from './utils/qaUtils';
import { Sidebar } from './components/Sidebar';
import { NotificationCenter } from './components/NotificationCenter';
import { OverviewPage } from './components/OverviewPage';
import { QAPage } from './components/QAPage';
import { ReleasePage } from './components/ReleasePage';
import { WikiPageView } from './components/WikiPageView';
import { DailyTodo } from './components/DailyTodo';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GlobalSearch } from './components/GlobalSearch';

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded-lg" />
            <div className="h-8 w-48 bg-gray-200 rounded-lg" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-28 bg-gray-200 rounded-xl" />
            <div className="h-10 w-28 bg-gray-200 rounded-xl" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="h-3 w-16 bg-gray-200 rounded mb-2" />
              <div className="h-7 w-10 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="h-10 w-full bg-gray-100 rounded-lg mb-4" />
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex items-center gap-4 py-4 border-t border-gray-100">
              <div className="w-4 h-4 bg-gray-200 rounded" />
              <div className="w-12 h-4 bg-gray-200 rounded" />
              <div className="w-8 h-5 bg-gray-200 rounded" />
              <div className="w-16 h-4 bg-gray-200 rounded" />
              <div className="flex-1 h-4 bg-gray-200 rounded" />
              <div className="w-20 h-6 bg-gray-200 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoginScreen() {
  const { handleLogin } = useAppContext();
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full text-center">
        <FileText className="text-blue-600 w-16 h-16 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">OVideo Team</h1>
        <p className="text-gray-500 mb-8">請登入以存取團隊工作區</p>
        <button onClick={handleLogin} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-200">
          使用 Google 帳號登入
        </button>
      </div>
    </div>
  );
}

function AppLayout() {
  const { user, isAuthReady, currentPage, setCurrentPage, sidebarCollapsed, toggleSidebar, handleLogout, isDarkMode, toggleDarkMode } = useAppContext();
  const { unreadCount } = useNotifications(user);
  const { data: qaData } = useQAItems(user, isAuthReady);
  const { todos } = useTodos(user, getTodayStr(), 'day');
  const [showNotifications, setShowNotifications] = useState(false);

  const sidebarBadges = useMemo(() => {
    const qaActive = qaData.filter(i => i.currentFlow !== '已關閉' && i.currentFlow !== '已修復').length;
    const todoPending = todos.filter(t => !t.completed && t.assignee === (user?.displayName || '')).length;
    return { qa: qaActive || undefined, todo: todoPending || undefined };
  }, [qaData, todos, user]);

  if (!isAuthReady) return <LoadingSkeleton />;
  if (!user) return <LoginScreen />;

  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-900 font-sans">
      <Toaster position="top-center" richColors />
      <GlobalSearch onNavigate={setCurrentPage} />
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        user={user}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        unreadCount={unreadCount}
        onNotificationClick={() => setShowNotifications(prev => !prev)}
        badges={sidebarBadges}
      />

      <main className="flex-1 min-h-screen overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          {currentPage !== 'overview' && (
            <header className="flex items-center justify-between gap-6 pl-12 lg:pl-0 mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                  {{ todo: '每日待辦', qa: 'QA 追蹤', release: '版更管理', wiki: '知識庫' }[currentPage] || ''}
                </h1>
                <p className="text-gray-500 mt-1 font-medium text-sm">
                  {{ todo: '管理團隊每日工作項目', qa: '數據分析與任務管理儀表板', release: '版本排程、發布與歷史紀錄', wiki: '團隊產品知識與文件管理' }[currentPage] || ''}
                </p>
              </div>
            </header>
          )}

          {/* Page content */}
          <ErrorBoundary>
            {currentPage === 'overview' ? (
              <OverviewPage
                onNavigateToQA={() => setCurrentPage('qa')}
                onNavigateToTodo={() => setCurrentPage('todo')}
              />
            ) : currentPage === 'todo' ? (
              <DailyTodo user={user} onNavigateToQA={() => setCurrentPage('qa')} />
            ) : currentPage === 'release' ? (
              <ReleasePage />
            ) : currentPage === 'wiki' ? (
              <WikiPageView />
            ) : (
              <QAPage />
            )}
          </ErrorBoundary>
        </div>
      </main>

      {/* Notification panel — global, triggered from Sidebar */}
      {showNotifications && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
          <div className="fixed top-4 right-4 z-50 w-96 max-h-[80vh] bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden">
            <NotificationCenter
              user={user}
              onItemClick={() => {
                setCurrentPage('qa');
                setShowNotifications(false);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
  );
}
