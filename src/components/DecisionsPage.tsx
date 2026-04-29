import React, { useState, useMemo } from 'react';
import { Plus, Search, Pencil, Trash2, ArrowRight, ArrowLeft, Calendar, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Decision, DecisionStatus, DecisionTag } from '../types';
import { useDecisions } from '../hooks/useDecisions';
import { useRoadmap } from '../hooks/useRoadmap';
import { useAppContext } from '../contexts/AppContext';
import { DECISION_TAGS, DECISION_TAG_STYLES, DECISION_STATUS_STYLES } from '../constants/decisionConstants';
import { DecisionModal } from './DecisionModal';
import { ConfirmDialog } from './ConfirmDialog';
import { useConfirm } from '../hooks/useConfirm';
import { EmptyState } from './EmptyState';
import { getAvatarColor } from '../utils/qaUtils';

interface DecisionsPageProps {
  initialDecisionId?: string | null;
  initialPrefill?: { meetingNoteId?: string; context?: string } | null;
  onClearPrefill?: () => void;
}

export const DecisionsPage: React.FC<DecisionsPageProps> = ({ initialDecisionId, initialPrefill, onClearPrefill }) => {
  const { user } = useAppContext();
  const { decisions, isLoading, addDecision, updateDecision, deleteDecision } = useDecisions(user);
  const { items: roadmapItems } = useRoadmap(user);
  const { confirm, dialogProps } = useConfirm();

  const [selectedId, setSelectedId] = useState<string | null>(initialDecisionId ?? null);
  const [modalOpen, setModalOpen] = useState(!!initialPrefill);
  const [editing, setEditing] = useState<Decision | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DecisionStatus>('all');
  const [tagFilter, setTagFilter] = useState<'all' | DecisionTag>('all');

  // Clear prefill after first render
  React.useEffect(() => { if (initialPrefill) onClearPrefill?.(); }, [initialPrefill, onClearPrefill]);

  const filtered = useMemo(() => {
    return decisions.filter(d => {
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (tagFilter !== 'all' && !(d.tags ?? []).includes(tagFilter)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return d.title.toLowerCase().includes(q)
          || d.decision.toLowerCase().includes(q)
          || (d.context ?? '').toLowerCase().includes(q)
          || (d.rationale ?? '').toLowerCase().includes(q)
          || d.decidedBy.toLowerCase().includes(q);
      }
      return true;
    });
  }, [decisions, searchQuery, statusFilter, tagFilter]);

  const selected = selectedId ? decisions.find(d => d.id === selectedId) : null;

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (d: Decision) => { setEditing(d); setModalOpen(true); };

  const handleSave = async (data: Omit<Decision, 'id' | 'createdAt' | 'createdBy' | 'createdByName' | 'status' | 'supersededById'>) => {
    if (editing) {
      await updateDecision(editing.id, data);
      toast.success('已更新');
    } else {
      await addDecision(data);
    }
    setModalOpen(false);
    setEditing(null);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm('確定要刪除這筆決策嗎？', { title: '刪除決策', confirmLabel: '刪除' });
    if (!ok) return;
    await deleteDecision(id);
    if (selectedId === id) setSelectedId(null);
  };

  const handleReverse = async (d: Decision) => {
    const ok = await confirm(
      `確定要將「${d.title}」標記為已推翻嗎？\n此操作不會新增決策，只是標記狀態。`,
      { title: '推翻決策', variant: 'warning', confirmLabel: '確認推翻' }
    );
    if (!ok) return;
    await updateDecision(d.id, { status: 'reversed' });
    toast.success('已推翻');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 max-w-6xl mx-auto" style={{ minHeight: 'calc(100vh - 260px)' }}>
      {/* Left: List */}
      <div className={`lg:w-96 lg:shrink-0 ${selected ? 'hidden lg:block' : 'block'}`}>
        {/* Toolbar */}
        <div className="space-y-2 mb-3">
          <button
            onClick={openAdd}
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md transition-colors"
          >
            <Plus size={16} /> 記錄決策
          </button>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜尋..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(['all', 'active', 'superseded', 'reversed'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                  statusFilter === s ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {s === 'all' ? '全部' : DECISION_STATUS_STYLES[s].label}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setTagFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                tagFilter === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              全標籤
            </button>
            {DECISION_TAGS.map(t => (
              <button
                key={t.id}
                onClick={() => setTagFilter(t.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                  tagFilter === t.id ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {t.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <EmptyState title="還沒有任何決策" description="點「記錄決策」開始建立第一筆紀錄" />
          ) : (
            filtered.map(d => (
              <DecisionListCard
                key={d.id}
                decision={d}
                selected={d.id === selectedId}
                onClick={() => setSelectedId(d.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right: Detail */}
      <div className={`flex-1 ${selected ? 'block' : 'hidden lg:block'}`}>
        {selected ? (
          <DecisionDetail
            decision={selected}
            allDecisions={decisions}
            roadmapItems={roadmapItems}
            onBack={() => setSelectedId(null)}
            onEdit={() => openEdit(selected)}
            onDelete={() => handleDelete(selected.id)}
            onReverse={() => handleReverse(selected)}
            onNavigate={(id) => setSelectedId(id)}
          />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 h-full flex items-center justify-center">
            <p className="text-sm text-gray-400">選擇左側一筆決策查看詳情</p>
          </div>
        )}
      </div>

      <ConfirmDialog {...dialogProps} />

      {modalOpen && (
        <DecisionModal
          decision={editing}
          allDecisions={decisions}
          roadmapItems={roadmapItems}
          prefilledMeetingNoteId={initialPrefill?.meetingNoteId}
          prefilledContext={initialPrefill?.context}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditing(null); }}
        />
      )}
    </div>
  );
};

// ── List card ────────────────────────────────────────────────────
const DecisionListCard: React.FC<{
  decision: Decision;
  selected: boolean;
  onClick: () => void;
}> = ({ decision, selected, onClick }) => {
  const status = DECISION_STATUS_STYLES[decision.status];
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-all ${
        selected
          ? 'bg-blue-50 border-blue-300 shadow-sm'
          : 'bg-white border-gray-200 hover:border-blue-200 hover:shadow-sm'
      } ${decision.status !== 'active' ? 'opacity-70' : ''}`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] text-gray-500 font-mono">{decision.date}</span>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${status.bg} ${status.text}`}>
          {status.label}
        </span>
      </div>
      <p className={`text-sm font-bold text-gray-900 leading-snug line-clamp-2 ${decision.status === 'reversed' ? 'line-through' : ''}`}>
        {decision.title}
      </p>
      <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-500">
        <UserIcon size={10} />
        <span>{decision.decidedBy}</span>
        {(decision.tags ?? []).length > 0 && (
          <div className="flex gap-1 ml-auto">
            {(decision.tags ?? []).slice(0, 3).map(t => {
              const td = DECISION_TAGS.find(x => x.id === t);
              return td ? <span key={t}>{td.emoji}</span> : null;
            })}
          </div>
        )}
      </div>
    </button>
  );
};

// ── Detail view ───────────────────────────────────────────────────
const DecisionDetail: React.FC<{
  decision: Decision;
  allDecisions: Decision[];
  roadmapItems: { id: string; title: string }[];
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReverse: () => void;
  onNavigate: (id: string) => void;
}> = ({ decision, allDecisions, roadmapItems, onBack, onEdit, onDelete, onReverse, onNavigate }) => {
  const status = DECISION_STATUS_STYLES[decision.status];
  const supersedes = decision.supersedesId ? allDecisions.find(d => d.id === decision.supersedesId) : null;
  const supersededBy = decision.supersededById ? allDecisions.find(d => d.id === decision.supersededById) : null;
  const linkedRoadmap = (decision.linkedRoadmapItemIds ?? [])
    .map(id => roadmapItems.find(r => r.id === id))
    .filter(Boolean) as { id: string; title: string }[];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 space-y-5">
      {/* Mobile back */}
      <button onClick={onBack} className="lg:hidden flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700">
        <ArrowLeft size={14} /> 返回列表
      </button>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-mono flex items-center gap-1">
            <Calendar size={11} /> {decision.date}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>
            {status.label}
          </span>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <UserIcon size={11} /> 決策人：<span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] text-white font-bold ${getAvatarColor(decision.decidedBy)}`}>{decision.decidedBy.charAt(0)}</span> {decision.decidedBy}
          </span>
        </div>
        <h2 className={`text-xl font-black text-gray-900 leading-tight ${decision.status === 'reversed' ? 'line-through text-gray-400' : ''}`}>
          {decision.title}
        </h2>
        {(decision.tags ?? []).length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {(decision.tags ?? []).map(t => {
              const td = DECISION_TAGS.find(x => x.id === t);
              const s = DECISION_TAG_STYLES[t];
              return td ? (
                <span key={t} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
                  {td.emoji} {td.label}
                </span>
              ) : null;
            })}
          </div>
        )}
      </div>

      {/* Supersedes chain */}
      {(supersedes || supersededBy) && (
        <div className="bg-gray-50 rounded-xl p-3 space-y-2 border border-gray-200">
          {supersedes && (
            <button onClick={() => onNavigate(supersedes.id)} className="w-full flex items-start gap-2 text-left hover:text-blue-600 transition-colors group">
              <ArrowLeft size={14} className="mt-0.5 shrink-0 text-gray-400 group-hover:text-blue-600" />
              <div className="flex-1">
                <p className="text-[10px] text-gray-500 font-bold">取代了</p>
                <p className="text-xs font-bold text-gray-700 group-hover:underline">{supersedes.date} — {supersedes.title}</p>
              </div>
            </button>
          )}
          {supersededBy && (
            <button onClick={() => onNavigate(supersededBy.id)} className="w-full flex items-start gap-2 text-left hover:text-blue-600 transition-colors group">
              <ArrowRight size={14} className="mt-0.5 shrink-0 text-gray-400 group-hover:text-blue-600" />
              <div className="flex-1">
                <p className="text-[10px] text-gray-500 font-bold">被取代於</p>
                <p className="text-xs font-bold text-gray-700 group-hover:underline">{supersededBy.date} — {supersededBy.title}</p>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Context */}
      {decision.context && (
        <Section title="背景 / 觸發點" content={decision.context} />
      )}

      {/* Decision */}
      <Section title="決策內容" content={decision.decision} highlight />

      {/* Rationale */}
      {decision.rationale && (
        <Section title="原因 / 理由" content={decision.rationale} />
      )}

      {/* Evidence images */}
      {(decision.evidenceImages ?? []).length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">證據截圖</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(decision.evidenceImages ?? []).map(url => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 transition-colors"
              >
                <img src={url} alt="證據" className="w-full h-32 object-cover" loading="lazy" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Linked roadmap */}
      {linkedRoadmap.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">關聯 Roadmap</p>
          <div className="flex flex-wrap gap-1.5">
            {linkedRoadmap.map(r => (
              <span key={r.id} className="text-xs px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                {r.title}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Meta */}
      <div className="text-[10px] text-gray-400 border-t border-gray-100 pt-3">
        紀錄者 {decision.createdByName} · {new Date(decision.createdAt).toLocaleDateString('zh-TW')}
        {decision.updatedAt && decision.updatedAt !== decision.createdAt && (
          <> · 最後更新 {new Date(decision.updatedAt).toLocaleDateString('zh-TW')}</>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 flex-wrap">
        <button
          onClick={onEdit}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
        >
          <Pencil size={12} /> 編輯
        </button>
        {decision.status === 'active' && (
          <button
            onClick={onReverse}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
          >
            推翻此決策
          </button>
        )}
        <button
          onClick={onDelete}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors ml-auto"
        >
          <Trash2 size={12} /> 刪除
        </button>
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; content: string; highlight?: boolean }> = ({ title, content, highlight }) => (
  <div>
    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">{title}</p>
    <div className={`text-sm text-gray-700 leading-relaxed whitespace-pre-line rounded-xl p-3 ${
      highlight ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50 border border-gray-100'
    }`}>
      {content}
    </div>
  </div>
);
