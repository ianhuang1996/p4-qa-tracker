import React, { useMemo } from 'react';
import { CheckCircle2, Circle, Bug, ArrowRight, Flag, Copy, ClipboardList } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { useTodos } from '../hooks/useTodos';
import { useQAItems } from '../hooks/useQAItems';
import { useAppContext } from '../contexts/AppContext';
import { getTodayStr, getAvatarColor, formatTimestamp } from '../utils/qaUtils';
import { STATUS_COLORS, PRIORITY_COLORS } from '../constants';
import { AugmentedQAItem } from '../types';
import { normalizeDate } from '../utils/qaUtils';
import { WeeklyReport } from './WeeklyReport';
import { generateStandupSummary, formatStandupText } from '../utils/standupUtils';
import { toast } from 'sonner';

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

  const myTodos = useMemo(() => {
    if (!user) return [];
    const name = user.displayName || '';
    return todos.filter(t => t.assignee === name);
  }, [todos, user]);

  const augmentedData: AugmentedQAItem[] = useMemo(() => {
    return data.map(item => {
      const desc = item.description || '';
      let priority = item.priority;
      let category = '';
      let cleanDesc = desc;
      const priorityMatch = desc.match(/【(P\d+)(?:-([^】]+))?】/);
      if (priorityMatch) {
        if (!priority || priority === '-') priority = priorityMatch[1];
        category = priorityMatch[2] || '';
        cleanDesc = desc.replace(priorityMatch[0], '').trim();
      } else {
        const generalMatch = desc.match(/【([^】]+)】/);
        if (generalMatch) { category = generalMatch[1]; cleanDesc = desc.replace(generalMatch[0], '').trim(); }
      }
      if (!priority) priority = '-';
      const displayTitle = item.title || (cleanDesc.split('\n')[0].length > 30 ? cleanDesc.split('\n')[0].substring(0, 30) + '...' : cleanDesc.split('\n')[0]) || '未命名問題';
      return { ...item, priority, category, cleanDesc, displayTitle, date: normalizeDate(item.date), comments: item.comments || [] };
    });
  }, [data]);

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

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          早安，{user?.displayName || '使用者'} 👋
        </h2>
        <p className="text-sm text-gray-500 mt-1">以下是你今天的工作概況</p>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">我的待辦</p>
          <p className="text-2xl font-black text-gray-900">{myPendingTodos.length}</p>
          <p className="text-[10px] text-gray-400 mt-1">已完成 {myCompletedTodos.length} 項</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-red-100">
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">P0/P1 未修</p>
          <p className="text-2xl font-black text-red-600">{qaStats.p0Count + qaStats.p1Count}</p>
          <p className="text-[10px] text-gray-400 mt-1">P0: {qaStats.p0Count} / P1: {qaStats.p1Count}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-teal-100">
          <p className="text-[10px] font-bold text-teal-400 uppercase tracking-widest mb-1">待 PM 測試</p>
          <p className="text-2xl font-black text-teal-600">{qaStats.readyForTest}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100">
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">開發中</p>
          <p className="text-2xl font-black text-blue-600">{qaStats.inProgress}</p>
        </div>
      </div>

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
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] text-white font-bold shrink-0 ${getAvatarColor(item.assignee)}`}>
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

      {/* Daily Standup */}
      {user && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList size={16} className="text-purple-600" />
              今日站會摘要
            </h3>
            <button
              onClick={() => {
                const summary = generateStandupSummary(myTodos, augmentedData, user.displayName || '');
                navigator.clipboard.writeText(formatStandupText(summary));
                toast.success('站會摘要已複製');
              }}
              className="text-xs text-purple-600 hover:text-purple-700 font-bold flex items-center gap-1"
            >
              <Copy size={12} /> 複製摘要
            </button>
          </div>
          <pre className="text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 p-4 rounded-xl border border-gray-100 font-sans leading-relaxed">
            {formatStandupText(generateStandupSummary(myTodos, augmentedData, user.displayName || ''))}
          </pre>
        </div>
      )}

      {/* Weekly Report */}
      <WeeklyReport items={augmentedData} />
    </div>
  );
};
