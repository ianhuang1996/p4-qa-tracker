import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, ChevronLeft, ChevronRight, Circle, CheckCircle2,
  Link2, Flag, Calendar, Users, List, Columns, Edit2, Save, ClipboardList
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { useTodos, DateMode } from '../hooks/useTodos';
import { useQAItems } from '../hooks/useQAItems';
import { useAppContext } from '../contexts/AppContext';
import { TodoItem, AugmentedQAItem } from '../types';
import { RDS, PMS, ADMIN_EMAILS, STATUS_COLORS, STATUS, isResolved, isActive } from '../constants';
import { getAvatarColor, getTodayStr, toDateStr, augmentQAItems } from '../utils/qaUtils';
import { EmptyState } from './EmptyState';

interface DailyTodoProps {
  user: FirebaseUser;
  qaItems?: AugmentedQAItem[];
  onNavigateToQA?: (itemId: string) => void;
}

type TodoViewMode = 'list' | 'by-person' | 'by-status';

const ALL_MEMBERS = [...PMS, ...RDS].filter(n => n !== 'Unassigned');

const PRIORITY_STYLES: Record<string, string> = {
  high: 'text-red-500',
  medium: 'text-orange-500',
  low: 'text-blue-500',
};

const PRIORITY_LABELS: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

function formatDateLabel(dateStr: string): string {
  const now = new Date();
  const today = toDateStr(now);
  const tom = new Date(now); tom.setDate(now.getDate() + 1);
  const tomorrow = toDateStr(tom);
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  const yesterday = toDateStr(yest);
  if (dateStr === today) return '今天';
  if (dateStr === tomorrow) return '明天';
  if (dateStr === yesterday) return '昨天';
  const d = new Date(dateStr + 'T00:00:00');
  const weekday = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()} (${weekday})`;
}

function getWeekDays(dateStr: string): string[] {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMon);
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    days.push(toDateStr(dd));
  }
  return days;
}

// ─── Unified Todo / Task Card ──────────────────────────────────
interface EditingState {
  text: string;
  assignee: string;
  priority: TodoItem['priority'];
  date: string;
  linkedQAItemId: string;
  type: 'todo' | 'task';
  dueTime: string;
  instruction: string;
  deliverable: string;
}

const TodoCard: React.FC<{
  todo: TodoItem;
  canEdit: boolean;
  isAdmin?: boolean;
  qaItems?: AugmentedQAItem[];
  onToggle: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<TodoItem>) => void;
  onNavigateToQA?: (itemId: string) => void;
}> = ({ todo, canEdit, isAdmin, qaItems, onToggle, onDelete, onUpdate, onNavigateToQA }) => {
  const isTask = todo.type === 'task';
  const linkedQA = todo.linkedQAItemId && qaItems
    ? qaItems.find(q => q.id === todo.linkedQAItemId) : null;

  const [isEditing, setIsEditing] = useState(false);
  const [editState, setEditState] = useState<EditingState>({
    text: todo.text,
    assignee: todo.assignee,
    priority: todo.priority,
    date: todo.date,
    linkedQAItemId: todo.linkedQAItemId || '',
    type: todo.type || 'todo',
    dueTime: todo.dueTime || '',
    instruction: todo.instruction || '',
    deliverable: todo.deliverable || '',
  });

  const set = (patch: Partial<EditingState>) => setEditState(p => ({ ...p, ...patch }));
  const editIsTask = editState.type === 'task';

  const handleSave = () => {
    onUpdate({
      text: editState.text,
      assignee: editState.assignee,
      priority: editState.priority || undefined,
      date: editState.date,
      type: editState.type,
      linkedQAItemId: editIsTask ? undefined : (editState.linkedQAItemId || undefined),
      dueTime: editIsTask ? (editState.dueTime || undefined) : undefined,
      instruction: editState.instruction || undefined,
      deliverable: editState.deliverable || undefined,
    });
    setIsEditing(false);
  };

  if (isEditing && canEdit) {
    return (
      <div className={`bg-white rounded-xl shadow-sm p-4 space-y-3 ${editIsTask ? 'border border-l-4 border-l-indigo-400 border-gray-200' : 'border border-blue-200'}`}>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={editState.text}
            onChange={(e) => set({ text: e.target.value })}
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          {/* Type toggle — only admins can switch type */}
          {isAdmin && (
            <div className="flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-lg shrink-0">
              <button onClick={() => set({ type: 'todo' })}
                className={`text-[10px] font-bold px-2 py-1 rounded-md transition-colors ${!editIsTask ? 'bg-white shadow-sm text-gray-700' : 'text-gray-400'}`}>
                一般
              </button>
              <button onClick={() => set({ type: 'task' })}
                className={`text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-0.5 transition-colors ${editIsTask ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400'}`}>
                <ClipboardList size={9} /> 任務
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={editState.assignee} onChange={(e) => set({ assignee: e.target.value })}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white">
            {ALL_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={editState.priority || ''} onChange={(e) => set({ priority: (e.target.value || undefined) as TodoItem['priority'] })}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white">
            <option value="">無優先級</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
          <input type="date" value={editState.date} onChange={(e) => set({ date: e.target.value })}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white" />
          {editIsTask ? (
            <input type="time" value={editState.dueTime} onChange={(e) => set({ dueTime: e.target.value })}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white" />
          ) : qaItems ? (
            <select value={editState.linkedQAItemId} onChange={(e) => set({ linkedQAItemId: e.target.value })}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white max-w-[200px]">
              <option value="">不關聯 QA</option>
              {qaItems.filter(q => q.currentFlow !== STATUS.closed).map(q => (
                <option key={q.id} value={q.id}>{q.id} - {q.displayTitle}</option>
              ))}
            </select>
          ) : null}
        </div>
        {/* instruction / deliverable always visible in edit — needed to fix items saved without type='task' */}
        <div>
          <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">請做（選填）</label>
          <textarea value={editState.instruction} onChange={(e) => set({ instruction: e.target.value })}
            className="w-full mt-1 text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-400 min-h-[52px] resize-y"
            placeholder="具體指示說明..." />
        </div>
        <div>
          <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">交付（選填）</label>
          <textarea value={editState.deliverable} onChange={(e) => set({ deliverable: e.target.value })}
            className="w-full mt-1 text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-400 min-h-[52px] resize-y"
            placeholder="請交什麼給我（檔案、連結、截圖...）" />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={() => setIsEditing(false)} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5">取消</button>
          <button onClick={handleSave} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 flex items-center gap-1">
            <Save size={12} /> 儲存
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`group bg-white rounded-xl shadow-sm overflow-hidden transition-all duration-300 ${
      todo.completed
        ? 'border border-gray-100 opacity-50 scale-[0.99]'
        : isTask
          ? 'border border-gray-200 border-l-4 border-l-indigo-400'
          : 'border border-gray-200'
    }`}>
      <div className="flex items-center gap-3 p-4">
        <button onClick={onToggle}
          className={`shrink-0 transition-all duration-200 active:scale-125 ${todo.completed ? 'text-green-500' : 'text-gray-300 hover:text-blue-500'}`}
          aria-label={todo.completed ? '標記為未完成' : '標記為完成'}>
          {todo.completed ? <CheckCircle2 size={22} /> : <Circle size={22} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            {isTask && (
              <span className="shrink-0 text-[9px] font-bold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded">任務</span>
            )}
            <p className={`text-sm font-medium truncate ${todo.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
              {todo.text}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white font-bold ${getAvatarColor(todo.assignee)}`}>
                {todo.assignee.charAt(0)}
              </div>
              {todo.assignee}
            </span>
            {todo.priority && (
              <span className={`text-[10px] font-bold flex items-center gap-0.5 ${PRIORITY_STYLES[todo.priority]}`}>
                <Flag size={10} />{PRIORITY_LABELS[todo.priority]}
              </span>
            )}
            {todo.dueTime && (
              <span className="text-[10px] font-medium text-indigo-600">截止 {todo.dueTime}</span>
            )}
            {todo.linkedQAItemId && (
              <button onClick={() => onNavigateToQA?.(todo.linkedQAItemId!)}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                <Link2 size={10} />{todo.linkedQAItemId}
                {linkedQA && (
                  <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full border ${STATUS_COLORS[linkedQA.currentFlow || STATUS.pending]}`}>
                    {linkedQA.currentFlow}
                  </span>
                )}
              </button>
            )}
            <span className="text-[10px] text-gray-400">by {todo.creatorName}</span>
          </div>
        </div>

        {canEdit && (
          <>
            <button
              onClick={() => {
                setEditState({
                  text: todo.text, assignee: todo.assignee, priority: todo.priority,
                  date: todo.date, linkedQAItemId: todo.linkedQAItemId || '',
                  type: todo.type || 'todo',
                  dueTime: todo.dueTime || '', instruction: todo.instruction || '', deliverable: todo.deliverable || '',
                });
                setIsEditing(true);
              }}
              className="p-1.5 text-gray-300 hover:text-blue-500 rounded-lg transition-colors shrink-0 opacity-0 group-hover:opacity-100"
              aria-label="編輯">
              <Edit2 size={14} />
            </button>
            <button onClick={onDelete}
              className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg transition-colors shrink-0 opacity-0 group-hover:opacity-100"
              aria-label="刪除">
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>

      {/* Structured body: show if instruction or deliverable has content */}
      {(todo.instruction || todo.deliverable) && !todo.completed && (
        <div className="px-4 pb-3 space-y-2 border-t border-gray-100 bg-gray-50/60">
          {todo.instruction && (
            <div className="pt-2">
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">請做</span>
              <p className="text-xs text-gray-700 mt-0.5 whitespace-pre-wrap">{todo.instruction}</p>
            </div>
          )}
          {todo.deliverable && (
            <div>
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">交付</span>
              <p className="text-xs text-gray-600 mt-0.5 whitespace-pre-wrap">{todo.deliverable}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────
export const DailyTodo: React.FC<DailyTodoProps> = ({ user, qaItems: qaItemsProp, onNavigateToQA }) => {
  const { isAuthReady } = useAppContext();
  const { data: rawQAData } = useQAItems(user, isAuthReady);
  const qaItems = qaItemsProp || useMemo(() => augmentQAItems(rawQAData), [rawQAData]);
  const today = getTodayStr();
  const [selectedDate, setSelectedDate] = useState(today);
  const [dateMode, setDateMode] = useState<DateMode>('day');
  const [viewMode, setViewMode] = useState<TodoViewMode>('list');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');

  const { todos, isLoading, error: todosError, addTodo, toggleTodo, deleteTodo, updateTodo } = useTodos(user, selectedDate, dateMode);

  // Auto-complete: when linked QA item is fixed/closed, auto-complete the todo
  const autoCompletedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!qaItems || qaItems.length === 0 || todos.length === 0) return;
    todos.forEach(todo => {
      if (todo.completed || !todo.linkedQAItemId) return;
      if (autoCompletedRef.current.has(todo.id)) return;
      const qa = qaItems.find(q => q.id === todo.linkedQAItemId);
      if (qa && isResolved(qa.currentFlow)) {
        autoCompletedRef.current.add(todo.id);
        toggleTodo(todo.id, true);
      }
    });
  }, [qaItems, todos, toggleTodo]);

  // New todo form
  const [newText, setNewText] = useState('');
  const [newAssignee, setNewAssignee] = useState(user.displayName || ALL_MEMBERS[0]);
  const [newPriority, setNewPriority] = useState<TodoItem['priority']>(undefined);
  const [newLinkedQA, setNewLinkedQA] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const isAdmin = !!user.email && ADMIN_EMAILS.includes(user.email);

  // Add form type toggle (admin only)
  const [newType, setNewType] = useState<'todo' | 'task'>('todo');
  const [newInstruction, setNewInstruction] = useState('');
  const [newDeliverable, setNewDeliverable] = useState('');
  const [newDueTime, setNewDueTime] = useState('');

  const canEdit = useCallback((todo: TodoItem) => {
    return todo.creatorId === user.uid || isAdmin;
  }, [user.uid, isAdmin]);

  const shiftDate = useCallback((days: number) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + (dateMode === 'week' ? days * 7 : days));
    setSelectedDate(toDateStr(d));
  }, [selectedDate, dateMode]);

  const handleAdd = useCallback(() => {
    if (!newText.trim()) return;
    if (isAdmin && newType === 'task') {
      addTodo(newText, newAssignee, selectedDate, newPriority, undefined, {
        type: 'task',
        instruction: newInstruction || undefined,
        deliverable: newDeliverable || undefined,
        dueTime: newDueTime || undefined,
      });
      setNewInstruction('');
      setNewDeliverable('');
      setNewDueTime('');
    } else {
      addTodo(newText, newAssignee, selectedDate, newPriority, newLinkedQA || undefined);
      setNewLinkedQA('');
    }
    setNewText('');
    setNewPriority(undefined);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [newText, newAssignee, selectedDate, newPriority, newLinkedQA, newType, newInstruction, newDeliverable, newDueTime, addTodo, isAdmin]);

  // Filtered todos
  const filteredTodos = useMemo(() => {
    if (filterAssignee === 'all') return todos;
    return todos.filter(t => t.assignee === filterAssignee);
  }, [todos, filterAssignee]);

  const sortedTodos = useMemo(() => {
    return [...filteredTodos.filter(t => !t.completed), ...filteredTodos.filter(t => t.completed)];
  }, [filteredTodos]);

  // Stats
  const completedCount = filteredTodos.filter(t => t.completed).length;
  const totalCount = filteredTodos.length;

  // Group helpers
  const groupByPerson = useMemo(() => {
    const groups: Record<string, TodoItem[]> = {};
    ALL_MEMBERS.forEach(m => { groups[m] = []; });
    filteredTodos.forEach(t => {
      if (!groups[t.assignee]) groups[t.assignee] = [];
      groups[t.assignee].push(t);
    });
    return Object.entries(groups).filter(([, items]) => items.length > 0);
  }, [filteredTodos]);

  const groupByStatus = useMemo(() => {
    return [
      { label: '待辦', items: filteredTodos.filter(t => !t.completed) },
      { label: '已完成', items: filteredTodos.filter(t => t.completed) },
    ];
  }, [filteredTodos]);

  const weekDays = dateMode === 'week' ? getWeekDays(selectedDate) : [];

  const renderTodoCard = (todo: TodoItem) => (
    <TodoCard
      key={todo.id}
      todo={todo}
      canEdit={canEdit(todo)}
      isAdmin={isAdmin}
      qaItems={qaItems}
      onToggle={() => toggleTodo(todo.id, !todo.completed)}
      onDelete={() => deleteTodo(todo.id)}
      onUpdate={(updates) => updateTodo(todo.id, updates)}
      onNavigateToQA={onNavigateToQA}
    />
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Date navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button
              onClick={() => setDateMode('day')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${dateMode === 'day' ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600' : 'text-gray-500'}`}
            >
              日
            </button>
            <button
              onClick={() => setDateMode('week')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${dateMode === 'week' ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600' : 'text-gray-500'}`}
            >
              週
            </button>
          </div>

          <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 shadow-sm p-1">
            <button onClick={() => shiftDate(-1)} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors" aria-label="前一天">
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setSelectedDate(today)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${selectedDate === today && dateMode === 'day' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              {dateMode === 'week'
                ? `${formatDateLabel(weekDays[0])} ~ ${formatDateLabel(weekDays[6])}`
                : formatDateLabel(selectedDate)}
            </button>
            <button onClick={() => shiftDate(1)} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors" aria-label="後一天">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter by assignee */}
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
          >
            <option value="all">所有人</option>
            {ALL_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600' : 'text-gray-500'}`}
              title="列表" aria-label="列表模式"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setViewMode('by-person')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'by-person' ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600' : 'text-gray-500'}`}
              title="按負責人" aria-label="按負責人分組"
            >
              <Users size={14} />
            </button>
            <button
              onClick={() => setViewMode('by-status')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'by-status' ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600' : 'text-gray-500'}`}
              title="按狀態" aria-label="按狀態分組"
            >
              <Columns size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Progress */}
      {totalCount > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500">進度</span>
            <span className="text-xs font-bold text-gray-500">{completedCount}/{totalCount}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Add new todo / task */}
      <div className={`bg-white rounded-xl border shadow-sm p-4 mb-6 space-y-3 transition-colors ${
        isAdmin && newType === 'task' ? 'border-indigo-200' : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder={isAdmin && newType === 'task' ? '任務名稱...' : '新增待辦事項...'}
            className="flex-1 text-sm border-none outline-none bg-transparent placeholder:text-gray-400"
          />
          <button
            onClick={handleAdd}
            disabled={!newText.trim()}
            className={`text-white p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ${
              isAdmin && newType === 'task' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
            aria-label="新增"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white">
            {ALL_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={newPriority || ''} onChange={(e) => setNewPriority((e.target.value || undefined) as TodoItem['priority'])}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white">
            <option value="">優先級</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
          {(!isAdmin || newType === 'todo') && (
            <select value={newLinkedQA} onChange={(e) => setNewLinkedQA(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white max-w-[180px]">
              <option value="">關聯 QA</option>
              {qaItems.filter(q => isActive(q.currentFlow)).map(q => (
                <option key={q.id} value={q.id}>{q.id} — {(q.title || q.description).substring(0, 20)}</option>
              ))}
            </select>
          )}
          {isAdmin && newType === 'task' && (
            <input type="time" value={newDueTime} onChange={(e) => setNewDueTime(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
              title="截止時間" />
          )}

          {/* Type toggle (admin only) */}
          {isAdmin && (
            <div className="ml-auto flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg">
              <button onClick={() => setNewType('todo')}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-colors ${newType === 'todo' ? 'bg-white shadow-sm text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}>
                一般
              </button>
              <button onClick={() => setNewType('task')}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors ${newType === 'task' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                <ClipboardList size={10} /> 任務
              </button>
            </div>
          )}
        </div>

        {/* Task extra fields */}
        {isAdmin && newType === 'task' && (
          <div className="space-y-2 pt-1 border-t border-indigo-100">
            <textarea value={newInstruction} onChange={(e) => setNewInstruction(e.target.value)}
              rows={2}
              placeholder="請做：具體指示說明..."
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-400 resize-none" />
            <textarea value={newDeliverable} onChange={(e) => setNewDeliverable(e.target.value)}
              rows={2}
              placeholder="交付：請給我什麼（檔案、截圖、連結...）"
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-400 resize-none" />
          </div>
        )}
      </div>

      {/* Content */}
      {todosError ? (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold">
          ⚠ {todosError}
        </div>
      ) : isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
              <div className="w-5 h-5 bg-gray-200 rounded-full" />
              <div className="flex-1 h-4 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : todos.length === 0 ? (
        <EmptyState
          title={dateMode === 'week' ? '這週還沒有待辦事項' : (selectedDate === today ? '今天還沒有待辦事項' : '這天沒有待辦事項')}
          description="在上方輸入框新增一個吧"
        />
      ) : viewMode === 'list' ? (
        /* ── List View ── */
        <div className="space-y-2">
          {dateMode === 'week' ? (
            weekDays.map(day => {
              const dayTodos = sortedTodos.filter(t => t.date === day);
              if (dayTodos.length === 0) return null;
              return (
                <div key={day} className="mb-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Calendar size={12} />
                    {formatDateLabel(day)}
                    <span className="text-gray-300">({dayTodos.length})</span>
                  </h3>
                  <div className="space-y-2">{dayTodos.map(renderTodoCard)}</div>
                </div>
              );
            })
          ) : (
            sortedTodos.map(renderTodoCard)
          )}
        </div>
      ) : viewMode === 'by-person' ? (
        /* ── By Person View ── */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {groupByPerson.map(([person, items]) => (
            <div key={person} className="space-y-2">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 pb-2 border-b border-gray-200">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold ${getAvatarColor(person)}`}>
                  {person.charAt(0)}
                </div>
                {person}
                <span className="text-xs text-gray-400 font-normal">({items.length})</span>
              </h3>
              <div className="space-y-2">
                {[...items.filter(t => !t.completed), ...items.filter(t => t.completed)].map(renderTodoCard)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── By Status View ── */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {groupByStatus.map(group => (
            <div key={group.label} className="space-y-2">
              <h3 className="text-sm font-bold text-gray-700 pb-2 border-b border-gray-200 flex items-center gap-2">
                {group.label === '待辦' ? <Circle size={16} className="text-gray-400" /> : <CheckCircle2 size={16} className="text-green-500" />}
                {group.label}
                <span className="text-xs text-gray-400 font-normal">({group.items.length})</span>
              </h3>
              {group.items.length === 0 ? (
                <EmptyState compact title={`沒有${group.label}項目`} />
              ) : (
                <div className="space-y-2">{group.items.map(renderTodoCard)}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
