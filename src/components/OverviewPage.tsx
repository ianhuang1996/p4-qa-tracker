import React, { useMemo, useState } from 'react';
import { CheckCircle2, Circle, Bug, ArrowRight, Flag, AlertTriangle } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { useTodos } from '../hooks/useTodos';
import { useQAItems } from '../hooks/useQAItems';
import { useReleases } from '../hooks/useReleases';
import { useWikiPages } from '../hooks/useWikiPages';
import { useAchievements, useAllDailyReports, useAchievementLogs, useUserTiers, getAvatarRing } from '../hooks/useAchievements';
import { useAppContext } from '../contexts/AppContext';
import { getTodayStr, getAvatarColor, augmentQAItems } from '../utils/qaUtils';
import { STATUS_COLORS, PRIORITY_COLORS, ACHIEVEMENT_DEFS } from '../constants';
import { AugmentedQAItem } from '../types';
import { WeeklyReport } from './WeeklyReport';
import { DailyReportEditor } from './DailyReportEditor';
import { AchievementCard } from './AchievementCard';
import { TeamGoals } from './TeamGoals';

function getTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '剛剛';
  if (mins < 60) return `${mins}分鐘前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}hr`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

const PRIORITY_FLAG: Record<string, string> = {
  high: 'text-red-500',
  medium: 'text-orange-500',
  low: 'text-blue-500',
};

interface OverviewPageProps {
  onNavigateToQA: () => void;
  onNavigateToTodo: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigateToQA, onNavigateToTodo }) => {
  const { user, isAuthReady } = useAppContext();
  const today = getTodayStr();
  const { todos } = useTodos(user, today, 'day');
  const { data } = useQAItems(user, isAuthReady);
  const { releases } = useReleases(user);
  const { pages: wikiPages } = useWikiPages(user);
  const allDailyReports = useAllDailyReports(user);

  const achievementLogs = useAchievementLogs(user);
  const { tierByUserName } = useUserTiers(user);

  const { unlockedAchievements, lockedAchievements, achievementProgress, teamGoals } = useAchievements({
    user,
    qaItems: data,
    todos,
    wikiPages,
    releases,
    dailyReports: allDailyReports,
  });

  const myTodos = useMemo(() => {
    if (!user) return [];
    const name = user.displayName || '';
    return todos.filter(t => t.assignee === name);
  }, [todos, user]);

  const augmentedData = useMemo(() => augmentQAItems(data), [data]);

  const qaStats = useMemo(() => {
    const active = augmentedData.filter(i => i.currentFlow !== '已關閉' && i.currentFlow !== '已修復');
    return {
      p0Count: active.filter(i => i.priority === 'P0').length,
      p1Count: active.filter(i => i.priority === 'P1').length,
      readyForTest: augmentedData.filter(i => i.currentFlow === '已修正待測試').length,
      inProgress: active.filter(i => i.currentFlow === '開發中').length,
      totalActive: active.length,
    };
  }, [augmentedData]);

  // Recent activity: items updated recently (sorted by most recent)
  // Data from useQAItems is already sorted newest-first
  const recentItems = useMemo(() => {
    return augmentedData
      .filter(i => i.currentFlow !== '已關閉')
      .slice(0, 5);
  }, [augmentedData]);

  const myPendingTodos = myTodos.filter(t => !t.completed);
  const myCompletedTodos = myTodos.filter(t => t.completed);

  // Release urgency alerts
  const releaseAlerts = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return releases
      .filter(r => r.status === 'planning' || r.status === 'uat')
      .map(r => {
        const target = new Date(r.scheduledDate + 'T00:00:00');
        const days = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const unfixed = augmentedData.filter(
          i => r.linkedItemIds.includes(i.id) && i.currentFlow !== '已修復' && i.currentFlow !== '已關閉' && i.currentFlow !== '已修正待測試'
        ).length;
        return { version: r.version, days, unfixed, total: r.linkedItemIds.length };
      })
      .filter(a => a.days <= 7 && a.unfixed > 0)
      .sort((a, b) => a.days - b.days);
  }, [releases, augmentedData]);

  const [activeTab, setActiveTab] = useState<'today' | 'report' | 'achievement'>('today');

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return '早安';
    if (hour < 18) return '午安';
    return '晚安';
  })();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">
            {greeting}，{user?.displayName || '使用者'} 👋
          </h2>
          <p className="text-sm text-gray-500 mt-1">以下是你今天的工作概況</p>
        </div>
        {/* Tab switch */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
          <button
            onClick={() => setActiveTab('today')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${activeTab === 'today' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            今日
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${activeTab === 'report' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            週報
          </button>
          <button
            onClick={() => setActiveTab('achievement')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${activeTab === 'achievement' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            成就
          </button>
        </div>
      </div>

      {/* Quick Stats Row — clickable */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button onClick={onNavigateToTodo} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-left hover:border-blue-200 hover:shadow-md transition-all">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">我的待辦</p>
          <p className="text-2xl font-black text-gray-900">{myPendingTodos.length}</p>
          <p className="text-[10px] text-gray-400 mt-1">已完成 {myCompletedTodos.length} 項</p>
        </button>
        <button onClick={onNavigateToQA} className="bg-white p-4 rounded-2xl shadow-sm border border-red-100 text-left hover:border-red-200 hover:shadow-md transition-all">
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">P0/P1 未修</p>
          <p className="text-2xl font-black text-red-600">{qaStats.p0Count + qaStats.p1Count}</p>
          <p className="text-[10px] text-gray-400 mt-1">P0: {qaStats.p0Count} / P1: {qaStats.p1Count}</p>
        </button>
        <button onClick={onNavigateToQA} className="bg-white p-4 rounded-2xl shadow-sm border border-teal-100 text-left hover:border-teal-200 hover:shadow-md transition-all">
          <p className="text-[10px] font-bold text-teal-400 uppercase tracking-widest mb-1">待 PM 測試</p>
          <p className="text-2xl font-black text-teal-600">{qaStats.readyForTest}</p>
        </button>
        <button onClick={onNavigateToQA} className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100 text-left hover:border-blue-200 hover:shadow-md transition-all">
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">開發中</p>
          <p className="text-2xl font-black text-blue-600">{qaStats.inProgress}</p>
        </button>
      </div>

      {activeTab === 'today' ? (
      <>
      {/* Release urgency alerts */}
      {releaseAlerts.length > 0 && (
        <div className="space-y-2">
          {releaseAlerts.map(alert => (
            <div
              key={alert.version}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${
                alert.days <= 0
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : alert.days <= 3
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}
            >
              <AlertTriangle size={16} className={`shrink-0 ${alert.days <= 3 ? 'text-red-500 animate-pulse' : 'text-amber-500'}`} />
              <span className="text-sm font-bold">
                {alert.days < 0
                  ? `⚠️ ${alert.version} 已逾期 ${Math.abs(alert.days)} 天，剩 ${alert.unfixed} 個未修復`
                  : alert.days === 0
                    ? `⚠️ ${alert.version} 今天到期！剩 ${alert.unfixed} 個未修復`
                    : `⚠️ ${alert.version} 還有 ${alert.days} 天，剩 ${alert.unfixed} 個未修復`
                }
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* My Today's Todos */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-blue-600" />
              今日待辦
            </h3>
            <button onClick={onNavigateToTodo} className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1">
              查看全部 <ArrowRight size={12} />
            </button>
          </div>
          <div className="p-4 space-y-2">
            {myTodos.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">今天還沒有待辦事項</p>
            ) : (
              [...myPendingTodos, ...myCompletedTodos].slice(0, 6).map(todo => (
                <div key={todo.id} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${todo.completed ? 'opacity-50' : ''}`}>
                  {todo.completed ? <CheckCircle2 size={18} className="text-green-500 shrink-0" /> : <Circle size={18} className="text-gray-300 shrink-0" />}
                  <span className={`text-sm flex-1 ${todo.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>{todo.text}</span>
                  {todo.priority && <Flag size={12} className={PRIORITY_FLAG[todo.priority] || 'text-gray-400'} />}
                </div>
              ))
            )}
          </div>
        </div>

        {/* QA Overview */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Bug size={16} className="text-red-500" />
              QA 最新動態
            </h3>
            <button onClick={onNavigateToQA} className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1">
              查看全部 <ArrowRight size={12} />
            </button>
          </div>
          <div className="p-4 space-y-2">
            {recentItems.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">目前沒有 QA 項目</p>
            ) : (
              recentItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer" onClick={onNavigateToQA}>
                  <span className="text-xs font-bold text-gray-400 w-10 shrink-0">{item.id}</span>
                  {item.priority !== '-' && (
                    <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded border ${PRIORITY_COLORS[item.priority]}`}>{item.priority}</span>
                  )}
                  <span className="text-sm text-gray-900 flex-1 truncate">{item.displayTitle}</span>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] text-white font-bold shrink-0 ${getAvatarColor(item.assignee)} ${getAvatarRing(tierByUserName[item.assignee])}`}>
                    {item.assignee.charAt(0)}
                  </div>
                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full border shrink-0 ${STATUS_COLORS[item.currentFlow || '待處理']}`}>
                    {item.currentFlow}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Daily Report */}
      <DailyReportEditor />

      </>
      ) : activeTab === 'report' ? (
        <WeeklyReport items={augmentedData} />
      ) : (
        /* Achievement tab */
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <AchievementCard
              unlocked={unlockedAchievements}
              locked={lockedAchievements}
              progress={achievementProgress}
            />
            <TeamGoals goals={teamGoals} />
          </div>

          {/* Recent Achievement Logs */}
          {achievementLogs.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-5 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">🎉 最近成就</h3>
              </div>
              <div className="p-4 space-y-2">
                {achievementLogs.slice(0, 10).map(log => {
                  const def = ACHIEVEMENT_DEFS.find(d => d.id === log.achievementId);
                  if (!def) return null;
                  const ago = getTimeAgo(log.unlockedAt);
                  return (
                    <div key={log.id} className="flex items-center gap-3 px-2 py-1.5">
                      <span className="text-base">{def.icon}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-gray-900">
                          <span className="font-bold">{log.userName}</span>
                          {' '}解鎖了「{def.name}」
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">{ago}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
