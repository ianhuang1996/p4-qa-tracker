import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus, Rocket, CheckSquare, Square, Check, Trash2, X,
  ChevronRight, FileText, Link2, Play, Clock, Package, Sparkles, Loader2, Edit2, Copy, GripVertical
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppContext } from '../contexts/AppContext';
import { useReleases } from '../hooks/useReleases';
import { useQAItems } from '../hooks/useQAItems';
import { Release, AugmentedQAItem } from '../types';
import { STATUS_COLORS, PRIORITY_COLORS, PRIORITY_ORDER } from '../constants';
import { formatTimestamp, getAvatarColor, getTodayStr, augmentQAItems } from '../utils/qaUtils';
import { useUserTiers, getAvatarRing } from '../hooks/useAchievements';
import { EmptyState } from './EmptyState';
import { generateReleaseNotes } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const STATUS_BADGE: Record<string, string> = {
  planning: 'bg-blue-100 text-blue-700 border-blue-200',
  uat: 'bg-orange-100 text-orange-700 border-orange-200',
  released: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
};

const STATUS_LABEL: Record<string, string> = {
  planning: '規劃中',
  uat: 'UAT 測試',
  released: '已發布',
  cancelled: '已取消',
};

const MODULE_COLORS = [
  'bg-blue-50 text-blue-600 border-blue-200',
  'bg-purple-50 text-purple-600 border-purple-200',
  'bg-amber-50 text-amber-600 border-amber-200',
  'bg-rose-50 text-rose-600 border-rose-200',
  'bg-teal-50 text-teal-600 border-teal-200',
  'bg-orange-50 text-orange-600 border-orange-200',
  'bg-indigo-50 text-indigo-600 border-indigo-200',
  'bg-emerald-50 text-emerald-600 border-emerald-200',
];

// ─── Release Notes Parser ───────────────────────────────────────
interface NoteSection { emoji: string; title: string; items: string[] }

const parseReleaseNotes = (notes: string): NoteSection[] => {
  const sections: NoteSection[] = [];
  let current: NoteSection | null = null;
  for (const rawLine of notes.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const firstChar = [...line][0];
    const cp = firstChar.codePointAt(0) ?? 0;
    // Only match actual emoji ranges, exclude CJK (0x2E80–0x9FFF)
    const isEmoji = (cp >= 0x2600 && cp <= 0x27BF) || cp >= 0x1F000;
    if (isEmoji) {
      const spaceIdx = line.indexOf(' ');
      if (spaceIdx > 0) {
        current = { emoji: line.slice(0, spaceIdx), title: line.slice(spaceIdx + 1).trim(), items: [] };
        sections.push(current);
      }
    } else if (current && !line.startsWith('本次無')) {
      current.items.push(line);
    }
  }
  return sections;
};

const MAX_NOTE_ITEMS = 2;

const NotesSummary: React.FC<{ notes: string }> = ({ notes }) => {
  const sections = parseReleaseNotes(notes);
  if (!sections.length) return (
    <div className="text-xs text-gray-600 bg-white p-3 rounded-lg border border-gray-100 leading-relaxed line-clamp-3">
      {notes.substring(0, 200)}
    </div>
  );
  return (
    <div className="bg-white rounded-lg border border-gray-100 divide-y divide-gray-50">
      {sections.map((sec, i) => (
        <div key={i} className="px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-sm leading-none">{sec.emoji}</span>
            <span className="text-[11px] font-bold text-gray-700">{sec.title}</span>
            {sec.items.length > MAX_NOTE_ITEMS && (
              <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                +{sec.items.length - MAX_NOTE_ITEMS}
              </span>
            )}
          </div>
          <div className="space-y-1 pl-1">
            {(sec.items.length === 0
              ? [{ text: '本次無項目', empty: true }]
              : sec.items.slice(0, MAX_NOTE_ITEMS).map(t => ({ text: t, empty: false }))
            ).map((item, j) => (
              <div key={j} className="flex items-start gap-1.5 text-[11px] text-gray-500 leading-relaxed">
                <span className="text-gray-300 shrink-0 mt-px">·</span>
                <span className={`line-clamp-1 ${item.empty ? 'italic text-gray-300' : ''}`}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const getModuleColor = (mod: string): string => {
  let hash = 0;
  for (let i = 0; i < mod.length; i++) {
    hash = (hash << 5) - hash + mod.charCodeAt(i);
    hash |= 0;
  }
  return MODULE_COLORS[Math.abs(hash) % MODULE_COLORS.length];
};

// ─── Sortable Release Card ──────────────────────────────────────
const SortableReleaseCard: React.FC<{ release: Release; itemCount: number; onClick: () => void }> = ({ release, itemCount, onClick }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: release.id });
  const checkDone = release.checklist.filter(c => c.checked).length;

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={`relative ${isDragging ? 'z-10 opacity-90' : ''}`}>
      <div className={`w-full bg-white rounded-2xl border shadow-sm flex items-center transition-all ${
        isDragging ? 'border-blue-300 shadow-xl' : 'border-gray-200 hover:border-blue-200 hover:shadow-md'
      }`}>
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="px-3 py-5 text-gray-300 hover:text-gray-400 cursor-grab active:cursor-grabbing shrink-0 touch-none"
          aria-label="拖曳排序"
        >
          <GripVertical size={16} />
        </button>

        {/* Clickable main area */}
        <button onClick={onClick} className="flex-1 flex items-center gap-4 pr-4 py-4 text-left min-w-0">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
            <Package size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-gray-900">{release.version}</span>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border ${STATUS_BADGE[release.status]}`}>
                {STATUS_LABEL[release.status]}
              </span>
            </div>
            <p className="text-xs text-gray-500 truncate">{release.title} — {release.scheduledDate}</p>
          </div>
          <div className="text-right shrink-0 space-y-1">
            <p className="text-xs text-gray-500">{itemCount} 個項目</p>
            <p className="text-xs text-gray-400">檢查 {checkDone}/{release.checklist.length}</p>
            <div className="w-20 bg-gray-200 rounded-full h-1">
              <div
                className="bg-green-500 h-1 rounded-full"
                style={{ width: `${release.checklist.length > 0 ? (checkDone / release.checklist.length) * 100 : 0}%` }}
              />
            </div>
          </div>
          <ChevronRight size={16} className="text-gray-300 shrink-0 ml-2" />
        </button>
      </div>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────
export const ReleasePage: React.FC = () => {
  const { user, isAuthReady } = useAppContext();
  const {
    releases, isLoading, addRelease, updateRelease, deleteRelease,
    toggleChecklist, linkItems, unlinkItem, executeRelease, updateReleaseSortOrders,
  } = useReleases(user);
  const { data } = useQAItems(user, isAuthReady);
  const { tierByUserName } = useUserTiers(user);

  const [selectedReleaseId, setSelectedReleaseId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(getTodayStr());
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [expandedTimelineId, setExpandedTimelineId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [generatingNotes, setGeneratingNotes] = useState(false);
  const [editingReleasedAt, setEditingReleasedAt] = useState(false);
  const [releasedAtDraft, setReleasedAtDraft] = useState('');
  const [activeOrder, setActiveOrder] = useState<string[]>([]);

  const augmentedData = useMemo(() => augmentQAItems(data), [data]);

  const activeReleases = useMemo(
    () => releases.filter(r => r.status !== 'released' && r.status !== 'cancelled'),
    [releases],
  );
  const pastReleases = useMemo(
    () => releases.filter(r => r.status === 'released' || r.status === 'cancelled'),
    [releases],
  );

  // Sort active releases by sortOrder asc, fallback to createdAt desc
  const sortedActiveReleases = useMemo(() => (
    [...activeReleases].sort((a, b) => {
      if (a.sortOrder != null && b.sortOrder != null) return a.sortOrder - b.sortOrder;
      if (a.sortOrder != null) return -1;
      if (b.sortOrder != null) return 1;
      return b.createdAt - a.createdAt;
    })
  ), [activeReleases]);

  // Sync order state when active release IDs change (add/remove)
  const activeReleaseKey = useMemo(
    () => activeReleases.map(r => r.id).sort().join(','),
    [activeReleases],
  );
  useEffect(() => {
    setActiveOrder(sortedActiveReleases.map(r => r.id));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeReleaseKey]);

  const orderedActiveReleases = useMemo(() => {
    if (!activeOrder.length) return sortedActiveReleases;
    return activeOrder
      .map(id => activeReleases.find(r => r.id === id))
      .filter((r): r is Release => r != null);
  }, [activeOrder, activeReleases, sortedActiveReleases]);

  const releaseSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleReleaseDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = activeOrder.indexOf(active.id as string);
    const newIdx = activeOrder.indexOf(over.id as string);
    const newOrder = arrayMove(activeOrder, oldIdx, newIdx);
    setActiveOrder(newOrder);
    updateReleaseSortOrders(newOrder.map((id, idx) => ({ id, sortOrder: idx })));
  };

  const copyReleaseContent = (release: Release, _items: AugmentedQAItem[]) => {
    const date = release.scheduledDate.replace(/-/g, '/');
    const lines = [
      `標題：${release.version} — ${date}`,
      '',
      '版更內容：',
      release.releaseNotes || '（請先生成 Release Note）',
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    toast.success('更版內容已複製，可貼到 LINE 群組');
  };

  const selectedRelease = releases.find(r => r.id === selectedReleaseId) || null;

  const linkedItems = useMemo(() => {
    if (!selectedRelease) return [];
    return augmentedData
      .filter(i => selectedRelease.linkedItemIds.includes(i.id))
      .sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority] ?? 99;
        const pb = PRIORITY_ORDER[b.priority] ?? 99;
        if (pa !== pb) return pa - pb;
        return (a.sortOrder ?? 99999) - (b.sortOrder ?? 99999);
      });
  }, [selectedRelease, augmentedData]);

  const availableItems = useMemo(() => {
    if (!selectedRelease) return [];
    return augmentedData.filter(i =>
      !selectedRelease.linkedItemIds.includes(i.id) &&
      i.currentFlow !== '已關閉' && i.currentFlow !== '已修復'
    );
  }, [selectedRelease, augmentedData]);

  const handleCreate = () => {
    if (!newVersion.trim()) return;
    addRelease(newVersion, newTitle || newVersion, newDate);
    setNewVersion(''); setNewTitle(''); setNewDate(getTodayStr());
    setShowCreateForm(false);
  };

  if (!user) return null;

  // ── Detail View ─────────────────────────────────────────────────
  if (selectedRelease) {
    const checklistDone = selectedRelease.checklist.filter(c => c.checked).length;
    const checklistTotal = selectedRelease.checklist.length;

    return (
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-400 mb-6">
          <button
            onClick={() => { setSelectedReleaseId(null); setEditingReleasedAt(false); }}
            className="hover:text-blue-600 transition-colors"
          >
            版更管理
          </button>
          <span>/</span>
          <span className="text-gray-700 font-bold">{selectedRelease.version}</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-3 flex-wrap">
              <Package size={24} className="text-blue-600 shrink-0" />
              {selectedRelease.status !== 'released' ? (
                <span className="relative group/edit">
                  <input
                    type="text"
                    value={selectedRelease.version}
                    onChange={(e) => updateRelease(selectedRelease.id, { version: e.target.value })}
                    className="bg-transparent border-b border-dashed border-gray-300 hover:border-blue-400 focus:border-blue-500 outline-none text-2xl font-black w-32 transition-colors"
                  />
                  <Edit2 size={12} className="absolute -right-4 top-1/2 -translate-y-1/2 text-gray-300 group-hover/edit:text-blue-400 transition-colors" />
                </span>
              ) : selectedRelease.version}
              <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${STATUS_BADGE[selectedRelease.status]}`}>
                {STATUS_LABEL[selectedRelease.status]}
              </span>
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
              <span>{selectedRelease.title}</span>
              <span>—</span>
              <span>預計</span>
              {selectedRelease.status !== 'released' ? (
                <input
                  type="date"
                  value={selectedRelease.scheduledDate}
                  onChange={(e) => updateRelease(selectedRelease.id, { scheduledDate: e.target.value })}
                  className="bg-transparent border-b border-dashed border-gray-300 focus:border-blue-500 outline-none text-sm text-gray-500"
                />
              ) : <span>{selectedRelease.scheduledDate}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedRelease.status === 'planning' && (
              <button
                onClick={() => updateRelease(selectedRelease.id, { status: 'uat' })}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
              >
                <Play size={16} /> 進入 UAT
              </button>
            )}
            {(selectedRelease.status === 'planning' || selectedRelease.status === 'uat') && (
              <button
                onClick={() => {
                  if (confirm(`確定要發布 ${selectedRelease.version} 嗎？所有關聯的 QA 項目將被標為已關閉。`)) {
                    executeRelease(selectedRelease);
                    copyReleaseContent(selectedRelease, linkedItems);
                  }
                }}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
              >
                <Rocket size={16} /> 正式發布
              </button>
            )}
            {linkedItems.length > 0 && (
              <button
                onClick={() => copyReleaseContent(selectedRelease, linkedItems)}
                className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-sm font-bold border border-gray-200 transition-colors"
              >
                <Copy size={16} /> 複製更版內容
              </button>
            )}
          </div>
        </div>

        {/* Status Stepper */}
        <div className="flex items-center justify-center gap-0 mb-8 bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          {(['planning', 'uat', 'released'] as const).map((step, idx) => {
            const stepLabels = { planning: '規劃中', uat: 'UAT 測試', released: '已發布' };
            const stepOrder = { planning: 0, uat: 1, released: 2, cancelled: -1 };
            const currentOrder = stepOrder[selectedRelease.status];
            const thisOrder = stepOrder[step];
            const isDone = currentOrder >= thisOrder;
            const isCurrent = selectedRelease.status === step;
            return (
              <React.Fragment key={step}>
                {idx > 0 && <div className={`flex-1 h-0.5 mx-2 ${isDone ? 'bg-blue-500' : 'bg-gray-200'}`} />}
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                    isCurrent ? 'bg-blue-600 text-white border-blue-600 scale-110' :
                    isDone ? 'bg-blue-100 text-blue-600 border-blue-300' :
                    'bg-gray-100 text-gray-400 border-gray-200'
                  }`}>
                    {isDone && !isCurrent ? <Check size={14} /> : idx + 1}
                  </div>
                  <span className={`text-[10px] font-bold ${isCurrent ? 'text-blue-600' : isDone ? 'text-blue-400' : 'text-gray-400'}`}>
                    {stepLabels[step]}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Item fix progress */}
        {linkedItems.length > 0 && (() => {
          const fixedCount = linkedItems.filter(i =>
            i.currentFlow === '已修復' || i.currentFlow === '已關閉' || i.currentFlow === '已修正待測試'
          ).length;
          return (
            <div className="mb-6 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500">項目修復進度</span>
                <span className="text-xs font-bold text-gray-500">{fixedCount}/{linkedItems.length}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(fixedCount / linkedItems.length) * 100}%` }} />
              </div>
            </div>
          );
        })()}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Items + Notes */}
          <div className="lg:col-span-2 space-y-6">
            {/* Linked QA Items */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Link2 size={16} /> 關聯 QA 項目 ({linkedItems.length})
                </h3>
                {selectedRelease.status !== 'released' && (
                  <button
                    onClick={() => setShowLinkPicker(true)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus size={14} /> 加入項目
                  </button>
                )}
              </div>
              <div className="divide-y divide-gray-100">
                {linkedItems.length === 0 ? (
                  <div className="p-6"><EmptyState compact title="尚未加入 QA 項目" /></div>
                ) : linkedItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                    <span className="text-xs font-bold text-gray-400 w-10">{item.id}</span>
                    {item.priority !== '-' && (
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded border ${PRIORITY_COLORS[item.priority]}`}>{item.priority}</span>
                    )}
                    <span className="text-sm text-gray-900 flex-1 truncate">{item.displayTitle}</span>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] text-white font-bold ${getAvatarColor(item.assignee)} ${getAvatarRing(tierByUserName[item.assignee])}`}>
                      {item.assignee.charAt(0)}
                    </div>
                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full border ${STATUS_COLORS[item.currentFlow || '待處理']}`}>
                      {item.currentFlow}
                    </span>
                    {selectedRelease.status !== 'released' && (
                      <button
                        onClick={() => unlinkItem(selectedRelease.id, selectedRelease.linkedItemIds, item.id)}
                        className="p-1 text-gray-300 hover:text-red-500"
                        aria-label="移除"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Release Notes */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <FileText size={16} /> Release Notes
                </h3>
                {!editingNotes && selectedRelease.status !== 'released' && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={async () => {
                        if (linkedItems.length === 0) { toast.error('請先加入 QA 項目'); return; }
                        setGeneratingNotes(true);
                        const notes = await generateReleaseNotes(selectedRelease.version, linkedItems);
                        setNoteDraft(notes);
                        setEditingNotes(true);
                        setGeneratingNotes(false);
                      }}
                      disabled={generatingNotes}
                      className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 disabled:opacity-50"
                    >
                      {generatingNotes ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      AI 生成
                    </button>
                    <button
                      onClick={() => { setNoteDraft(selectedRelease.releaseNotes); setEditingNotes(true); }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700"
                    >
                      編輯
                    </button>
                  </div>
                )}
              </div>
              {editingNotes ? (
                <div className="space-y-3">
                  <textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm font-mono min-h-[150px] outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="撰寫 Release Notes (支援 Markdown)..."
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingNotes(false)} className="text-xs text-gray-500 px-3 py-1.5">取消</button>
                    <button
                      onClick={() => { updateRelease(selectedRelease.id, { releaseNotes: noteDraft }); setEditingNotes(false); }}
                      className="text-xs bg-blue-600 text-white px-4 py-1.5 rounded-lg font-bold hover:bg-blue-700"
                    >
                      儲存
                    </button>
                  </div>
                </div>
              ) : selectedRelease.releaseNotes ? (
                <div className="prose prose-sm max-w-none text-gray-700">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedRelease.releaseNotes}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-gray-400">尚未撰寫 Release Notes</p>
              )}
            </div>
          </div>

          {/* Right: Checklist + Info */}
          <div className="space-y-6">
            {/* Checklist */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <CheckSquare size={16} /> 發布檢查表 ({checklistDone}/{checklistTotal})
              </h3>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4">
                <div className="bg-green-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${checklistTotal > 0 ? (checklistDone / checklistTotal) * 100 : 0}%` }} />
              </div>
              <div className="space-y-2">
                {selectedRelease.checklist.map(item => (
                  <button
                    key={item.id}
                    onClick={() => selectedRelease.status !== 'released' && toggleChecklist(selectedRelease.id, selectedRelease.checklist, item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                      item.checked ? 'text-gray-400 line-through' : 'text-gray-700 hover:bg-gray-50'
                    } ${selectedRelease.status === 'released' ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    {item.checked ? <Check size={16} className="text-green-500 shrink-0" /> : <Square size={16} className="text-gray-300 shrink-0" />}
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Info */}
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">建立者</span>
                <span className="font-bold text-gray-700">{selectedRelease.createdByName}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">建立時間</span>
                <span className="font-bold text-gray-700">{formatTimestamp(selectedRelease.createdAt)}</span>
              </div>
              {selectedRelease.releasedAt && (
                <div className="flex items-start justify-between text-xs gap-2">
                  <span className="text-gray-500 shrink-0 pt-0.5">發布時間</span>
                  {editingReleasedAt ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="datetime-local"
                        value={releasedAtDraft}
                        onChange={e => setReleasedAtDraft(e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                      />
                      <button
                        onClick={() => {
                          const ts = new Date(releasedAtDraft + ':00+08:00').getTime();
                          updateRelease(selectedRelease.id, { releasedAt: ts });
                          setEditingReleasedAt(false);
                        }}
                        className="text-green-600 hover:text-green-700 p-1"
                      >
                        <Check size={12} />
                      </button>
                      <button onClick={() => setEditingReleasedAt(false)} className="text-gray-400 hover:text-gray-600 p-1">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 group/date">
                      <span className="font-bold text-green-600 text-right">{formatTimestamp(selectedRelease.releasedAt)}</span>
                      <button
                        onClick={() => {
                          const dt = new Date(selectedRelease.releasedAt!);
                          const dateStr =
                            dt.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' }) + 'T' +
                            dt.toLocaleTimeString('sv-SE', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit' });
                          setReleasedAtDraft(dateStr);
                          setEditingReleasedAt(true);
                        }}
                        className="text-gray-300 hover:text-blue-500 opacity-0 group-hover/date:opacity-100 transition-opacity p-0.5"
                      >
                        <Edit2 size={10} />
                      </button>
                    </div>
                  )}
                </div>
              )}
              {selectedRelease.status !== 'released' && (
                <button
                  onClick={() => { if (confirm('確定要刪除此版本嗎？')) deleteRelease(selectedRelease.id).then(() => setSelectedReleaseId(null)); }}
                  className="w-full mt-2 text-xs text-red-500 hover:text-red-600 font-bold flex items-center justify-center gap-1 py-2"
                >
                  <Trash2 size={12} /> 刪除版本
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Link Picker Modal */}
        {showLinkPicker && (
          <>
            <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowLinkPicker(false)} />
            <div className="fixed inset-x-4 top-[10%] z-50 max-w-lg mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[70vh] flex flex-col">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold">選擇 QA 項目加入</h3>
                <button onClick={() => setShowLinkPicker(false)} className="p-1 text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {availableItems.length === 0 ? (
                  <div className="p-6"><EmptyState compact title="沒有可加入的項目" /></div>
                ) : availableItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => linkItems(selectedRelease.id, selectedRelease.linkedItemIds, [item.id])}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 rounded-xl text-left transition-colors"
                  >
                    <span className="text-xs font-bold text-gray-400 w-10">{item.id}</span>
                    {item.priority !== '-' && (
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded border ${PRIORITY_COLORS[item.priority]}`}>{item.priority}</span>
                    )}
                    <span className="text-sm text-gray-900 flex-1 truncate">{item.displayTitle}</span>
                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full border ${STATUS_COLORS[item.currentFlow || '待處理']}`}>
                      {item.currentFlow}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── List View ────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div />
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-md text-sm font-bold"
        >
          <Plus size={18} /> 建立新版本
        </button>
      </div>

      {/* Active Releases — drag-and-drop */}
      {activeReleases.length > 0 && (
        <div className="mb-10">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock size={14} /> 進行中 ({activeReleases.length})
          </h3>
          <DndContext sensors={releaseSensors} collisionDetection={closestCenter} onDragEnd={handleReleaseDragEnd}>
            <SortableContext items={activeOrder} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {orderedActiveReleases.map(release => (
                  <SortableReleaseCard
                    key={release.id}
                    release={release}
                    itemCount={augmentedData.filter(i => release.linkedItemIds.includes(i.id)).length}
                    onClick={() => setSelectedReleaseId(release.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Past Releases — Enhanced Timeline */}
      {pastReleases.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5 flex items-center gap-2">
            <Rocket size={14} /> 版更歷程 ({pastReleases.length})
          </h3>
          <div className="relative pl-8">
            {/* Gradient vertical line */}
            <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-green-400 via-green-200 to-gray-200" />

            {pastReleases.map((release) => {
              const isExpanded = expandedTimelineId === release.id;
              const items = augmentedData.filter(i => release.linkedItemIds.includes(i.id));

              // Module breakdown
              const moduleCount: Record<string, number> = {};
              items.forEach(item => {
                const mod = item.module || '其他';
                moduleCount[mod] = (moduleCount[mod] || 0) + 1;
              });

              // Grouped by module for expanded view
              const grouped = items.reduce((acc, item) => {
                const mod = item.module || '其他';
                if (!acc[mod]) acc[mod] = [];
                acc[mod].push(item);
                return acc;
              }, {} as Record<string, typeof items>);

              // Short date: "04/10"
              const releaseDateStr = release.releasedAt
                ? new Date(release.releasedAt).toLocaleDateString('zh-TW', {
                    timeZone: 'Asia/Taipei', month: '2-digit', day: '2-digit',
                  })
                : release.scheduledDate.slice(5).replace('-', '/');

              return (
                <div key={release.id} className="relative mb-5 last:mb-0">
                  {/* Timeline dot */}
                  <div className="absolute -left-8 top-[18px] w-6 h-6 rounded-full bg-green-500 border-[3px] border-white shadow-md flex items-center justify-center z-10">
                    <Check size={10} className="text-white" />
                  </div>

                  {/* Card */}
                  <div className={`bg-white rounded-xl border overflow-hidden transition-all duration-200 ${
                    isExpanded ? 'border-green-200 shadow-md' : 'border-gray-200 shadow-sm hover:border-gray-300 hover:shadow'
                  }`}>
                    <button
                      onClick={() => setExpandedTimelineId(isExpanded ? null : release.id)}
                      className="w-full p-4 text-left"
                    >
                      {/* Top row: version + date + count */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-baseline gap-2 min-w-0">
                          <span className="font-black text-gray-900 text-base leading-none shrink-0">{release.version}</span>
                          <span className="text-xs text-gray-400 truncate">{release.title}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-full tabular-nums">
                            {releaseDateStr}
                          </span>
                          <span className="text-xs text-gray-400">{items.length} 項</span>
                          <ChevronRight size={14} className={`text-gray-300 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                      </div>

                      {/* Module tags */}
                      {Object.keys(moduleCount).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(moduleCount).map(([mod, count]) => (
                            <span key={mod} className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getModuleColor(mod)}`}>
                              {mod} ×{count}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>

                    {/* Expanded */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50/40">
                        {release.releaseNotes && <NotesSummary notes={release.releaseNotes} />}

                        {/* Items by module */}
                        {Object.entries(grouped).map(([mod, modItems]) => (
                          <div key={mod}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getModuleColor(mod)}`}>{mod}</span>
                              <span className="text-[10px] text-gray-400">{modItems.length} 項</span>
                            </div>
                            <div className="space-y-1 pl-1">
                              {modItems.map(item => (
                                <div key={item.id} className="flex items-center gap-2 text-xs text-gray-600 py-0.5">
                                  <span className="text-gray-300 font-bold w-8 shrink-0">{item.id}</span>
                                  <span className="truncate">{item.displayTitle}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}

                        {items.length === 0 && <p className="text-xs text-gray-400">此版本沒有關聯項目</p>}

                        <button
                          onClick={() => setSelectedReleaseId(release.id)}
                          className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
                        >
                          查看完整版本詳情 <ChevronRight size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {releases.length === 0 && !isLoading && (
        <EmptyState title="還沒有任何版本" description="點擊「建立新版本」開始你的第一個版更" />
      )}

      {/* Create Form Modal */}
      {showCreateForm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowCreateForm(false)} />
          <div className="fixed inset-x-4 top-[20%] z-50 max-w-md mx-auto bg-white rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">建立新版本</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">版本號 *</label>
                <input
                  type="text"
                  value={newVersion}
                  onChange={(e) => setNewVersion(e.target.value)}
                  placeholder="例如 v1.2.3"
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">標題</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="例如 Week 14 Release"
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">預計發布日</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowCreateForm(false)} className="text-sm text-gray-500 px-4 py-2">取消</button>
              <button
                onClick={handleCreate}
                disabled={!newVersion.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-40"
              >
                建立
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
