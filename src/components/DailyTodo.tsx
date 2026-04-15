import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, ChevronLeft, ChevronRight, Circle, CheckCircle2,
  Link2, Flag, Calendar, Users, List, Columns, Edit2, Save, ClipboardList, X
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

// ─── Inline Edit Row ───────────────────────────────────────────
interface EditingState {
  text: string;
  assignee: string;
  priority: TodoItem['priority'];
  date: string;
  linkedQAItemId: string;
}

// ─── Todo Card ─────────────────────────────────────────────────
const TodoCard: React.FC<{
  todo: TodoItem;
  canEdit: boolean;
  qaItems?: AugmentedQAItem[];
  onToggle: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<TodoItem>) => void;
  onNavigateToQA?: (itemId: string) => void;
}> = ({ todo, canEdit, qaItems, onToggle, onDelete, onUpdate, onNavigateToQA }) => {
  const linkedQA = todo.linkedQAItemId && qaItems ? qaItems.find(q => q.id === todo.linkedQAItemId) : null;
  const [isEditing, setIsEditing] = useState(false);
  const [editState, setEditState] = useState<EditingState>({
    text: todo.text,
    assignee: todo.assignee,
    priority: todo.priority,
    date: todo.date,
    linkedQAItemId: todo.linkedQAItemId || '',
  });

  const handleSave = () => {
    onUpdate({
      text: editState.text,
      assignee: editState.assignee,
      priority: editState.priority || undefined,
      date: editState.date,
      linkedQAItemId: editState.linkedQAItemId || undefined,
    });
    setIsEditing(false);
  };

  if (isEditing && canEdit) {
    return (
      <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-4 space-y-3">
        <input
          type="text"
          value={editState.text}
          onChange={(e) => setEditState(prev => ({ ...prev, text: e.target.value }))}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={editState.assignee}
            onChange={(e) => setEditState(prev => ({ ...prev, assignee: e.target.value }))}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
          >
            {ALL_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select
            value={editState.priority || ''}
            onChange={(e) => setEditState(prev => ({ ...prev, priority: (e.target.value || undefined) as TodoItem['priority'] }))}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
          >
            <option value="">無優先級</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
          <input
            type="date"
            value={editState.date}
            onChange={(e) => setEditState(prev => ({ ...prev, date: e.target.value }))}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
          />
          {qaItems && (
            <select
              value={editState.linkedQAItemId}
              onChange={(e) => setEditState(prev => ({ ...prev, linkedQAItemId: e.target.value }))}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white max-w-[200px]"
            >
              <option value="">不關聯 QA</option>
              {qaItems.filter(q => q.currentFlow !== STATUS.closed).map(q => (
                <option key={q.id} value={q.id}>{q.id} - {q.displayTitle}</option>
              ))}
            </select>
          )}
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
    <div className={`bg-white rounded-xl border shadow-sm p-4 flex items-center gap-3 group transition-all duration-300 ${
      todo.completed ? 'border-gray-100 opacity-50 scale-[0.99]' : 'border-gray-200'
    }`}>
      <button
        onClick={onToggle}
        className={`shrink-0 transition-all duration-200 active:scale-125 ${todo.completed ? 'text-green-500' : 'text-gray-300 hover:text-blue-500'}`}
        aria-label={todo.completed ? '標記為未完成' : '標記為完成'}
      >
        {todo.completed ? <CheckCircle2 size={22} /> : <Circle size={22} />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${todo.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
          {todo.text}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white font-bold ${getAvatarColor(todo.assignee)}`}>
              {todo.assignee.charAt(0)}
            </div>
            {todo.assignee}
          </span>
          {todo.priority && (
            <span className={`text-[10px] font-bold flex items-center gap-0.5 ${PRIORITY_STYLES[todo.priority]}`}>
              <Flag size={10} />
              {PRIORITY_LABELS[todo.priority]}
            </span>
          )}
          {todo.linkedQAItemId && (
            <button
              onClick={() => onNavigateToQA?.(todo.linkedQAItemId!)}
              className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Link2 size={10} />
              {todo.linkedQAItemId}
              {linkedQA && (
                <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full border ${STATUS_COLORS[linkedQA.currentFlow || STATUS.pending]}`}>
                  {linkedQA.currentFlow}
                </span>
              )}
            </button>
          )}
          <span className="text-[10px] text-gray-400">
            by {todo.creatorName}
          </span>
        </div>
      </div>

      {canEdit && (
        <>
          <button
            onClick={() => {
              setEditState({
                text: todo.text,
                assignee: todo.assignee,
                priority: todo.priority,
                date: todo.date,
                linkedQAItemId: todo.linkedQAItemId || '',
              });
              setIsEditing(true);
            }}
            className="p-1.5 text-gray-300 hover:text-blue-500 rounded-lg transition-colors shrink-0"
            aria-label="編輯"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg transition-colors shrink-0"
            aria-label="刪除待辦"
          >
            <Trash2 size={14} />
          </button>
        </>
      )}
    </div>
  );
};

// ─── Task Card (type === 'task') ───────────────────────────────
interface TaskEditState {
  text: string;
  assignee: string;
  priority: TodoItem['priority'];
  date: string;
  dueTime: string;
  instruction: string;
  deliverable: string;
}

const TaskCard: React.FC<{
  todo: TodoItem;
  canEdit: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<TodoItem>) => void;
}> = ({ todo, canEdit, onToggle, onDelete, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editState, setEditState] = useState<TaskEditState>({
    text: todo.text,
    assignee: todo.assignee,
    priority: todo.priority,
    date: todo.date,
    dueTime: todo.dueTime || '',
    instruction: todo.instruction || '',
    deliverable: todo.deliverable || '',
  });

  const handleSave = () => {
    onUpdate({
      text: editState.text,
      assignee: editState.assignee,
      priority: editState.priority || undefined,
      date: editState.date,
      dueTime: editState.dueTime || undefined,
      instruction: editState.instruction || undefined,
      deliverable: editState.deliverable || undefined,
    });
    setIsEditing(false);
  };

  if (isEditing && canEdit) {
    return (
      <div className="bg-white rounded-xl border-2 border-indigo-300 shadow-sm p-4 space-y-3">
        <input
          type="text"
          value={editState.text}
          onChange={(e) => setEditState(p => ({ ...p, text: e.target.value }))}
          className="w-full text-sm font-semibold border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="任務名稱"
          autoFocus
        />
        <div className="grid grid-cols-2 gap-2">
          <select value={editState.assignee} onChange={(e) => setEditState(p => ({ ...p, assignee: e.target.value }))}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white">
            {ALL_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <div className="flex gap-1">
            <input type="date" value={editState.date} onChange={(e) => setEditState(p => ({ ...p, date: e.target.value }))}
              className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white" />
            <input type="time" value={editState.dueTime} onChange={(e) => setEditState(p => ({ ...p, dueTime: e.target.value }))}
              className="w-24 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white" placeholder="時間" />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">請做</label>
          <textarea value={editState.instruction} onChange={(e) => setEditState(p => ({ ...p, instruction: e.target.value }))}
            className="w-full mt-1 text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-400 min-h-[60px] resize-y"
            placeholder="具體指示說明..." />
        </div>
        <div>
          <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">交付</label>
          <textarea value={editState.deliverable} onChange={(e) => setEditState(p => ({ ...p, deliverable: e.target.value }))}
            className="w-full mt-1 text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-400 min-h-[60px] resize-y"
            placeholder="請交什麼給我（檔案、連結、截圖...）" />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={() => setIsEditing(false)} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5">取消</button>
          <button onClick={handleSave} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 flex items-center gap-1">
            <Save size={12} /> 儲存
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`group rounded-xl border shadow-sm overflow-hidden transition-all duration-300 ${
      todo.completed ? 'opacity-50 scale-[0.99] border-gray-100 bg-gray-50' : 'border-indigo-200 bg-indigo-50/40'
    }`}>
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={onToggle}
          className={`shrink-0 transition-all duration-200 active:scale-125 ${todo.completed ? 'text-green-500' : 'text-indigo-300 hover:text-indigo-500'}`}
          aria-label={todo.completed ? '標記為未完成' : '標記為完成'}
        >
          {todo.completed ? <CheckCircle2 size={22} /> : <Circle size={22} />}
        </button>
        <ClipboardList size={14} className="text-indigo-400 shrink-0" />
        <p className={`text-sm font-semibold flex-1 min-w-0 truncate ${todo.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
          {todo.text}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          {todo.dueTime && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full border border-indigo-200">
              截止 {todo.dueTime}
            </span>
          )}
          {todo.priority && (
            <span className={`text-[10px] font-bold flex items-center gap-0.5 ${PRIORITY_STYLES[todo.priority]}`}>
              <Flag size={10} />{PRIORITY_LABELS[todo.priority]}
            </span>
          )}
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] text-white font-bold ${getAvatarColor(todo.assignee)}`}>
            {todo.assignee.charAt(0)}
          </div>
          <span className="text-xs text-gray-600 font-medium">{todo.assignee}</span>
          {canEdit && (
            <>
              <button onClick={() => setIsEditing(true)}
                className="p-1.5 text-gray-300 hover:text-indigo-500 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                aria-label="編輯">
                <Edit2 size={13} />
              </button>
              <button onClick={onDelete}
                className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                aria-label="刪除">
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Body: instruction + deliverable */}
      {(todo.instruction || todo.deliverable) && !todo.completed && (
        <div className="px-4 pb-3 space-y-2 border-t border-indigo-100">
          {todo.instruction && (
            <div className="pt-2">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">請做</span>
              <p className="text-xs text-gray-700 mt-0.5 whitespace-pre-wrap">{todo.instruction}</p>
            </div>
          )}
          {todo.deliverable && (
            <div>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">交付</span>
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

  // Task creation form (admin-only)
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState(ALL_MEMBERS[0]);
  const [newTaskPriority, setNewTaskPriority] = useState<TodoItem['priority']>(undefined);
  const [newTaskDueTime, setNewTaskDueTime] = useState('');
  const [newTaskInstruction, setNewTaskInstruction] = useState('');
  const [newTaskDeliverable, setNewTaskDeliverable] = useState('');

  const handleAddTask = useCallback(() => {
    if (!newTaskTitle.trim()) return;
    addTodo(newTaskTitle, newTaskAssignee, selectedDate, newTaskPriority, undefined, {
      type: 'task',
      instruction: newTaskInstruction || undefined,
      deliverable: newTaskDeliverable || undefined,
      dueTime: newTaskDueTime || undefined,
    });
    setNewTaskTitle('');
    setNewTaskInstruction('');
    setNewTaskDeliverable('');
    setNewTaskDueTime('');
    setNewTaskPriority(undefined);
    setShowTaskForm(false);
  }, [newTaskTitle, newTaskAssignee, selectedDate, newTaskPriority, newTaskDueTime, newTaskInstruction, newTaskDeliverable, addTodo]);

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
    addTodo(newText, newAssignee, selectedDate, newPriority, newLinkedQA || undefined);
    setNewText('');
    setNewPriority(undefined);
    setNewLinkedQA('');
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [newText, newAssignee, selectedDate, newPriority, newLinkedQA, addTodo]);

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

  const renderTodoCard = (todo: TodoItem) => {
    if (todo.type === 'task') {
      return (
        <TaskCard
          key={todo.id}
          todo={todo}
          canEdit={canEdit(todo)}
          onToggle={() => toggleTodo(todo.id, !todo.completed)}
          onDelete={() => deleteTodo(todo.id)}
          onUpdate={(updates) => updateTodo(todo.id, updates)}
        />
      );
    }
    return (
      <TodoCard
        key={todo.id}
        todo={todo}
        canEdit={canEdit(todo)}
        qaItems={qaItems}
        onToggle={() => toggleTodo(todo.id, !todo.completed)}
        onDelete={() => deleteTodo(todo.id)}
        onUpdate={(updates) => updateTodo(todo.id, updates)}
        onNavigateToQA={onNavigateToQA}
      />
    );
  };

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

      {/* Add new todo */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6 space-y-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="新增待辦事項..."
            className="flex-1 text-sm border-none outline-none bg-transparent placeholder:text-gray-400"
          />
          <button
            onClick={handleAdd}
            disabled={!newText.trim()}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            aria-label="新增待辦"
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={newAssignee}
            onChange={(e) => setNewAssignee(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
          >
            {ALL_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select
            value={newPriority || ''}
            onChange={(e) => setNewPriority((e.target.value || undefined) as TodoItem['priority'])}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
          >
            <option value="">優先級</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
          <select
            value={newLinkedQA}
            onChange={(e) => setNewLinkedQA(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white max-w-[180px]"
          >
            <option value="">關聯 QA</option>
            {qaItems.filter(q => isActive(q.currentFlow)).map(q => (
              <option key={q.id} value={q.id}>{q.id} — {(q.title || q.description).substring(0, 20)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Task creation panel (admin only) */}
      {isAdmin && (
        <div className="mb-6">
          {!showTaskForm ? (
            <button
              onClick={() => setShowTaskForm(true)}
              className="w-full flex items-center gap-2 text-xs font-bold text-indigo-500 hover:text-indigo-700 border border-dashed border-indigo-300 rounded-xl px-4 py-2.5 hover:bg-indigo-50/50 transition-colors"
            >
              <ClipboardList size={14} />
              指派任務單給 RD
            </button>
          ) : (
            <div className="bg-indigo-50/60 rounded-xl border-2 border-indigo-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-bold text-indigo-700">
                  <ClipboardList size={15} /> 新任務單
                </span>
                <button onClick={() => setShowTaskForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              </div>
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                placeholder="任務名稱"
                autoFocus
                className="w-full text-sm font-semibold border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newTaskAssignee}
                  onChange={(e) => setNewTaskAssignee(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                >
                  {ALL_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <div className="flex gap-1">
                  <select
                    value={newTaskPriority || ''}
                    onChange={(e) => setNewTaskPriority((e.target.value || undefined) as TodoItem['priority'])}
                    className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                  >
                    <option value="">優先級</option>
                    <option value="high">高</option>
                    <option value="medium">中</option>
                    <option value="low">低</option>
                  </select>
                  <input
                    type="time"
                    value={newTaskDueTime}
                    onChange={(e) => setNewTaskDueTime(e.target.value)}
                    className="w-24 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                    title="截止時間"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">請做</label>
                <textarea
                  value={newTaskInstruction}
                  onChange={(e) => setNewTaskInstruction(e.target.value)}
                  className="w-full mt-1 text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-400 min-h-[60px] resize-y bg-white"
                  placeholder="具體指示說明..."
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">交付</label>
                <textarea
                  value={newTaskDeliverable}
                  onChange={(e) => setNewTaskDeliverable(e.target.value)}
                  className="w-full mt-1 text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-400 min-h-[60px] resize-y bg-white"
                  placeholder="請交什麼給我（檔案、連結、截圖...）"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowTaskForm(false)} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5">取消</button>
                <button
                  onClick={handleAddTask}
                  disabled={!newTaskTitle.trim()}
                  className="text-xs bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus size={12} /> 指派
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
