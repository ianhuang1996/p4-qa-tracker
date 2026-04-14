import React, { useState, useEffect } from 'react';
import { Plus, Save, Trash2, ArrowLeft, CheckSquare2, Square, Users, Calendar, Sparkles, Loader2 } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { toast } from 'sonner';
import { useMeetingNotes } from '../hooks/useMeetingNotes';
import { MeetingNote, MeetingType } from '../types';
import { MEMBER_COLORS } from '../constants';
import { summarizeMeeting, MeetingSummary } from '../services/geminiService';

interface MeetingNotesPageProps {
  user: FirebaseUser;
}

const TEAM_MEMBERS = Object.keys(MEMBER_COLORS).filter(m => m !== 'Unassigned');

const TYPE_LABEL: Record<MeetingType, string> = { client: '客戶會議', internal: '組內討論' };
const TYPE_STYLE: Record<MeetingType, string> = {
  client:   'bg-blue-100 text-blue-700 border-blue-200',
  internal: 'bg-purple-100 text-purple-700 border-purple-200',
};

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('zh-TW', {
    month: 'long', day: 'numeric', weekday: 'short',
  });
}

type DraftFields = Pick<MeetingNote, 'title' | 'date' | 'type' | 'attendees' | 'notes'>;

export const MeetingNotesPage: React.FC<MeetingNotesPageProps> = ({ user }) => {
  const { meetings, isLoading, addMeeting, updateMeeting, deleteMeeting, addActionItem, toggleActionItem, convertToTodo } = useMeetingNotes(user);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [draft, setDraft] = useState<DraftFields | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newActionText, setNewActionText] = useState('');
  const [newActionAssignee, setNewActionAssignee] = useState(
    user.displayName?.split(' ')[0] || TEAM_MEMBERS[0]
  );
  const [aiSummary, setAiSummary] = useState<MeetingSummary | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const selected = meetings.find(m => m.id === selectedId) ?? null;

  // Clear selection if selected meeting is deleted remotely
  useEffect(() => {
    if (selectedId && !meetings.find(m => m.id === selectedId)) {
      setSelectedId(null);
      setDraft(null);
      setMobileShowDetail(false);
    }
  }, [meetings, selectedId]);

  const handleSelect = (id: string) => {
    const m = meetings.find(m => m.id === id);
    if (!m) return;
    setSelectedId(id);
    setDraft({ title: m.title, date: m.date, type: m.type, attendees: m.attendees, notes: m.notes });
    setIsDirty(false);
    setConfirmDelete(false);
    setAiSummary(m.aiSummary ?? null);
    setMobileShowDetail(true);
  };

  const handleNew = async () => {
    const id = await addMeeting();
    if (id) handleSelect(id);
  };

  const handleSave = async () => {
    if (!selectedId || !draft) return;
    await updateMeeting(selectedId, draft);
    setIsDirty(false);
    toast.success('已儲存');
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    await deleteMeeting(selectedId);
    setSelectedId(null);
    setDraft(null);
    setConfirmDelete(false);
    setMobileShowDetail(false);
  };

  const handleAddActionItem = async () => {
    if (!selectedId || !newActionText.trim()) return;
    await addActionItem(selectedId, newActionText, newActionAssignee);
    setNewActionText('');
  };

  const updateDraft = (updates: Partial<DraftFields>) => {
    setDraft(prev => prev ? { ...prev, ...updates } : null);
    setIsDirty(true);
  };

  const handleAISummary = async () => {
    if (!selected || !draft) return;
    setAiLoading(true);
    setAiSummary(null);
    try {
      const result = await summarizeMeeting(draft.title, draft.type, draft.attendees, draft.notes);
      setAiSummary(result);
      updateMeeting(selectedId, { aiSummary: result }).catch(console.error);
    } catch {
      toast.error('AI 摘要失敗，請確認 Gemini API Key');
    } finally {
      setAiLoading(false);
    }
  };

  const toggleAttendee = (member: string) => {
    const current = draft?.attendees ?? [];
    updateDraft({
      attendees: current.includes(member)
        ? current.filter(a => a !== member)
        : [...current, member],
    });
  };

  // ─── List panel ──────────────────────────────────────────────
  const listPanel = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
        <span className="font-bold text-gray-800 text-sm">所有會議</span>
        <button
          onClick={handleNew}
          className="flex items-center gap-1 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={13} /> 新增
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="p-4 text-sm text-gray-400">載入中…</p>
        ) : meetings.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm space-y-3">
            <p className="text-3xl">📋</p>
            <p>尚無會議紀錄</p>
            <button onClick={handleNew} className="text-blue-500 hover:text-blue-700 font-medium">建立第一份 →</button>
          </div>
        ) : (
          meetings.map(m => {
            const doneCount = m.actionItems.filter(a => a.done).length;
            return (
              <button
                key={m.id}
                onClick={() => handleSelect(m.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                  selectedId === m.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${TYPE_STYLE[m.type]}`}>
                    {TYPE_LABEL[m.type]}
                  </span>
                  <span className="text-[11px] text-gray-400">{formatDate(m.date)}</span>
                </div>
                <p className="text-sm font-semibold text-gray-800 truncate">{m.title || '（未命名）'}</p>
                {m.actionItems.length > 0 && (
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {doneCount}/{m.actionItems.length} 行動項目完成
                  </p>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  // ─── Detail panel ─────────────────────────────────────────────
  const detailPanel = selected && draft ? (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Mobile back */}
      <button
        onClick={() => setMobileShowDetail(false)}
        className="lg:hidden flex items-center gap-1.5 px-4 py-3 border-b border-gray-100 text-sm text-gray-500 hover:text-gray-800 shrink-0"
      >
        <ArrowLeft size={15} /> 返回列表
      </button>

      {/* Header */}
      <div className="p-5 border-b border-gray-100 shrink-0">
        <div className="flex items-start gap-3">
          <input
            value={draft.title}
            onChange={e => updateDraft({ title: e.target.value })}
            className="flex-1 text-xl font-bold text-gray-800 bg-transparent border-0 outline-none placeholder:text-gray-300"
            placeholder="會議標題…"
          />
          <div className="flex items-center gap-2 shrink-0">
            {isDirty && (
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save size={13} /> 儲存
              </button>
            )}
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
              title="刪除"
              aria-label="刪除會議"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
          <label className="flex items-center gap-1.5">
            <Calendar size={13} className="text-gray-400" />
            <input
              type="date"
              value={draft.date}
              onChange={e => updateDraft({ date: e.target.value })}
              className="text-sm text-gray-600 bg-transparent border-0 outline-none"
            />
          </label>

          <div className="flex gap-1">
            {(['client', 'internal'] as MeetingType[]).map(t => (
              <button
                key={t}
                onClick={() => updateDraft({ type: t })}
                className={`text-xs font-bold px-2 py-0.5 rounded-full border transition-colors ${
                  draft.type === t ? TYPE_STYLE[t] : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {TYPE_LABEL[t]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <Users size={13} className="text-gray-400 shrink-0" />
            {TEAM_MEMBERS.map(member => {
              const isIn = draft.attendees.includes(member);
              const color = MEMBER_COLORS[member]?.bg ?? 'bg-gray-400';
              return (
                <button
                  key={member}
                  onClick={() => toggleAttendee(member)}
                  className={`text-xs px-2 py-0.5 rounded-full font-medium transition-all ${
                    isIn ? `${color} text-white` : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {member}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="p-5 border-b border-gray-100">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">📝 會議紀錄</p>
        <textarea
          value={draft.notes}
          onChange={e => updateDraft({ notes: e.target.value })}
          placeholder="記錄討論重點、決議事項…"
          className="w-full min-h-[160px] text-sm text-gray-700 bg-transparent border-0 outline-none resize-none placeholder:text-gray-300"
        />
      </div>

      {/* AI Summary */}
      <div className="px-5 pt-4 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">✨ AI 摘要</p>
          <button
            onClick={handleAISummary}
            disabled={aiLoading || !draft?.notes?.trim()}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-blue-500 text-white hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {aiLoading ? '生成中…' : '產生摘要'}
          </button>
        </div>

        {aiSummary && (
          <div className="space-y-3">
            {aiSummary.keyPoints.length > 0 && (
              <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 space-y-1">
                <p className="text-[10px] font-bold text-violet-500 uppercase tracking-wider mb-1.5">會議重點</p>
                {aiSummary.keyPoints.map((pt, i) => (
                  <p key={i} className="text-sm text-gray-700 flex gap-2">
                    <span className="text-violet-400 shrink-0">·</span>{pt}
                  </p>
                ))}
              </div>
            )}
            {aiSummary.suggestedActions.length > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-1.5">
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1.5">建議行動項目</p>
                {aiSummary.suggestedActions.map((action, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <p className="flex-1 text-sm text-gray-700">{action}</p>
                    <button
                      onClick={() => {
                        setNewActionText(action);
                        setAiSummary(prev => prev
                          ? { ...prev, suggestedActions: prev.suggestedActions.filter((_, idx) => idx !== i) }
                          : null
                        );
                      }}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 whitespace-nowrap shrink-0 bg-white border border-blue-200 px-2 py-0.5 rounded-lg"
                    >
                      採用
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!aiSummary && !aiLoading && (
          <p className="text-xs text-gray-400">在會議紀錄填寫內容後，點擊「產生摘要」讓 AI 整理重點。</p>
        )}
      </div>

      {/* Action Items */}
      <div className="p-5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
          ✅ Action Items ({selected.actionItems.filter(a => a.done).length}/{selected.actionItems.length})
        </p>

        <div className="space-y-2 mb-4">
          {selected.actionItems.length === 0 && (
            <p className="text-sm text-gray-400">尚無行動項目</p>
          )}
          {selected.actionItems.map(item => (
            <div
              key={item.id}
              className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${
                item.done ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200'
              }`}
            >
              <button onClick={() => toggleActionItem(selectedId, item.id)} className="shrink-0">
                {item.done
                  ? <CheckSquare2 size={16} className="text-green-500" />
                  : <Square size={16} className="text-gray-300" />
                }
              </button>
              <p className={`flex-1 text-sm min-w-0 ${item.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                {item.text}
              </p>
              {item.assignee && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0 ${MEMBER_COLORS[item.assignee]?.bg ?? 'bg-gray-400'}`}>
                  {item.assignee}
                </span>
              )}
              {item.linkedTodoId ? (
                <span className="text-[10px] text-green-600 font-medium shrink-0">✓ 已派工</span>
              ) : (
                <button
                  onClick={() => convertToTodo(selectedId, item.id)}
                  className="text-[10px] text-blue-500 hover:text-blue-700 font-medium shrink-0 whitespace-nowrap"
                >
                  → 待辦
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add action item */}
        <div className="flex gap-2">
          <input
            value={newActionText}
            onChange={e => setNewActionText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddActionItem(); }}
            placeholder="新增行動項目…"
            className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder:text-gray-300"
          />
          <select
            value={newActionAssignee}
            onChange={e => setNewActionAssignee(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {TEAM_MEMBERS.map(m => <option key={m}>{m}</option>)}
          </select>
          <button
            onClick={handleAddActionItem}
            disabled={!newActionText.trim()}
            className="bg-gray-800 text-white text-sm font-bold px-3 py-2 rounded-xl hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            <Plus size={15} />
          </button>
        </div>
      </div>
    </div>
  ) : (
    <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
      <div className="text-center space-y-2">
        <p className="text-4xl">📋</p>
        <p>選擇左側會議查看詳情</p>
        <p>或 <button onClick={handleNew} className="text-blue-500 hover:text-blue-700 font-medium">建立新會議</button></p>
      </div>
    </div>
  );

  return (
    <>
      <div
        className="flex rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm"
        style={{ height: 'calc(100vh - 200px)', minHeight: '520px' }}
      >
        {/* List panel */}
        <div className={`w-72 border-r border-gray-100 shrink-0 ${mobileShowDetail ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'}`}>
          {listPanel}
        </div>

        {/* Detail panel */}
        <div className={`flex-1 min-w-0 ${!mobileShowDetail && !selectedId ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'}`}>
          {detailPanel}
        </div>
      </div>

      {/* Delete confirm dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setConfirmDelete(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl flex flex-col gap-4 mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800">確定刪除此會議紀錄？</h3>
            <p className="text-sm text-gray-500">刪除後無法復原，行動項目也會一併刪除。</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50">
                取消
              </button>
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600">
                確定刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
