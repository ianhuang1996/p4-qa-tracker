import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, Save, X, BookOpen, FolderOpen, Clock, Bold, Italic, List, Code, Link2, Heading } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useWikiPages } from '../hooks/useWikiPages';
import { WikiPage, WikiCategory } from '../types';
import { EmptyState } from './EmptyState';
import { ConfirmDialog } from './ConfirmDialog';
import { useConfirm } from '../hooks/useConfirm';
import { BTN } from '../constants';
import { formatTimestamp, getAvatarColor } from '../utils/qaUtils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const CATEGORIES: { value: WikiCategory; label: string }[] = [
  { value: 'API', label: 'API' },
  { value: '設計規範', label: '設計規範' },
  { value: '產品規格', label: '產品規格' },
  { value: '專案', label: '專案' },
  { value: '一般', label: '一般' },
];

export const WikiPageView: React.FC = () => {
  const { user, pendingWikiId, clearPendingWikiId } = useAppContext();
  const { pages, isLoading, error: wikiError, addPage, updatePage, deletePage } = useWikiPages(user);
  const { confirm, dialogProps } = useConfirm();

  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<WikiCategory | 'all'>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<WikiCategory>('一般');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Deep-link: auto-select page from global search
  useEffect(() => {
    if (pendingWikiId && pages.length > 0) {
      setSelectedPageId(pendingWikiId);
      setIsEditing(false);
      clearPendingWikiId();
    }
  }, [pendingWikiId, pages, clearPendingWikiId]);

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
    setSaveStatus('saving');
    saveTimerRef.current = setTimeout(async () => {
      await updatePage(selectedPage.id, { title: editTitle, content: editContent });
      setSaveStatus('saved');
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
    }, 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [editContent, editTitle, isEditing, selectedPage, updatePage]);

  if (!user) return null;

  return (
    <><ConfirmDialog {...dialogProps} />
    <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto" style={{ minHeight: 'calc(100vh - 200px)' }}>
      {/* Left: Page list — on mobile shows as top bar when no page selected */}
      <div className={`lg:w-72 lg:shrink-0 space-y-4 ${selectedPageId ? 'hidden lg:block' : ''}`}>
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

        {/* Recent edits */}
        {filteredPages.length > 0 && (
          <div className="mb-2">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Clock size={12} /> 最近編輯
            </h4>
            <div className="space-y-1">
              {[...filteredPages].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3).map(page => (
                <button
                  key={`recent-${page.id}`}
                  onClick={() => { setSelectedPageId(page.id); setIsEditing(false); }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    selectedPageId === page.id ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {page.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Page list grouped by category */}
        <div className="space-y-4 overflow-y-auto max-h-[60vh] lg:max-h-[calc(100vh-450px)]">
          {isLoading && pages.length === 0 && (
            <div className="space-y-3 animate-pulse">
              {[1, 2].map(g => (
                <div key={g}>
                  <div className="h-3 w-16 bg-gray-100 rounded mb-2" />
                  <div className="space-y-1">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-9 bg-gray-100 rounded-lg" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {Object.entries(groupedPages).map(([category, categoryPages]) => (
            <div key={category}>
              <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
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
          {wikiError && (
            <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
              ⚠ {wikiError}
            </div>
          )}
          {filteredPages.length === 0 && !isLoading && !wikiError && (
            <EmptyState compact title="沒有找到頁面" />
          )}
        </div>
      </div>

      {/* Right: Content */}
      <div className={`flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${!selectedPageId ? 'hidden lg:block' : ''}`}>
        {selectedPage ? (
          <>
            {/* Mobile back button */}
            <button
              onClick={() => setSelectedPageId(null)}
              className="lg:hidden flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 px-5 pt-3"
            >
              ← 返回頁面列表
            </button>
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs text-gray-400 px-5 pt-3">
              <span>知識庫</span>
              <span>/</span>
              <span>{selectedPage.category}</span>
              <span>/</span>
              <span className="text-gray-700 font-bold truncate">{selectedPage.title}</span>
            </nav>
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
                    {saveStatus === 'saving' && <span className="text-[10px] text-gray-400">儲存中…</span>}
                    {saveStatus === 'saved' && <span className="text-[10px] text-green-500 font-medium">已儲存 ✓</span>}
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
                      onClick={async () => { const ok = await confirm('確定要刪除此頁面嗎？', { title: '刪除頁面', confirmLabel: '刪除' }); if (ok) { deletePage(selectedPage.id); setSelectedPageId(null); } }}
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
                <div className="space-y-2">
                  {/* Markdown toolbar */}
                  <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1 bg-gray-50">
                    {[
                      { icon: <Heading size={14} />, insert: '## ', label: '標題' },
                      { icon: <Bold size={14} />, insert: '**粗體**', label: '粗體' },
                      { icon: <Italic size={14} />, insert: '*斜體*', label: '斜體' },
                      { icon: <List size={14} />, insert: '\n- ', label: '列表' },
                      { icon: <Code size={14} />, insert: '`程式碼`', label: '程式碼' },
                      { icon: <Link2 size={14} />, insert: '[文字](網址)', label: '連結' },
                    ].map(btn => (
                      <button
                        key={btn.label}
                        onClick={() => {
                          const ta = document.querySelector<HTMLTextAreaElement>('.wiki-editor');
                          if (ta) {
                            const start = ta.selectionStart;
                            const end = ta.selectionEnd;
                            const before = editContent.substring(0, start);
                            const after = editContent.substring(end);
                            setEditContent(before + btn.insert + after);
                            requestAnimationFrame(() => {
                              ta.focus();
                              const pos = start + btn.insert.length;
                              ta.setSelectionRange(pos, pos);
                            });
                          } else {
                            setEditContent(prev => prev + btn.insert);
                          }
                        }}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title={btn.label}
                      >
                        {btn.icon}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="wiki-editor w-full min-h-[400px] text-sm font-mono border border-gray-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                    placeholder="開始撰寫內容... (支援 Markdown)"
                  />
                </div>
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
              <button onClick={handleCreate} disabled={!newTitle.trim()} className={`${BTN.primary} disabled:opacity-40`}>
                建立
              </button>
            </div>
          </div>
        </>
      )}
    </div>
    </>
  );
};
