import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { RoadmapItem, RoadmapTrack, RoadmapStatus, Release, QAItem } from '../types';
import { ROADMAP_TRACKS, ROADMAP_BOARD_STATUSES, ROADMAP_TRACK_STYLES, ROADMAP_PRIORITY_STYLES, getUpcomingMonths, formatMonth } from '../constants/roadmapConstants';
import { PMS, RDS } from '../constants';

// Bug 修正 is derived from releases — not manually created
const MANUAL_TRACKS = ROADMAP_TRACKS.filter(t => t.id !== 'bug_fix');
const ALL_MEMBERS = [...PMS, ...RDS].filter(n => n !== 'Unassigned');

interface RoadmapItemModalProps {
  item?: RoadmapItem | null;
  defaultStatus?: RoadmapStatus;
  defaultTrack?: RoadmapTrack;
  releases: Release[];
  backendQAItems: QAItem[];   // module='後台' QA items for linking
  onSave: (data: Omit<RoadmapItem, 'id' | 'createdAt' | 'createdBy' | 'createdByName'>) => void;
  onClose: () => void;
}

type FormData = Omit<RoadmapItem, 'id' | 'createdAt' | 'createdBy' | 'createdByName' | 'isDerived' | 'qaStats'>;

const emptyForm = (status: RoadmapStatus, track: RoadmapTrack): FormData => ({
  title: '',
  description: '',
  track,
  status,
  targetMonth: '',
  priority: undefined,
  linkedReleaseId: undefined,
  linkedReleaseVersion: undefined,
  linkedQAItemIds: [],
  assignees: [],
});

export const RoadmapItemModal: React.FC<RoadmapItemModalProps> = ({
  item, defaultStatus, defaultTrack, releases, backendQAItems, onSave, onClose,
}) => {
  const [form, setForm] = useState<FormData>(emptyForm('next', 'feature'));
  const [qaSearch, setQaSearch] = useState('');
  const months = getUpcomingMonths();

  useEffect(() => {
    if (item) {
      const { id, createdAt, createdBy, createdByName, isDerived, qaStats, ...rest } = item;
      setForm({ ...rest, linkedQAItemIds: rest.linkedQAItemIds ?? [] });
    } else {
      const track = defaultTrack === 'bug_fix' ? 'feature' : (defaultTrack ?? 'feature');
      setForm(emptyForm(defaultStatus ?? 'next', track));
    }
  }, [item, defaultStatus, defaultTrack]);

  const toggleAssignee = (name: string) =>
    setForm(prev => ({
      ...prev,
      assignees: prev.assignees.includes(name)
        ? prev.assignees.filter(a => a !== name)
        : [...prev.assignees, name],
    }));

  const toggleQAItem = (id: string) =>
    setForm(prev => ({
      ...prev,
      linkedQAItemIds: (prev.linkedQAItemIds ?? []).includes(id)
        ? (prev.linkedQAItemIds ?? []).filter(q => q !== id)
        : [...(prev.linkedQAItemIds ?? []), id],
    }));

  const handleReleaseChange = (releaseId: string) => {
    const rel = releases.find(r => r.id === releaseId);
    setForm(prev => ({
      ...prev,
      linkedReleaseId: releaseId || undefined,
      linkedReleaseVersion: rel?.version,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave({
      ...form,
      targetMonth: form.targetMonth || undefined,
      linkedReleaseId: form.linkedReleaseId || undefined,
      linkedReleaseVersion: form.linkedReleaseVersion || undefined,
      priority: form.priority || undefined,
      linkedQAItemIds: form.track === 'backend' ? (form.linkedQAItemIds ?? []) : undefined,
    });
  };

  const filteredQAItems = backendQAItems.filter(q => {
    const keyword = qaSearch.toLowerCase();
    return !keyword
      || q.id.toLowerCase().includes(keyword)
      || (q.title ?? '').toLowerCase().includes(keyword)
      || q.description.toLowerCase().includes(keyword);
  });

  const INPUT = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white';
  const LABEL = 'block text-xs font-bold text-gray-600 mb-1';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-black text-gray-900">{item ? '編輯 Roadmap 項目' : '新增 Roadmap 項目'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className={LABEL}>標題 *</label>
            <input
              className={INPUT}
              value={form.title}
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="功能或計畫名稱"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className={LABEL}>說明</label>
            <textarea
              className={`${INPUT} resize-none`}
              rows={3}
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="簡短描述這個功能或計畫"
            />
          </div>

          {/* Track — bug_fix excluded (auto-derived from releases) */}
          <div>
            <label className={LABEL}>產品線</label>
            <div className="flex gap-2">
              {MANUAL_TRACKS.map(t => {
                const s = ROADMAP_TRACK_STYLES[t.id];
                const active = form.track === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, track: t.id }))}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${
                      active ? `${s.bg} ${s.text} ${s.border}` : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {t.emoji} {t.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">🐛 Bug 修正由版更管理自動產生，無需手動建立</p>
          </div>

          {/* Status */}
          <div>
            <label className={LABEL}>狀態</label>
            <div className="flex gap-2">
              {ROADMAP_BOARD_STATUSES.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, status: s.id }))}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${
                    form.status === s.id
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority + Quarter */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>優先級（選填）</label>
              <select
                className={INPUT}
                value={form.priority ?? ''}
                onChange={e => setForm(prev => ({ ...prev, priority: (e.target.value as RoadmapItem['priority']) || undefined }))}
              >
                <option value="">不設定</option>
                {Object.entries(ROADMAP_PRIORITY_STYLES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}優先</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>目標月份（選填）</label>
              <select
                className={INPUT}
                value={form.targetMonth ?? ''}
                onChange={e => setForm(prev => ({ ...prev, targetMonth: e.target.value }))}
              >
                <option value="">未排期</option>
                {months.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
              </select>
            </div>
          </div>

          {/* 後台開發: QA Items linker */}
          {form.track === 'backend' && (
            <div>
              <label className={LABEL}>關聯 QA Items（後台模組）</label>
              <div className="relative mb-2">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className={`${INPUT} pl-8`}
                  placeholder="搜尋 ID 或標題..."
                  value={qaSearch}
                  onChange={e => setQaSearch(e.target.value)}
                />
              </div>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-50">
                {filteredQAItems.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">沒有符合的 QA items</p>
                ) : (
                  filteredQAItems.map(q => {
                    const selected = (form.linkedQAItemIds ?? []).includes(q.id);
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => toggleQAItem(q.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                          selected ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          selected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                        }`}>
                          {selected && <span className="text-white text-[10px] font-bold">✓</span>}
                        </div>
                        <span className="text-[11px] font-bold text-gray-500 shrink-0">{q.id}</span>
                        <span className="text-xs text-gray-700 truncate">{q.title || q.description.substring(0, 40)}</span>
                      </button>
                    );
                  })
                )}
              </div>
              {(form.linkedQAItemIds ?? []).length > 0 && (
                <p className="text-[10px] text-blue-600 mt-1">已選 {form.linkedQAItemIds!.length} 個</p>
              )}
            </div>
          )}

          {/* Linked Release (only for feature track) */}
          {form.track === 'feature' && (
            <div>
              <label className={LABEL}>關聯版本（選填）</label>
              <select
                className={INPUT}
                value={form.linkedReleaseId ?? ''}
                onChange={e => handleReleaseChange(e.target.value)}
              >
                <option value="">不關聯</option>
                {releases.map(r => (
                  <option key={r.id} value={r.id}>{r.version}</option>
                ))}
              </select>
            </div>
          )}

          {/* Assignees */}
          <div>
            <label className={LABEL}>負責人（可多選）</label>
            <div className="flex flex-wrap gap-2">
              {ALL_MEMBERS.map(name => (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleAssignee(name)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                    form.assignees.includes(name)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors">
              取消
            </button>
            <button
              type="submit"
              disabled={!form.title.trim()}
              className="px-5 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {item ? '儲存' : '新增'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
