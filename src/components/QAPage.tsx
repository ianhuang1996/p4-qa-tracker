import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, Download, ArrowUpDown, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { AnimatePresence } from 'motion/react';
import { QAItem, AugmentedQAItem, ViewMode } from '../types';
import { PRIORITY_ORDER, BTN, STATUS } from '../constants';
import { useAugmentedQAItems } from '../hooks/useAugmentedQAItems';
import { useReleases } from '../hooks/useReleases';
import { getTodayStr } from '../utils/qaUtils';
import { useAppContext } from '../contexts/AppContext';
import { useQAFilters } from '../hooks/useQAFilters';
import { z } from 'zod';

import { Dashboard } from './Dashboard';
import { FilterBar } from './FilterBar';
import { QAItemTable } from './QAItemTable';
import { QAItemKanban } from './QAItemKanban';
import { QAItemModal } from './QAItemModal';
import { BulkActions } from './BulkActions';
import { NextReleaseBlock } from './NextReleaseBlock';
import { PrioritySortView } from './PrioritySortView';

const qaItemSchema = z.object({
  title: z.string().min(1, '標題不可為空').max(100, '標題過長 (最大 100 字元)'),
  description: z.string().min(1, '問題敘述不可為空'),
  module: z.string().min(1, '模組不可為空'),
  tester: z.string().min(1, '測試人員不可為空'),
  assignee: z.string().min(1, '負責人不可為空'),
  priority: z.string().optional(),
  currentFlow: z.string().min(1, '狀態不可為空'),
});

interface QAPageProps {
  onSelectItem?: (itemId: string) => void;
}

export const QAPage: React.FC<QAPageProps> = () => {
  const { user, isAuthReady, canSort, setCurrentPage, pendingItemId } = useAppContext();

  const {
    data, augmentedData, isLoading, updateItem, addItem, deleteItem,
    addComment, deleteComment, editComment, bulkUpdate, bulkDelete
  } = useAugmentedQAItems(user, isAuthReady);

  const { releases, linkItems, unlinkItem, unlinkItems } = useReleases(user);
  const activeRelease = useMemo(() => releases.find(r => r.status === 'planning' || r.status === 'uat') || null, [releases]);
  const unreleasedReleases = useMemo(() => releases.filter(r => r.status === 'planning' || r.status === 'uat'), [releases]);
  // Map: itemId → version string (for badge display)
  const itemReleaseMap = useMemo(() => {
    const map: Record<string, string> = {};
    unreleasedReleases.forEach(r => {
      r.linkedItemIds.forEach(id => { if (!map[id]) map[id] = r.version; });
    });
    return map;
  }, [unreleasedReleases]);

  const {
    searchQuery, setSearchQuery,
    priorityFilter, setPriorityFilter,
    statusFilters, setStatusFilters,
    assigneeFilters, setAssigneeFilters,
    moduleFilters, setModuleFilters,
    selectedVersion, setSelectedVersion,
    dateRange, setDateRange,
    hideClosed, setHideClosed,
  } = useQAFilters();

  // UI States
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('viewMode');
      if (saved === 'table' || saved === 'kanban') return saved;
    }
    return 'table';
  });

  React.useEffect(() => {
    localStorage.setItem('viewMode', viewMode);
  }, [viewMode]);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Open QA item from notification or external navigation
  useEffect(() => {
    if (pendingItemId) {
      setSelectedItemId(pendingItemId);
    }
  }, [pendingItemId]);

  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editForm, setEditForm] = useState<QAItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [showSortMode, setShowSortMode] = useState(false);

  // Map: version string → Set of linked item IDs (for version filtering)
  const releaseVersionItemMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    releases.forEach(r => { map[r.version] = new Set(r.linkedItemIds); });
    return map;
  }, [releases]);

  const activeReleaseLinkedItems = useMemo(() => {
    if (!activeRelease) return [];
    return augmentedData.filter(i => activeRelease.linkedItemIds.includes(i.id));
  }, [activeRelease, augmentedData]);

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

  const filteredData = useMemo(() => {
    let result = augmentedData.filter(item => {
      if (hideClosed && item.currentFlow === STATUS.closed) return false;
      const matchStatus = statusFilters.length === 0 || statusFilters.includes(item.currentFlow || STATUS.pending);
      const matchAssignee = assigneeFilters.length === 0 || assigneeFilters.includes(item.assignee);
      const matchModule = moduleFilters.length === 0 || moduleFilters.includes(item.module);
      const matchPriority = priorityFilter === '全部' || item.priority === priorityFilter;
      const matchVersion = selectedVersion === 'all' || (releaseVersionItemMap[selectedVersion]?.has(item.id) ?? false);
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
  }, [statusFilters, assigneeFilters, moduleFilters, priorityFilter, searchQuery, augmentedData, selectedVersion, releaseVersionItemMap, dateRange, sortConfig, hideClosed]);

  // Release versions for filter dropdown (sorted by scheduledDate desc)
  const versions = useMemo(() => {
    return [...releases]
      .sort((a, b) => (b.scheduledDate ?? '').localeCompare(a.scheduledDate ?? ''))
      .map(r => r.version);
  }, [releases]);

  const quickStats = useMemo(() => {
    const totalActive = augmentedData.filter(i => i.currentFlow !== STATUS.closed && i.currentFlow !== STATUS.fixed).length;
    const criticalBugs = augmentedData.filter(i => (i.priority === 'P0' || i.priority === 'P1') && i.currentFlow !== STATUS.closed && i.currentFlow !== STATUS.fixed).length;
    const readyForTest = augmentedData.filter(i => i.currentFlow === STATUS.readyToTest).length;
    const myPending = augmentedData.filter(i =>
      i.assignee === user?.displayName &&
      i.currentFlow !== STATUS.closed && i.currentFlow !== STATUS.fixed
    ).length;
    return { totalActive, criticalBugs, readyForTest, myPending };
  }, [augmentedData, user]);

  // Handlers
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

  const handleAddNew = () => {
    const uniqueId = `Q_NEW_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newItem = {
      id: uniqueId, title: '', priority: '-', date: getTodayStr(), module: '其他',
      tester: user?.displayName || 'Ian', description: '現況：\n\n預期結果：\n', imageLink: '', imageLinks: [],
      videoLink: '', videoLinks: [], currentFlow: STATUS.pending, assignee: 'Unassigned', answer: '',
      version: selectedVersion !== 'all' ? selectedVersion : '', attachmentUrl: '', attachmentName: '', attachments: []
    };
    setEditForm(newItem);
    setIsAdding(true);
    setIsEditing(true);
    setSelectedItemId(newItem.id);
  };

  const handleSave = async () => {
    if (!editForm) return;
    try {
      qaItemSchema.parse({
        title: editForm.title || '', description: editForm.description || '',
        module: editForm.module || '', tester: editForm.tester || '',
        assignee: editForm.assignee || '', priority: editForm.priority || '-',
        currentFlow: editForm.currentFlow || STATUS.pending,
      });
      if (isAdding) {
        const maxId = data.reduce((max, item) => {
          const num = parseInt(item.id.replace(/\D/g, ''), 10);
          return !isNaN(num) && num > max ? num : max;
        }, 0);
        await addItem({ ...editForm, id: `Q${maxId + 1}` });
      } else {
        await updateItem(editForm.id, editForm, selectedItem as QAItem);
      }
      setSelectedItemId(null);
      setIsEditing(false);
      setIsAdding(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0]?.message || '驗證失敗');
      } else {
        console.error('Save error:', error);
        toast.error(`儲存失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
      }
    }
  };

  const handleImageUpload = async (file: File) => {
    const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
    if (!apiKey) { toast.error('未設定 ImgBB API Key'); return; }
    setIsUploading(true);
    const toastId = toast.loading('圖片上傳中...');
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const resData = await response.json();
      if (resData.success) {
        setEditForm(prev => {
          if (!prev) return null;
          return { ...prev, imageLinks: [...(prev.imageLinks || []), resData.data.url] };
        });
        toast.success('圖片上傳成功！', { id: toastId });
      } else {
        toast.error(`上傳失敗: ${resData.error?.message || '未知錯誤'}`, { id: toastId });
      }
    } catch (error) {
      toast.error(`上傳失敗: ${error instanceof Error ? error.message : '網路錯誤'}`, { id: toastId });
    } finally { setIsUploading(false); }
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    const toastId = toast.loading('附件上傳中...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const resData = await response.json();
      if (resData.success) {
        setEditForm(prev => {
          if (!prev) return null;
          return { ...prev, attachments: [...(prev.attachments || []), { name: resData.name, url: resData.url }] };
        });
        toast.success('附件上傳成功！', { id: toastId });
      } else {
        toast.error(`上傳失敗: ${resData.error || '未知錯誤'}`, { id: toastId });
      }
    } catch (error) {
      toast.error(`上傳失敗: ${error instanceof Error ? error.message : '網路錯誤'}`, { id: toastId });
    } finally { setIsUploading(false); }
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
      for (const { id, sortOrder } of updates) { await updateItem(id, { sortOrder }, undefined, true); }
      toast.success('排序已儲存');
      setShowSortMode(false);
    } catch { toast.error('排序儲存失敗'); }
  };

  const handleKanbanItemClick = useCallback((item: AugmentedQAItem) => setSelectedItemId(item.id), []);
  const handleKanbanStatusChange = useCallback((item: AugmentedQAItem, status: string) => {
    updateItem(item.id, { currentFlow: status }, item);
  }, [updateItem]);

  if (!user) return null;

  return (
    <>
      {/* Header actions */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={handleAddNew} className={BTN.create}>
          <Plus size={18} /> <span className="hidden sm:inline">新增問題</span>
        </button>
        {canSort && (
          <button onClick={() => setShowSortMode(true)} className={BTN.secondary} aria-label="排序管理">
            <ArrowUpDown size={18} /> <span className="hidden sm:inline">排序</span>
          </button>
        )}
        <button onClick={handleExport} className={BTN.secondary} aria-label="匯出 CSV">
          <Download size={18} /> <span className="hidden sm:inline">匯出</span>
        </button>
        <button
          onClick={() => setHideClosed(prev => !prev)}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all border shadow-sm text-sm font-bold ${
            hideClosed ? 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200' : 'bg-blue-50 text-blue-700 border-blue-200'
          }`}
          title={hideClosed ? '顯示已關閉' : '隱藏已關閉'}
          aria-label={hideClosed ? '顯示已關閉項目' : '隱藏已關閉項目'}
        >
          {hideClosed ? <EyeOff size={18} /> : <Eye size={18} />}
          <span className="hidden sm:inline">{hideClosed ? '已隱藏關閉' : '顯示全部'}</span>
        </button>
      </div>

      <NextReleaseBlock releases={releases} allItems={augmentedData} onNavigateToRelease={() => setCurrentPage('release')} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
        {[
          { label: '未結案問題', value: quickStats.totalActive },
          { label: 'P0/P1 嚴重', value: quickStats.criticalBugs },
          { label: '待 PM 測試', value: quickStats.readyForTest },
          { label: '我的待辦', value: quickStats.myPending }
        ].map(stat => (
          <div key={stat.label} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-2xl font-black text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8"><Dashboard items={augmentedData} /></div>

      <div className="mt-8">
        <FilterBar
          searchQuery={searchQuery} setSearchQuery={setSearchQuery}
          priorityFilter={priorityFilter} setPriorityFilter={setPriorityFilter}
          statusFilters={statusFilters} setStatusFilters={setStatusFilters}
          assigneeFilters={assigneeFilters} setAssigneeFilters={setAssigneeFilters}
          moduleFilters={moduleFilters} setModuleFilters={setModuleFilters}
          selectedVersion={selectedVersion} setSelectedVersion={setSelectedVersion}
          versions={versions} viewMode={viewMode} setViewMode={setViewMode}
          dateRange={dateRange} setDateRange={setDateRange}
          currentUserName={user?.displayName || ''}
        />
      </div>

      <div className="mt-6">
        {viewMode === 'table' ? (
          <QAItemTable items={filteredData} onItemClick={(item) => setSelectedItemId(item.id)}
            onStatusChange={(item, status, retest) => updateItem(item.id, {
              currentFlow: status,
              ...(retest ? { retestResult: retest.retestResult, retestNote: retest.retestNote, retestDate: retest.retestDate, retestBy: retest.retestBy } : {}),
              ...(status === STATUS.fixed ? { fixedAt: Date.now() } : {}),
            }, item)}
            onAssigneeChange={(item, assignee) => updateItem(item.id, { assignee }, item)}
            selectedIds={selectedIds} setSelectedIds={setSelectedIds} sortConfig={sortConfig} onSort={handleSort}
            itemReleaseMap={itemReleaseMap} />
        ) : (
          <QAItemKanban items={filteredData} onItemClick={handleKanbanItemClick} onStatusChange={handleKanbanStatusChange} />
        )}
      </div>

      <BulkActions selectedIds={selectedIds}
        onBulkUpdate={(updates) => { bulkUpdate(selectedIds, updates); setSelectedIds([]); }}
        onBulkDelete={() => { bulkDelete(selectedIds); setSelectedIds([]); }}
        onClearSelection={() => setSelectedIds([])}
        activeReleaseVersion={activeRelease?.version}
        onBulkAddToRelease={activeRelease ? () => {
          linkItems(activeRelease.id, selectedIds);
          setSelectedIds([]);
        } : undefined}
        onBulkRemoveFromRelease={activeRelease ? () => {
          unlinkItems(activeRelease.id, selectedIds);
          setSelectedIds([]);
        } : undefined}
        unreleasedReleases={unreleasedReleases.map(r => ({ id: r.id, version: r.version }))}
        onBulkAddToSpecificRelease={(releaseId) => {
          linkItems(releaseId, selectedIds);
          setSelectedIds([]);
        }}
      />

      <AnimatePresence>
        {selectedItem && (
          <QAItemModal item={selectedItem} isEditing={isEditing} isAdding={isAdding} editForm={editForm} setEditForm={setEditForm}
            onClose={() => { setSelectedItemId(null); setIsEditing(false); setIsAdding(false); }}
            onEdit={() => { setEditForm(selectedItem); setIsEditing(true); }}
            onSave={handleSave}
            onDelete={() => deleteItem(selectedItem.id).then(() => setSelectedItemId(null))}
            onCancel={() => { setIsEditing(false); if (isAdding) { setSelectedItemId(null); setIsAdding(false); } }}
            onQuickStatusUpdate={(status) => updateItem(selectedItem.id, { currentFlow: status }, selectedItem)}
            onCommentSubmit={(text) => addComment(selectedItem.id, text)}
            onCommentDelete={(id) => deleteComment(selectedItem.id, id)}
            onCommentEdit={(id, text) => editComment(selectedItem.id, id, text)}
            user={user} isUploading={isUploading} onImageUpload={handleImageUpload} onFileUpload={handleFileUpload}
            activeReleaseVersion={activeRelease?.version}
            isInActiveRelease={activeRelease ? activeRelease.linkedItemIds.includes(selectedItem.id) : false}
            onToggleRelease={activeRelease ? (add) => {
              if (add) {
                linkItems(activeRelease.id, [selectedItem.id]);
              } else {
                unlinkItem(activeRelease.id, selectedItem.id);
              }
            } : undefined}
            unreleasedReleases={unreleasedReleases.map(r => ({ id: r.id, version: r.version, linkedItemIds: r.linkedItemIds }))}
            onLinkToRelease={(releaseId) => {
              linkItems(releaseId, [selectedItem.id]);
            }}
            onUnlinkFromRelease={(releaseId) => {
              unlinkItem(releaseId, selectedItem.id);
            }}
          />
        )}
      </AnimatePresence>

      {showSortMode && (
        <PrioritySortView items={augmentedData} onSave={handleSaveSortOrder} onClose={() => setShowSortMode(false)} />
      )}
    </>
  );
};
