import React, { useState, useMemo, useEffect } from 'react';
import { FileText, Plus, Download, LogOut } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { auth, db } from './firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { writeBatch, doc } from 'firebase/firestore';
import { qaData as initialData } from './data';
import { AnimatePresence } from 'motion/react';

// Types & Constants
import { AugmentedQAItem, ViewMode } from './types';

// Hooks
import { useQAItems } from './hooks/useQAItems';
import { normalizeDate } from './utils/qaUtils';

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

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  const isAdmin = useMemo(() => {
    return user?.email === 'ian@osensetech.com';
  }, [user]);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('全部');
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [assigneeFilters, setAssigneeFilters] = useState<string[]>([]);
  const [moduleFilters, setModuleFilters] = useState<string[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  // UI States
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Filter Dropdown States
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const { 
    data, 
    isLoading,
    updateItem, 
    addItem, 
    deleteItem, 
    addComment, 
    deleteComment, 
    editComment,
    bulkUpdate 
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

  const handleSeedData = async () => {
    if (!user) return;
    const loadingToast = toast.loading('正在匯入資料...');
    try {
      const batch = writeBatch(db);
      initialData.forEach(item => {
        const docRef = doc(db, 'qa_items', item.id);
        const normalizedItem = { ...item, date: normalizeDate(item.date) };
        batch.set(docRef, { ...normalizedItem, authorUID: user.uid, createdAt: Date.now() });
      });
      await batch.commit();
      toast.success('初始資料匯入成功！', { id: loadingToast });
    } catch (error) {
      toast.error('匯入失敗！', { id: loadingToast });
    }
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
      date: new Date().toISOString().split('T')[0],
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
        await updateItem(editForm.id, editForm, selectedItem as any);
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
        setEditForm((prev: any) => {
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
        setEditForm((prev: any) => {
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

  // Callbacks for Kanban
  const handleKanbanItemClick = React.useCallback((item: AugmentedQAItem) => {
    setSelectedItemId(item.id);
  }, []);

  const handleKanbanStatusChange = React.useCallback((item: AugmentedQAItem, status: string) => {
    updateItem(item.id, { currentFlow: status }, item);
  }, [updateItem]);

  if (!isAuthReady || isLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">載入中...</div>;
  if (!user) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full text-center">
        <FileText className="text-blue-600 w-16 h-16 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">P4 每週版更 QA 追蹤系統</h1>
        <p className="text-gray-500 mb-8">請登入以存取團隊資料庫</p>
        <button onClick={handleLogin} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-200">
          使用 Google 帳號登入
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-4 md:p-8">
      <Toaster position="top-center" richColors />
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
              <FileText className="text-blue-600 shrink-0" size={32} />
              QA TRACKER <span className="text-blue-600">PRO</span>
            </h1>
            <p className="text-gray-500 mt-1 font-medium">數據分析與任務管理儀表板</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {isAdmin && (
              <button onClick={handleSeedData} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-md text-sm font-bold">
                匯入/重置初始資料
              </button>
            )}
            <button onClick={handleAddNew} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-md text-sm font-bold">
              <Plus size={18} /> 新增問題
            </button>
            <NotificationCenter user={user} onItemClick={(itemId) => setSelectedItemId(itemId)} />
            <button onClick={handleExport} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-md text-sm font-bold">
              <Download size={18} /> 匯出 CSV
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl transition-all border border-gray-200 shadow-sm text-sm font-bold">
              <LogOut size={18} /> 登出
            </button>
          </div>
        </header>

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
          onClearSelection={() => setSelectedIds([])}
        />

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
      </div>
    </div>
  );
}
