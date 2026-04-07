import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, Save, X, BookOpen, FolderOpen } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useWikiPages } from '../hooks/useWikiPages';
import { WikiPage, WikiCategory } from '../types';
import { EmptyState } from './EmptyState';
import { formatTimestamp, getAvatarColor } from '../utils/qaUtils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const CATEGORIES: { value: WikiCategory; label: string }[] = [
  { value: 'API', label: 'API' },
  { value: '設計規範', label: '設計規範' },
  { value: '產品規格', label: '產品規格' },
  { value: '一般', label: '一般' },
];

export const WikiPageView: React.FC = () => {
  const { user } = useAppContext();
  const { pages, isLoading, addPage, updatePage, deletePage } = useWikiPages(user);

  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<WikiCategory | 'all'>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<WikiCategory>('一般');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredPages = useMemo(() => {
    return pages.filter(p => {
      const matchCategory = filterCategory === 'all' || p.category === filterCategory;
      const matchSearch = !searchQuery ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [pages, filterCategory, searchQuery]);

  const groupedPages = useMemo(() => {
    const groups: Record<string, WikiPage[]> = {};
    filteredPages.forEach(p => {
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    });
    return groups;
  }, [filteredPages]);

  const selectedPage = pages.find(p => p.id === selectedPageId) || null;

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const id = await addPage(newTitle, newCategory);
    if (id) {
      setSelectedPageId(id);
      setIsEditing(true);
      setEditContent('');
      setEditTitle(newTitle);
    }
    setNewTitle('');
    setShowCreateForm(false);
  };

  const handleStartEdit = () => {
    if (!selectedPage) return;
    setEditTitle(selectedPage.title);
    setEditContent(selectedPage.content);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!selectedPage) return;
    updatePage(selectedPage.id, { title: editTitle, content: editContent });
    setIsEditing(false);
  };

  // Auto-save after 2s of inactivity while editing
  useEffect(() => {
    if (!isEditing || !selectedPage) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      updatePage(selectedPage.id, { title: editTitle, content: editContent });
    }, 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [editContent, editTitle]);

  if (!user) return null;

  return (
    <div className="flex gap-6 max-w-6xl mx-auto" style={{ minHeight: 'calc(100vh - 200px)' }}>
      {/* Left: Page list */}
      <div className="w-72 shrink-0 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shrink-0"
            aria-label="新增頁面"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-colors ${filterCategory === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            全部
          </button>
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => setFilterCategory(c.value)}
              className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-colors ${filterCategory === c.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Page list grouped by category */}
        <div className="space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 350px)' }}>
          {Object.entries(groupedPages).map(([category, categoryPages]) => (
            <div key={category}>
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <FolderOpen size={12} /> {category} ({categoryPages.length})
              </h4>
              <div className="space-y-1">
                {categoryPages.map(page => (
                  <button
                    key={page.id}
                    onClick={() => { setSelectedPageId(page.id); setIsEditing(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedPageId === page.id ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <p className="truncate">{page.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{formatTimestamp(page.updatedAt)}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {filteredPages.length === 0 && !isLoading && (
            <EmptyState compact title="沒有找到頁面" />
          )}
        </div>
      </div>

      {/* Right: Content */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {selectedPage ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              {isEditing ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="text-lg font-bold text-gray-900 border-none outline-none flex-1 bg-transparent"
                />
              ) : (
                <h2 className="text-lg font-bold text-gray-900">{selectedPage.title}</h2>
              )}
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <span className="text-[10px] text-gray-400">自動儲存中</span>
                    <button onClick={handleSave} className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-blue-700">
                      <Save size={12} /> 完成編輯
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={handleStartEdit} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" aria-label="編輯">
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => { if (confirm('確定要刪除此頁面嗎？')) { deletePage(selectedPage.id); setSelectedPageId(null); } }}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                      aria-label="刪除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
              {isEditing ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full min-h-[400px] text-sm font-mono border border-gray-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                  placeholder="開始撰寫內容... (支援 Markdown)"
                />
              ) : selectedPage.content ? (
                <div className="prose prose-blue max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedPage.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">尚無內容，點擊右上角編輯按鈕開始撰寫</p>
              )}
            </div>

            {/* Footer info */}
            <div className="px-6 py-3 border-t border-gray-100 flex items-center gap-4 text-[10px] text-gray-400">
              <span>分類：{selectedPage.category}</span>
              <span>建立者：{selectedPage.createdByName}</span>
              <span>最後更新：{formatTimestamp(selectedPage.updatedAt)} by {selectedPage.updatedByName}</span>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <EmptyState
              icon={<BookOpen size={32} className="text-gray-300" />}
              title="選擇一個頁面或建立新頁面"
              description="從左側選擇頁面，或點擊 + 按鈕建立"
            />
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreateForm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowCreateForm(false)} />
          <div className="fixed inset-x-4 top-[25%] z-50 max-w-md mx-auto bg-white rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">建立新頁面</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">標題 *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="頁面標題"
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">分類</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as WikiCategory)}
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowCreateForm(false)} className="text-sm text-gray-500 px-4 py-2">取消</button>
              <button onClick={handleCreate} disabled={!newTitle.trim()} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-40">
                建立
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
