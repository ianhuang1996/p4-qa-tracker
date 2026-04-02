import React, { useState, useMemo, useEffect } from 'react';
import { FileText, Plus, Download, ArrowUpDown } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { auth } from './firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { QAItem } from './data';
import { AnimatePresence } from 'motion/react';

// Types & Constants
import { AugmentedQAItem, ViewMode, AppPage } from './types';
import { ADMIN_EMAILS, SORT_EDITOR_EMAILS, PRIORITY_ORDER } from './constants';

// Hooks
import { useQAItems } from './hooks/useQAItems';
import { normalizeDate, getTodayStr } from './utils/qaUtils';

// Components
import { Dashboard } from './components/Dashboard';
import { FilterBar } from './components/FilterBar';
import { QAItemTable } from './components/QAItemTable';
import { QAItemKanban } from './components/QAItemKanban';
import { QAItemModal } from './components/QAItemModal';
import { BulkActions } from './components/BulkActions';
import { NotificationCenter } from './components/NotificationCenter';

import { z } from 'zod';

const qaItemSchema = z.object({
  title: z.string().min(1, '標題不可為空').max(100, '標題過長 (最大 100 字元)'),
  description: z.string().min(1, '問題敘述不可為空'),
  module: z.string().min(1, '模組不可為空'),
  tester: z.string().min(1, '測試人員不可為空'),
  assignee: z.string().min(1, '負責人不可為空'),
  priority: z.string().optional(),
  currentFlow: z.string().min(1, '狀態不可為空'),
});

import { NextReleaseBlock } from './components/NextReleaseBlock';
import { PrioritySortView } from './components/PrioritySortView';
import { Sidebar } from './components/Sidebar';
import { DailyTodo } from './components/DailyTodo';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  const isAdmin = useMemo(() => {
    return !!user?.email && ADMIN_EMAILS.includes(user.email);
  }, [user]);

  const canSort = useMemo(() => {
    return !!user?.email && SORT_EDITOR_EMAILS.includes(user.email);
  }, [user]);

  const [showSortMode, setShowSortMode] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('全部');
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [assigneeFilters, setAssigneeFilters] = useState<string[]>([]);
  const [moduleFilters, setModuleFilters] = useState<string[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  // UI States
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('viewMode');
      if (saved === 'table' || saved === 'kanban') return saved;
    }
    return 'table';
  });

  useEffect(() => {
    localStorage.setItem('viewMode', viewMode);
  }, [viewMode]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editForm, setEditForm] = useState<QAItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Filter Dropdown States
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<AppPage>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('currentPage');
      if (saved === 'todo' || saved === 'qa') return saved;
    }
    return 'todo';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    localStorage.setItem('currentPage', currentPage);
  }, [currentPage]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const { 
    data, 
    isLoading,
    updateItem, 
    addItem, 
    deleteItem, 
    addComment, 
    deleteComment, 
    editComment,
    bulkUpdate,
    bulkDelete
  } = useQAItems(user, isAuthReady);

  // Auth Effect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Augmented Data Memo
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
        if (generalMatch) {
          category = generalMatch[1];
          cleanDesc = desc.replace(generalMatch[0], '').trim();
        }
      }
      
      if (!priority) priority = '-';
      const displayTitle = item.title || (cleanDesc.split('\n')[0].length > 30 ? cleanDesc.split('\n')[0].substring(0, 30) + '...' : cleanDesc.split('\n')[0]) || '未命名問題';
      const normalizedDate = normalizeDate(item.date);

      return { ...item, priority, category, cleanDesc, displayTitle, date: normalizedDate, comments: item.comments || [] };
    });
  }, [data]);

  // Derived selected item
  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    if (isAdding && editForm) {
      return { 
        ...editForm, 
        priority: editForm.priority || '-', 
        category: '', 
        cleanDesc: editForm.description || '', 
        displayTitle: editForm.title || '新增問題', 
        comments: [] 
      } as AugmentedQAItem;
    }
    return augmentedData.find(i => i.id === selectedItemId) || null;
  }, [augmentedData, selectedItemId, isAdding, editForm]);

  // Filtered Data Memo
  const filteredData = useMemo(() => {
    let result = augmentedData.filter(item => {
      const matchStatus = statusFilters.length === 0 || statusFilters.includes(item.currentFlow || '待處理');
      const matchAssignee = assigneeFilters.length === 0 || assigneeFilters.includes(item.assignee);
      const matchModule = moduleFilters.length === 0 || moduleFilters.includes(item.module);
      const matchPriority = priorityFilter === '全部' || item.priority === priorityFilter;
      const matchVersion = selectedVersion === 'all' || item.version === selectedVersion;
      
      const matchSearch = 
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchDate = (!dateRange.start || item.date >= dateRange.start) && 
                        (!dateRange.end || item.date <= dateRange.end);
      
      return matchStatus && matchAssignee && matchModule && matchPriority && matchSearch && matchVersion && matchDate;
    });

    if (sortConfig) {
      result = [...result].sort((a, b) => {
        const aValue = a[sortConfig.key as keyof AugmentedQAItem];
        const bValue = b[sortConfig.key as keyof AugmentedQAItem];

        if (sortConfig.key === 'id') {
          const numA = parseInt(String(aValue).replace(/\D/g, ''), 10) || 0;
          const numB = parseInt(String(bValue).replace(/\D/g, ''), 10) || 0;
          return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      // Default: sort by priority group, then sortOrder within group
      result = [...result].sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority] ?? 99;
        const pb = PRIORITY_ORDER[b.priority] ?? 99;
        if (pa !== pb) return pa - pb;
        const sa = a.sortOrder ?? 99999;
        const sb = b.sortOrder ?? 99999;
        return sa - sb;
      });
    }

    return result;
  }, [statusFilters, assigneeFilters, moduleFilters, priorityFilter, searchQuery, augmentedData, selectedVersion, dateRange, sortConfig]);

  const versions = useMemo(() => {
    const vSet = new Set<string>();
    data.forEach(item => { if (item.version) vSet.add(item.version); });
    return Array.from(vSet).sort().reverse();
  }, [data]);

  const quickStats = useMemo(() => {
    const totalActive = augmentedData.filter(i => i.currentFlow !== '已關閉' && i.currentFlow !== '已修復').length;
    const criticalBugs = augmentedData.filter(i => (i.priority === 'P0' || i.priority === 'P1') && i.currentFlow !== '已關閉' && i.currentFlow !== '已修復').length;
    const readyForTest = augmentedData.filter(i => i.currentFlow === '已修正待測試').length;
    const myPending = augmentedData.filter(i => 
      i.assignee === user?.displayName && 
      i.currentFlow !== '已關閉' && i.currentFlow !== '已修復'
    ).length;
    return { totalActive, criticalBugs, readyForTest, myPending };
  }, [augmentedData, user]);

  // Handlers
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try { await signInWithPopup(auth, provider); } catch (error) { console.error("Login failed", error); }
  };

  const handleLogout = async () => {
    try { await signOut(auth); } catch (error) { console.error("Logout failed", error); }
  };

  const handleExport = () => {
    const headers = ['編號', '優先級', '測試日期', '模組', '標題', '負責人', '狀態'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(item => [
        item.id, item.priority, item.date, item.module, 
        `"${item.displayTitle.replace(/"/g, '""')}"`,
        item.assignee, item.currentFlow
      ].join(','))
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'qa_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRemoveFromRelease = (item: AugmentedQAItem) => {
    updateItem(item.id, { isNextRelease: false, releaseNote: '' }, item);
  };

  const handleAutoAddReleaseItems = () => {
    const eligibleItems = augmentedData.filter(i => 
      i.currentFlow === '開發中' && !i.isNextRelease
    );
    if (eligibleItems.length === 0) return;
    const ids = eligibleItems.map(i => i.id);
    bulkUpdate(ids, { isNextRelease: true });
  };

  const handleAddNew = () => {
    // Generate a unique ID to prevent race conditions when clicking multiple times quickly
    const uniqueId = `Q_NEW_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const newItem = {
      id: uniqueId,
      title: '',
      priority: '-',
      date: getTodayStr(),
      module: '其他',
      tester: user?.displayName || 'Ian',
      description: '',
      imageLink: '',
      imageLinks: [],
      videoLink: '',
      videoLinks: [],
      currentFlow: '待處理',
      assignee: 'Unassigned',
      answer: '',
      version: selectedVersion !== 'all' ? selectedVersion : '',
      attachmentUrl: '',
      attachmentName: '',
      attachments: []
    };
    setEditForm(newItem);
    setIsAdding(true);
    setIsEditing(true);
    setSelectedItemId(newItem.id);
  };

  const handleSave = async () => {
    if (!editForm) return;

    try {
      // Validate schema
      qaItemSchema.parse({
        title: editForm.title || '',
        description: editForm.description || '',
        module: editForm.module || '',
        tester: editForm.tester || '',
        assignee: editForm.assignee || '',
        priority: editForm.priority || '-',
        currentFlow: editForm.currentFlow || '待處理',
      });

      if (isAdding) {
        // Calculate the real ID right before saving to ensure it's the absolute latest
        const maxId = data.reduce((max, item) => {
          const num = parseInt(item.id.replace(/\D/g, ''), 10);
          return !isNaN(num) && num > max ? num : max;
        }, 0);
        const finalId = `Q${maxId + 1}`;
        
        await addItem({ ...editForm, id: finalId });
      } else {
        await updateItem(editForm.id, editForm, selectedItem as QAItem);
      }
      
      setSelectedItemId(null);
      setIsEditing(false);
      setIsAdding(false);
    } catch (error) { 
      if (error instanceof z.ZodError) {
        toast.error((error as any).errors[0].message);
      } else {
        console.error('Save error:', error);
      }
    }
  };

  const handleImageUpload = async (file: File) => {
    const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
    if (!apiKey) { 
      toast.error('未設定 ImgBB API Key，請在環境變數中設定 VITE_IMGBB_API_KEY'); 
      return; 
    }
    
    setIsUploading(true);
    const toastId = toast.loading('圖片上傳中...');
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, { 
        method: 'POST', 
        body: formData 
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const resData = await response.json();
      
      if (resData.success) {
        setEditForm(prev => {
          if (!prev) return null;
          const newImageLinks = [...(prev.imageLinks || [])];
          newImageLinks.push(resData.data.url);
          return { ...prev, imageLinks: newImageLinks };
        });
        toast.success('圖片上傳成功！', { id: toastId });
      } else {
        console.error('ImgBB upload error:', resData);
        toast.error(`上傳失敗: ${resData.error?.message || '未知錯誤'}`, { id: toastId });
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      toast.error(`上傳失敗: ${error instanceof Error ? error.message : '網路錯誤'}`, { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    const toastId = toast.loading('附件上傳中...');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', { 
        method: 'POST', 
        body: formData 
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const resData = await response.json();
      
      if (resData.success) {
        setEditForm(prev => {
          if (!prev) return null;
          const newAttachments = [...(prev.attachments || [])];
          newAttachments.push({ name: resData.name, url: resData.url });
          return { ...prev, attachments: newAttachments };
        });
        toast.success('附件上傳成功！', { id: toastId });
      } else {
        toast.error(`上傳失敗: ${resData.error || '未知錯誤'}`, { id: toastId });
      }
    } catch (error) {
      console.error('File upload failed:', error);
      toast.error(`上傳失敗: ${error instanceof Error ? error.message : '網路錯誤'}`, { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        return null;
      }
      return { key, direction: 'asc' };
    });
  };

  const handleSaveSortOrder = async (updates: { id: string; sortOrder: number }[]) => {
    try {
      for (const { id, sortOrder } of updates) {
        await updateItem(id, { sortOrder });
      }
      toast.success('排序已儲存');
      setShowSortMode(false);
    } catch (error) {
      toast.error('排序儲存失敗');
    }
  };

  // Callbacks for Kanban
  const handleKanbanItemClick = React.useCallback((item: AugmentedQAItem) => {
    setSelectedItemId(item.id);
  }, []);

  const handleKanbanStatusChange = React.useCallback((item: AugmentedQAItem, status: string) => {
    updateItem(item.id, { currentFlow: status }, item);
  }, [updateItem]);

  if (!isAuthReady || isLoading) return (
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
  if (!user) return (
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

  const handleNavigateToQAItem = (itemId: string) => {
    setCurrentPage('qa');
    setSelectedItemId(itemId);
  };

  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-900 font-sans">
      <Toaster position="top-center" richColors />
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        user={user}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(prev => !prev)}
      />

      <main className="flex-1 min-h-screen overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Header — shared across pages */}
          <header className="flex items-center justify-between gap-6 pl-12 lg:pl-0">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                {currentPage === 'todo' ? '每日待辦' : 'QA 追蹤'}
              </h1>
              <p className="text-gray-500 mt-1 font-medium text-sm">
                {currentPage === 'todo' ? '管理團隊每日工作項目' : '數據分析與任務管理儀表板'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {currentPage === 'qa' && (
                <>
                  <button onClick={handleAddNew} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-md text-sm font-bold">
                    <Plus size={18} /> <span className="hidden sm:inline">新增問題</span>
                  </button>
                  <NotificationCenter user={user} onItemClick={(itemId) => setSelectedItemId(itemId)} />
                  {canSort && (
                    <button
                      onClick={() => setShowSortMode(true)}
                      className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-3 py-2.5 rounded-xl transition-all border border-gray-200 shadow-sm text-sm font-bold"
                      title="排序管理"
                      aria-label="排序管理"
                    >
                      <ArrowUpDown size={18} /> <span className="hidden sm:inline">排序</span>
                    </button>
                  )}
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-3 py-2.5 rounded-xl transition-all border border-gray-200 shadow-sm text-sm font-bold"
                    title="匯出 CSV"
                    aria-label="匯出 CSV"
                  >
                    <Download size={18} /> <span className="hidden sm:inline">匯出</span>
                  </button>
                </>
              )}
            </div>
          </header>

          {/* Page content */}
          {currentPage === 'todo' ? (
            <DailyTodo
              user={user}
              qaItems={augmentedData}
              onNavigateToQA={handleNavigateToQAItem}
            />
          ) : (
            <>
              <NextReleaseBlock
                items={augmentedData}
                onItemClick={(item) => setSelectedItemId(item.id)}
                onRemoveFromRelease={handleRemoveFromRelease}
                onAutoAddReleaseItems={handleAutoAddReleaseItems}
              />

              {/* Quick Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: '未結案問題', value: quickStats.totalActive, color: 'blue' },
                  { label: 'P0/P1 嚴重', value: quickStats.criticalBugs, color: 'red' },
                  { label: '待 PM 測試', value: quickStats.readyForTest, color: 'teal' },
                  { label: '我的待辦', value: quickStats.myPending, color: 'purple' }
                ].map(stat => (
                  <div key={stat.label} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                    <p className="text-2xl font-black text-gray-900">{stat.value}</p>
                  </div>
                ))}
              </div>

              <Dashboard items={augmentedData} />

              <FilterBar
                searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                priorityFilter={priorityFilter} setPriorityFilter={setPriorityFilter}
                statusFilters={statusFilters} setStatusFilters={setStatusFilters}
                assigneeFilters={assigneeFilters} setAssigneeFilters={setAssigneeFilters}
                moduleFilters={moduleFilters} setModuleFilters={setModuleFilters}
                selectedVersion={selectedVersion} setSelectedVersion={setSelectedVersion}
                versions={versions}
                viewMode={viewMode} setViewMode={setViewMode}
                isFilterOpen={isFilterOpen} setIsFilterOpen={setIsFilterOpen}
                dateRange={dateRange} setDateRange={setDateRange}
              />

              {viewMode === 'table' ? (
                <QAItemTable
                  items={filteredData}
                  onItemClick={(item) => setSelectedItemId(item.id)}
                  onStatusChange={(item, status) => updateItem(item.id, { currentFlow: status }, item)}
                  onAssigneeChange={(item, assignee) => updateItem(item.id, { assignee }, item)}
                  selectedIds={selectedIds}
                  setSelectedIds={setSelectedIds}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
              ) : (
                <QAItemKanban
                  items={filteredData}
                  onItemClick={handleKanbanItemClick}
                  onStatusChange={handleKanbanStatusChange}
                />
              )}

              <BulkActions
                selectedIds={selectedIds}
                onBulkUpdate={(updates) => {
                  bulkUpdate(selectedIds, updates);
                  setSelectedIds([]);
                }}
                onBulkDelete={() => {
                  bulkDelete(selectedIds);
                  setSelectedIds([]);
                }}
                onClearSelection={() => setSelectedIds([])}
              />
            </>
          )}

          <AnimatePresence>
            {selectedItem && (
              <QAItemModal
                item={selectedItem}
                isEditing={isEditing}
                isAdding={isAdding}
                editForm={editForm}
                setEditForm={setEditForm}
                onClose={() => { setSelectedItemId(null); setIsEditing(false); setIsAdding(false); }}
                onEdit={() => { setEditForm(selectedItem); setIsEditing(true); }}
                onSave={handleSave}
                onDelete={() => deleteItem(selectedItem.id).then(() => setSelectedItemId(null))}
                onCancel={() => {
                  setIsEditing(false);
                  if (isAdding) {
                    setSelectedItemId(null);
                    setIsAdding(false);
                  }
                }}
                onQuickStatusUpdate={(status) => updateItem(selectedItem.id, { currentFlow: status }, selectedItem)}
                onCommentSubmit={(text) => addComment(selectedItem.id, text)}
                onCommentDelete={(id) => deleteComment(selectedItem.id, id)}
                onCommentEdit={(id, text) => editComment(selectedItem.id, id, text)}
                user={user}
                isUploading={isUploading}
                onImageUpload={handleImageUpload}
                onFileUpload={handleFileUpload}
              />
            )}
          </AnimatePresence>

          {showSortMode && (
            <PrioritySortView
              items={augmentedData}
              onSave={handleSaveSortOrder}
              onClose={() => setShowSortMode(false)}
            />
          )}
        </div>
      </main>
    </div>
  );
}
