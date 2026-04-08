import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, X, Bug, CheckSquare, BookOpen, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../contexts/AppContext';
import { useQAItems } from '../hooks/useQAItems';
import { useWikiPages } from '../hooks/useWikiPages';
import { useTodos } from '../hooks/useTodos';
import { normalizeDate, getTodayStr } from '../utils/qaUtils';
import { STATUS_COLORS, PRIORITY_COLORS } from '../constants';
import { AppPage } from '../types';

interface GlobalSearchProps {
  onNavigate: (page: AppPage) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onNavigate }) => {
  const { user, isAuthReady, navigateToQAItem } = useAppContext();
  const { data: qaData } = useQAItems(user, isAuthReady);
  const { pages: wikiPages } = useWikiPages(user);
  const { todos } = useTodos(user, getTodayStr(), 'day');

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
    }
  }, [isOpen]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const items: { type: 'qa' | 'todo' | 'wiki'; id: string; title: string; subtitle: string; page: AppPage }[] = [];

    // QA items
    qaData.forEach(item => {
      const title = item.title || item.description.substring(0, 50);
      if (
        item.id.toLowerCase().includes(q) ||
        title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      ) {
        items.push({
          type: 'qa',
          id: item.id,
          title: `${item.id} — ${title.substring(0, 40)}`,
          subtitle: `${item.module} · ${item.assignee} · ${item.currentFlow}`,
          page: 'qa',
        });
      }
    });

    // Wiki pages
    wikiPages.forEach(page => {
      if (
        page.title.toLowerCase().includes(q) ||
        page.content.toLowerCase().includes(q)
      ) {
        items.push({
          type: 'wiki',
          id: page.id,
          title: page.title,
          subtitle: `${page.category} · 知識庫`,
          page: 'wiki',
        });
      }
    });

    // Todos
    todos.forEach(todo => {
      if (todo.text.toLowerCase().includes(q)) {
        items.push({
          type: 'todo',
          id: todo.id,
          title: todo.text.substring(0, 50),
          subtitle: `${todo.assignee} · ${todo.completed ? '已完成' : '待辦'}`,
          page: 'todo',
        });
      }
    });

    return items.slice(0, 10);
  }, [query, qaData, wikiPages, todos]);

  const typeIcon = (type: string) => {
    switch (type) {
      case 'qa': return <Bug size={14} className="text-red-500" />;
      case 'wiki': return <BookOpen size={14} className="text-purple-500" />;
      case 'todo': return <CheckSquare size={14} className="text-blue-500" />;
      default: return <FileText size={14} />;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      <div className="fixed inset-x-2 sm:inset-x-4 top-[8%] sm:top-[15%] z-[201] max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200"
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <Search size={20} className="text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedIdx(-1); }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, -1)); }
                else if (e.key === 'Enter' && selectedIdx >= 0 && results[selectedIdx]) {
                  const item = results[selectedIdx];
                  if (item.type === 'qa') { navigateToQAItem(item.id); } else { onNavigate(item.page); }
                  setIsOpen(false);
                }
              }}
              placeholder="搜尋 QA 項目、知識庫、待辦..."
              className="flex-1 text-sm border-none outline-none bg-transparent placeholder:text-gray-400"
            />
            <kbd className="hidden sm:inline text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 font-mono">ESC</kbd>
            <button onClick={() => setIsOpen(false)} className="sm:hidden text-gray-400 hover:text-gray-600 text-xs">✕</button>
          </div>

          {/* Results */}
          <div className="max-h-[50vh] overflow-y-auto">
            {query.trim() && results.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-400">找不到「{query}」的結果</div>
            )}
            {results.map((item, idx) => (
              <button
                key={`${item.type}-${item.id}-${idx}`}
                onClick={() => {
                  if (item.type === 'qa') {
                    navigateToQAItem(item.id);
                  } else {
                    onNavigate(item.page);
                  }
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-5 py-3 hover:bg-blue-50 transition-colors text-left border-b border-gray-50 last:border-0 ${idx === selectedIdx ? 'bg-blue-50' : ''}`}
              >
                {typeIcon(item.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">{item.title}</p>
                  <p className="text-[10px] text-gray-400">{item.subtitle}</p>
                </div>
              </button>
            ))}
            {!query.trim() && (
              <div className="p-6 text-center text-xs text-gray-400">
                輸入關鍵字搜尋 QA 項目、知識庫頁面、待辦事項
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
};
