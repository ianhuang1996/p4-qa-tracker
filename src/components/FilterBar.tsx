import React from 'react';
import { Search, Filter, ChevronDown, List, Columns } from 'lucide-react';
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
  isFilterOpen: boolean;
  setIsFilterOpen: (o: boolean) => void;
  dateRange: { start: string; end: string };
  setDateRange: (range: { start: string; end: string }) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery, setSearchQuery,
  priorityFilter, setPriorityFilter,
  statusFilters, setStatusFilters,
  assigneeFilters, setAssigneeFilters,
  moduleFilters, setModuleFilters,
  selectedVersion, setSelectedVersion,
  versions,
  viewMode, setViewMode,
  isFilterOpen, setIsFilterOpen,
  dateRange, setDateRange
}) => {
  const priorities = ['全部', 'P0', 'P1', 'P2', 'P3', '-'];
  const totalActiveFilters = statusFilters.length + assigneeFilters.length + moduleFilters.length;

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="搜尋標題、敘述或編號..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
            <input 
              type="date" 
              className="bg-transparent text-xs border-none focus:ring-0 p-1"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            />
            <span className="text-gray-400 text-xs">~</span>
            <input 
              type="date" 
              className="bg-transparent text-xs border-none focus:ring-0 p-1"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            />
          </div>

          <select
            className="block w-full sm:w-28 pl-3 pr-8 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg border bg-white"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            {priorities.map(p => <option key={p} value={p}>{p === '全部' ? '優先級' : (p === '-' ? '無優先級' : p)}</option>)}
          </select>

          {/* Combined Filter Popover */}
          <div className="relative flex-1 sm:flex-none">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`w-full px-3 py-2 border rounded-lg bg-white text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between gap-2 ${totalActiveFilters > 0 ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-300'}`}
            >
              <Filter size={16} className={totalActiveFilters > 0 ? 'text-blue-600' : 'text-gray-400'} />
              <span className="truncate">篩選 {totalActiveFilters > 0 ? `(${totalActiveFilters})` : ''}</span>
              <ChevronDown size={14} className={`transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isFilterOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsFilterOpen(false)}></div>
                <div className="absolute z-20 top-full mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-xl p-4 right-0 sm:left-0 overflow-y-auto max-h-[80vh]">
                  <div className="space-y-6">
                    {/* Status */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">狀態</h4>
                      <div className="grid grid-cols-1 gap-1">
                        {QA_FLOWS.map(s => (
                          <label key={s} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded-md cursor-pointer text-sm">
                            <input type="checkbox" checked={statusFilters.includes(s)} onChange={(e) => {
                              if (e.target.checked) setStatusFilters([...statusFilters, s]);
                              else setStatusFilters(statusFilters.filter(f => f !== s));
                            }} className="rounded text-blue-600 focus:ring-blue-500" />
                            {s}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Assignee */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">負責人</h4>
                      <div className="grid grid-cols-1 gap-1">
                        {RDS.map(a => (
                          <label key={a} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded-md cursor-pointer text-sm">
                            <input type="checkbox" checked={assigneeFilters.includes(a)} onChange={(e) => {
                              if (e.target.checked) setAssigneeFilters([...assigneeFilters, a]);
                              else setAssigneeFilters(assigneeFilters.filter(f => f !== a));
                            }} className="rounded text-blue-600 focus:ring-blue-500" />
                            {a}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Module */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">模組</h4>
                      <div className="grid grid-cols-1 gap-1">
                        {MODULES.map(m => (
                          <label key={m} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded-md cursor-pointer text-sm">
                            <input type="checkbox" checked={moduleFilters.includes(m)} onChange={(e) => {
                              if (e.target.checked) setModuleFilters([...moduleFilters, m]);
                              else setModuleFilters(moduleFilters.filter(f => f !== m));
                            }} className="rounded text-blue-600 focus:ring-blue-500" />
                            {m}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                      <button 
                        onClick={() => {
                          setStatusFilters([]);
                          setAssigneeFilters([]);
                          setModuleFilters([]);
                        }}
                        className="text-xs text-red-500 hover:text-red-600 font-medium"
                      >
                        清除所有篩選
                      </button>
                      <button 
                        onClick={() => setIsFilterOpen(false)}
                        className="bg-blue-600 text-white px-3 py-1 rounded-md text-xs font-medium hover:bg-blue-700"
                      >
                        套用
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <select
            className="block w-full sm:w-32 pl-3 pr-8 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg border bg-white"
            value={selectedVersion}
            onChange={(e) => setSelectedVersion(e.target.value)}
          >
            <option value="all">所有版本</option>
            {versions.map(v => <option key={v} value={v}>{v}</option>)}
          </select>

          <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200 w-full sm:w-auto justify-center">
            <button 
              onClick={() => setViewMode('table')}
              className={`flex-1 sm:flex-none p-1.5 rounded-md transition-all flex justify-center ${viewMode === 'table' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="表格模式"
            >
              <List size={18} />
            </button>
            <button 
              onClick={() => setViewMode('kanban')}
              className={`flex-1 sm:flex-none p-1.5 rounded-md transition-all flex justify-center ${viewMode === 'kanban' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="看板模式"
            >
              <Columns size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
