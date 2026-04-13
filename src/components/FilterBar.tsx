import React, { useState } from 'react';
import { Search, List, Columns, X, User } from 'lucide-react';
import { QA_FLOWS, RDS, MODULES } from '../constants';
import { ViewMode } from '../types';

interface FilterBarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  priorityFilter: string;
  setPriorityFilter: (p: string) => void;
  statusFilters: string[];
  setStatusFilters: (s: string[]) => void;
  assigneeFilters: string[];
  setAssigneeFilters: (a: string[]) => void;
  moduleFilters: string[];
  setModuleFilters: (m: string[]) => void;
  selectedVersion: string;
  setSelectedVersion: (v: string) => void;
  versions: string[];
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  dateRange: { start: string; end: string };
  setDateRange: (range: { start: string; end: string }) => void;
  currentUserName?: string;
}

const toggleItem = (arr: string[], item: string): string[] =>
  arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery, setSearchQuery,
  priorityFilter, setPriorityFilter,
  statusFilters, setStatusFilters,
  assigneeFilters, setAssigneeFilters,
  moduleFilters, setModuleFilters,
  selectedVersion, setSelectedVersion,
  versions,
  viewMode, setViewMode,
  dateRange, setDateRange,
  currentUserName,
}) => {
  const priorities = ['全部', 'P0', 'P1', 'P2', 'P3', '-'];
  const [showFilters, setShowFilters] = useState(false);
  const totalActiveFilters = statusFilters.length + assigneeFilters.length + moduleFilters.length + (priorityFilter !== '全部' ? 1 : 0);

  const isMyTasks = currentUserName && assigneeFilters.length === 1 && assigneeFilters[0] === currentUserName;

  const handleMyTasks = () => {
    if (isMyTasks) {
      setAssigneeFilters([]);
    } else if (currentUserName) {
      setAssigneeFilters([currentUserName]);
    }
  };

  const clearAll = () => {
    setStatusFilters([]);
    setAssigneeFilters([]);
    setModuleFilters([]);
    setPriorityFilter('全部');
    setDateRange({ start: '', end: '' });
    setSelectedVersion('all');
  };

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 space-y-3">
      {/* Row 1: Search + quick actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="搜尋標題、敘述或編號..."
            className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* My Tasks quick button */}
          {currentUserName && (
            <button
              onClick={handleMyTasks}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors border ${
                isMyTasks
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              <User size={14} />
              我的任務
            </button>
          )}

          {/* Version */}
          <select
            className="px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500"
            value={selectedVersion}
            onChange={(e) => setSelectedVersion(e.target.value)}
          >
            <option value="all">所有版本</option>
            {versions.map(v => <option key={v} value={v}>{v}</option>)}
          </select>

          {/* Date range */}
          <div className="flex items-center gap-1">
            <input
              type="date"
              className="text-xs border border-gray-200 rounded-lg px-2 py-2 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-[120px]"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            />
            <span className="text-gray-400 text-xs">~</span>
            <input
              type="date"
              className="text-xs border border-gray-200 rounded-lg px-2 py-2 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-[120px]"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            />
          </div>

          {/* Toggle filter pills visibility */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors border ${
              totalActiveFilters > 0
                ? 'bg-blue-50 text-blue-600 border-blue-200'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}
          >
            篩選{totalActiveFilters > 0 ? ` (${totalActiveFilters})` : ''}
          </button>

          {/* View mode */}
          <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="表格模式"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="看板模式"
            >
              <Columns size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: Inline pill filters (collapsible) */}
      {showFilters && (
        <div className="space-y-2 pt-2 border-t border-gray-100">
          {/* Priority pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-12 shrink-0">優先級</span>
            {['P0', 'P1', 'P2', 'P3', '-'].map(p => (
              <button
                key={p}
                onClick={() => setPriorityFilter(priorityFilter === p ? '全部' : p)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors border ${
                  priorityFilter === p
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                {p === '-' ? '無' : p}
              </button>
            ))}
          </div>

          {/* Status pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-12 shrink-0">狀態</span>
            {QA_FLOWS.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilters(toggleItem(statusFilters, s))}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors border ${
                  statusFilters.includes(s)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Assignee pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-12 shrink-0">負責人</span>
            {RDS.map(a => (
              <button
                key={a}
                onClick={() => setAssigneeFilters(toggleItem(assigneeFilters, a))}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors border ${
                  assigneeFilters.includes(a)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                {a}
              </button>
            ))}
          </div>

          {/* Module pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-12 shrink-0">模組</span>
            {MODULES.map(m => (
              <button
                key={m}
                onClick={() => setModuleFilters(toggleItem(moduleFilters, m))}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors border ${
                  moduleFilters.includes(m)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Clear all */}
          {totalActiveFilters > 0 && (
            <div className="pt-1">
              <button onClick={clearAll} className="text-xs text-red-500 hover:text-red-600 font-bold">
                清除全部篩選
              </button>
            </div>
          )}
        </div>
      )}

      {/* Active filter tags (shown when filters panel is closed) */}
      {!showFilters && (totalActiveFilters > 0 || priorityFilter !== '全部' || dateRange.start || dateRange.end) && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100">
          {priorityFilter !== '全部' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg border border-blue-200">
              {priorityFilter}
              <button onClick={() => setPriorityFilter('全部')} className="hover:text-blue-900"><X size={10} /></button>
            </span>
          )}
          {statusFilters.map(s => (
            <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg border border-blue-200">
              {s}
              <button onClick={() => setStatusFilters(statusFilters.filter(f => f !== s))} className="hover:text-blue-900"><X size={10} /></button>
            </span>
          ))}
          {assigneeFilters.map(a => (
            <span key={a} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg border border-blue-200">
              {a}
              <button onClick={() => setAssigneeFilters(assigneeFilters.filter(f => f !== a))} className="hover:text-blue-900"><X size={10} /></button>
            </span>
          ))}
          {moduleFilters.map(m => (
            <span key={m} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg border border-blue-200">
              {m}
              <button onClick={() => setModuleFilters(moduleFilters.filter(f => f !== m))} className="hover:text-blue-900"><X size={10} /></button>
            </span>
          ))}
          {(dateRange.start || dateRange.end) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg border border-blue-200">
              {dateRange.start || '...'} ~ {dateRange.end || '...'}
              <button onClick={() => setDateRange({ start: '', end: '' })} className="hover:text-blue-900"><X size={10} /></button>
            </span>
          )}
          <button onClick={clearAll} className="text-[10px] text-red-500 hover:text-red-600 font-bold ml-1">
            清除
          </button>
        </div>
      )}
    </div>
  );
};
