import { useState, useEffect } from 'react';

const loadFilter = <T,>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(`qa_filter_${key}`);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};

export function useQAFilters() {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState(() => loadFilter('priority', '全部'));
  const [statusFilters, setStatusFilters] = useState<string[]>(() => loadFilter('status', []));
  const [assigneeFilters, setAssigneeFilters] = useState<string[]>(() => loadFilter('assignee', []));
  const [moduleFilters, setModuleFilters] = useState<string[]>(() => loadFilter('module', []));
  const [selectedVersion, setSelectedVersion] = useState<string>(() => loadFilter('version', 'all'));
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => loadFilter('dateRange', { start: '', end: '' }));
  const [hideClosed, setHideClosed] = useState(() => loadFilter('hideClosed', true));

  useEffect(() => {
    localStorage.setItem('qa_filter_priority', JSON.stringify(priorityFilter));
    localStorage.setItem('qa_filter_status', JSON.stringify(statusFilters));
    localStorage.setItem('qa_filter_assignee', JSON.stringify(assigneeFilters));
    localStorage.setItem('qa_filter_module', JSON.stringify(moduleFilters));
    localStorage.setItem('qa_filter_version', JSON.stringify(selectedVersion));
    localStorage.setItem('qa_filter_dateRange', JSON.stringify(dateRange));
    localStorage.setItem('qa_filter_hideClosed', JSON.stringify(hideClosed));
  }, [priorityFilter, statusFilters, assigneeFilters, moduleFilters, selectedVersion, dateRange, hideClosed]);

  return {
    searchQuery, setSearchQuery,
    priorityFilter, setPriorityFilter,
    statusFilters, setStatusFilters,
    assigneeFilters, setAssigneeFilters,
    moduleFilters, setModuleFilters,
    selectedVersion, setSelectedVersion,
    dateRange, setDateRange,
    hideClosed, setHideClosed,
  };
}
