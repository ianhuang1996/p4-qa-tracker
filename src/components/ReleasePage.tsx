import React, { useState, useMemo } from 'react';
import {
  Plus, Rocket, Calendar, CheckSquare, Square, Check, Trash2, X,
  ChevronRight, FileText, Link2, Play, Clock, Package, Sparkles, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppContext } from '../contexts/AppContext';
import { useReleases } from '../hooks/useReleases';
import { useQAItems } from '../hooks/useQAItems';
import { Release, AugmentedQAItem } from '../types';
import { STATUS_COLORS, PRIORITY_COLORS } from '../constants';
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

export const ReleasePage: React.FC = () => {
  const { user, isAuthReady } = useAppContext();
  const { releases, isLoading, addRelease, updateRelease, deleteRelease, toggleChecklist, linkItems, unlinkItem, executeRelease } = useReleases(user);
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

  const augmentedData = useMemo(() => augmentQAItems(data), [data]);

  const selectedRelease = releases.find(r => r.id === selectedReleaseId) || null;
  const linkedItems = useMemo(() => {
    if (!selectedRelease) return [];
    return augmentedData.filter(i => selectedRelease.linkedItemIds.includes(i.id));
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
    setNewVersion('');
    setNewTitle('');
    setNewDate(getTodayStr());
    setShowCreateForm(false);
  };

  const activeReleases = releases.filter(r => r.status !== 'released' && r.status !== 'cancelled');
  const pastReleases = releases.filter(r => r.status === 'released' || r.status === 'cancelled');

  if (!user) return null;

  // ── Detail View ──
  if (selectedRelease) {
    const checklistDone = selectedRelease.checklist.filter(c => c.checked).length;
    const checklistTotal = selectedRelease.checklist.length;

    return (
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-400 mb-6">
          <button onClick={() => setSelectedReleaseId(null)} className="hover:text-blue-600 transition-colors">版更管理</button>
          <span>/</span>
          <span className="text-gray-700 font-bold">{selectedRelease.version}</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-3 flex-wrap">
              <Package size={24} className="text-blue-600 shrink-0" />
              {selectedRelease.status !== 'released' ? (
                <input
                  type="text"
                  value={selectedRelease.version}
                  onChange={(e) => updateRelease(selectedRelease.id, { version: e.target.value })}
                  className="bg-transparent border-b border-dashed border-gray-300 focus:border-blue-500 outline-none text-2xl font-black w-32"
                />
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
                  }
                }}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
              >
                <Rocket size={16} /> 正式發布
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
                {idx > 0 && (
                  <div className={`flex-1 h-0.5 mx-2 ${isDone ? 'bg-blue-500' : 'bg-gray-200'}`} />
                )}
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
          const fixedCount = linkedItems.filter(i => i.currentFlow === '已修復' || i.currentFlow === '已關閉' || i.currentFlow === '已修正待測試').length;
          return (
            <div className="mb-6 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500">項目修復進度</span>
                <span className="text-xs font-bold text-gray-500">{fixedCount}/{linkedItems.length}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full transition-all duration-300" style={{ width: `${(fixedCount / linkedItems.length) * 100}%` }} />
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
                <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${checklistTotal > 0 ? (checklistDone / checklistTotal) * 100 : 0}%` }} />
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
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">發布時間</span>
                  <span className="font-bold text-green-600">{formatTimestamp(selectedRelease.releasedAt)}</span>
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
                <button onClick={() => setShowLinkPicker(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {availableItems.length === 0 ? (
                  <div className="p-6"><EmptyState compact title="沒有可加入的項目" /></div>
                ) : availableItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      linkItems(selectedRelease.id, selectedRelease.linkedItemIds, [item.id]);
                    }}
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

  // ── List View ──
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

      {/* Active Releases */}
      {activeReleases.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock size={14} /> 進行中 ({activeReleases.length})
          </h3>
          <div className="space-y-3">
            {activeReleases.map(release => {
              const checkDone = release.checklist.filter(c => c.checked).length;
              return (
                <button
                  key={release.id}
                  onClick={() => setSelectedReleaseId(release.id)}
                  className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center gap-4 hover:border-blue-200 hover:shadow-md transition-all text-left"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                    <Package size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900">{release.version}</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border ${STATUS_BADGE[release.status]}`}>
                        {STATUS_LABEL[release.status]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{release.title} — {release.scheduledDate}</p>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <p className="text-xs text-gray-500">{release.linkedItemIds.length} 個項目</p>
                    <p className="text-xs text-gray-400">檢查 {checkDone}/{release.checklist.length}</p>
                    <div className="w-20 bg-gray-200 rounded-full h-1">
                      <div className="bg-green-500 h-1 rounded-full" style={{ width: `${release.checklist.length > 0 ? (checkDone / release.checklist.length) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Past Releases — Timeline */}
      {pastReleases.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Rocket size={14} /> 版更歷程 ({pastReleases.length})
          </h3>
          <div className="relative pl-6">
            {/* Vertical line */}
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200" />

            {pastReleases.map((release, idx) => {
              const isExpanded = expandedTimelineId === release.id;
              const items = augmentedData.filter(i => release.linkedItemIds.includes(i.id));
              // Group by module
              const grouped: Record<string, typeof items> = {};
              items.forEach(item => {
                const mod = item.module || '其他';
                if (!grouped[mod]) grouped[mod] = [];
                grouped[mod].push(item);
              });

              return (
                <div key={release.id} className="relative mb-6 last:mb-0">
                  {/* Timeline dot */}
                  <div className="absolute -left-6 top-1 w-6 h-6 rounded-full bg-green-500 border-4 border-white shadow-sm flex items-center justify-center z-10">
                    <Check size={10} className="text-white" />
                  </div>

                  {/* Content */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ml-2">
                    <button
                      onClick={() => setExpandedTimelineId(isExpanded ? null : release.id)}
                      className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-gray-900">{release.version}</span>
                          <span className="text-xs text-gray-400">{release.releasedAt ? formatTimestamp(release.releasedAt) : release.scheduledDate}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{release.title} — {release.linkedItemIds.length} 個項目</p>
                      </div>
                      <ChevronRight size={16} className={`text-gray-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-100 p-4 space-y-3">
                        {/* Release notes excerpt */}
                        {release.releaseNotes && (
                          <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 line-clamp-3">
                            {release.releaseNotes.substring(0, 200)}{release.releaseNotes.length > 200 ? '...' : ''}
                          </div>
                        )}

                        {/* Items grouped by module */}
                        {Object.entries(grouped).map(([mod, modItems]) => (
                          <div key={mod}>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{mod}</p>
                            <div className="space-y-1">
                              {modItems.map(item => (
                                <div
                                  key={item.id}
                                  className="flex items-center gap-2 text-xs text-gray-700 py-1 cursor-pointer hover:text-blue-600"
                                  onClick={() => setSelectedReleaseId(release.id)}
                                >
                                  <span className="text-gray-400 font-bold w-8">{item.id}</span>
                                  <span className="truncate">{item.displayTitle}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}

                        {items.length === 0 && (
                          <p className="text-xs text-gray-400">此版本沒有關聯項目</p>
                        )}

                        <button
                          onClick={() => setSelectedReleaseId(release.id)}
                          className="text-xs text-blue-600 hover:text-blue-700 font-bold mt-2"
                        >
                          查看完整版本詳情 →
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
