import React, { useState, useEffect, useRef } from 'react';
import { X, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Decision, DecisionTag, RoadmapItem } from '../types';
import { DECISION_TAGS, DECISION_TAG_STYLES, DECISION_MAKERS } from '../constants/decisionConstants';
import { getTodayStr } from '../utils/qaUtils';
import { Z } from '../styles/tokens';
import { authedFetch } from '../services/apiClient';

interface DecisionModalProps {
  decision?: Decision | null;
  allDecisions: Decision[];          // for supersedes picker
  roadmapItems: RoadmapItem[];
  prefilledMeetingNoteId?: string;
  prefilledContext?: string;
  onSave: (data: Omit<Decision, 'id' | 'createdAt' | 'createdBy' | 'createdByName' | 'status' | 'supersededById'>) => void;
  onClose: () => void;
}

type FormData = Omit<Decision, 'id' | 'createdAt' | 'createdBy' | 'createdByName' | 'status' | 'supersededById'>;

const emptyForm = (): FormData => ({
  date: getTodayStr(),
  title: '',
  context: '',
  decision: '',
  rationale: '',
  decidedBy: '老闆',
  tags: [],
  supersedesId: undefined,
  linkedRoadmapItemIds: [],
  meetingNoteId: undefined,
  evidenceImages: [],
});

export const DecisionModal: React.FC<DecisionModalProps> = ({
  decision, allDecisions, roadmapItems,
  prefilledMeetingNoteId, prefilledContext,
  onSave, onClose,
}) => {
  const [form, setForm] = useState<FormData>(emptyForm);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (decision) {
      const { id, createdAt, createdBy, createdByName, status, supersededById, ...rest } = decision;
      setForm({
        ...rest,
        tags: rest.tags ?? [],
        linkedRoadmapItemIds: rest.linkedRoadmapItemIds ?? [],
        evidenceImages: rest.evidenceImages ?? [],
      });
    } else {
      setForm({
        ...emptyForm(),
        meetingNoteId: prefilledMeetingNoteId,
        context: prefilledContext ?? '',
      });
    }
  }, [decision, prefilledMeetingNoteId, prefilledContext]);

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    const toastId = toast.loading(`上傳 ${files.length} 張圖片中…`);
    const newUrls: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('image', file);
        const res = await authedFetch('/api/imgbb/upload', { method: 'POST', body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          toast.error(`上傳失敗: ${data.error || `HTTP ${res.status}`}`, { id: toastId });
          return;
        }
        newUrls.push(data.url);
      }
      setForm(prev => ({ ...prev, evidenceImages: [...(prev.evidenceImages ?? []), ...newUrls] }));
      toast.success(`上傳成功（${newUrls.length} 張）`, { id: toastId });
    } catch (err) {
      toast.error(`上傳失敗: ${err instanceof Error ? err.message : '網路錯誤'}`, { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (url: string) =>
    setForm(prev => ({
      ...prev,
      evidenceImages: (prev.evidenceImages ?? []).filter(u => u !== url),
    }));

  const toggleTag = (tag: DecisionTag) =>
    setForm(prev => ({
      ...prev,
      tags: (prev.tags ?? []).includes(tag)
        ? (prev.tags ?? []).filter(t => t !== tag)
        : [...(prev.tags ?? []), tag],
    }));

  const toggleRoadmapItem = (id: string) =>
    setForm(prev => ({
      ...prev,
      linkedRoadmapItemIds: (prev.linkedRoadmapItemIds ?? []).includes(id)
        ? (prev.linkedRoadmapItemIds ?? []).filter(x => x !== id)
        : [...(prev.linkedRoadmapItemIds ?? []), id],
    }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.decision.trim() || !form.decidedBy.trim()) return;
    onSave({
      ...form,
      context: form.context?.trim() || undefined,
      rationale: form.rationale?.trim() || undefined,
      supersedesId: form.supersedesId || undefined,
      meetingNoteId: form.meetingNoteId || undefined,
      tags: (form.tags?.length ?? 0) > 0 ? form.tags : undefined,
      linkedRoadmapItemIds: (form.linkedRoadmapItemIds?.length ?? 0) > 0 ? form.linkedRoadmapItemIds : undefined,
      evidenceImages: (form.evidenceImages?.length ?? 0) > 0 ? form.evidenceImages : undefined,
    });
  };

  // Exclude self + any decision that's already superseded (avoid chain confusion)
  const supersedesCandidates = allDecisions.filter(d =>
    d.id !== decision?.id && d.status === 'active'
  );

  const INPUT = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white';
  const LABEL = 'block text-xs font-bold text-gray-600 mb-1';

  return (
    <div className={`fixed inset-0 bg-black/40 ${Z.modal} flex items-center justify-center p-2 sm:p-4`} onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
          <h2 className="text-base font-black text-gray-900">{decision ? '編輯決策' : '記錄決策'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {/* Date + Decided by */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>日期 *</label>
              <input
                type="date"
                className={INPUT}
                value={form.date}
                onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className={LABEL}>決策人 *</label>
              <select
                className={INPUT}
                value={DECISION_MAKERS.includes(form.decidedBy) ? form.decidedBy : '__custom'}
                onChange={e => {
                  if (e.target.value === '__custom') {
                    setForm(prev => ({ ...prev, decidedBy: '' }));
                  } else {
                    setForm(prev => ({ ...prev, decidedBy: e.target.value }));
                  }
                }}
              >
                {DECISION_MAKERS.map(m => <option key={m} value={m}>{m}</option>)}
                <option value="__custom">自訂...</option>
              </select>
              {!DECISION_MAKERS.includes(form.decidedBy) && (
                <input
                  className={`${INPUT} mt-2`}
                  placeholder="輸入決策人"
                  value={form.decidedBy}
                  onChange={e => setForm(prev => ({ ...prev, decidedBy: e.target.value }))}
                  required
                />
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className={LABEL}>摘要 *</label>
            <input
              className={INPUT}
              value={form.title}
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="一句話說明此決策（例：砍掉 Seedance 整合，改做 SSO）"
              required
              maxLength={200}
            />
          </div>

          {/* Context */}
          <div>
            <label className={LABEL}>背景 / 觸發點（選填）</label>
            <textarea
              className={`${INPUT} resize-none`}
              rows={2}
              value={form.context ?? ''}
              onChange={e => setForm(prev => ({ ...prev, context: e.target.value }))}
              placeholder="什麼事情促使這個決策產生？（會議、客戶反饋、競品、老闆想法…）"
            />
          </div>

          {/* Decision */}
          <div>
            <label className={LABEL}>決策內容 *</label>
            <textarea
              className={`${INPUT} resize-none`}
              rows={3}
              value={form.decision}
              onChange={e => setForm(prev => ({ ...prev, decision: e.target.value }))}
              placeholder="具體決定了什麼？有哪些行動要發生？"
              required
            />
          </div>

          {/* Rationale */}
          <div>
            <label className={LABEL}>原因 / 理由（選填）</label>
            <textarea
              className={`${INPUT} resize-none`}
              rows={2}
              value={form.rationale ?? ''}
              onChange={e => setForm(prev => ({ ...prev, rationale: e.target.value }))}
              placeholder="為什麼這樣決定？老闆原話或推理邏輯皆可"
            />
          </div>

          {/* Evidence images */}
          <div>
            <label className={LABEL}>證據截圖（選填）</label>
            <div className="space-y-2">
              {(form.evidenceImages ?? []).length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {(form.evidenceImages ?? []).map(url => (
                    <div key={url} className="relative group rounded-lg overflow-hidden border border-gray-200">
                      <img src={url} alt="證據" className="w-full h-24 object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(url)}
                        className="absolute top-1 right-1 p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        title="移除"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={e => handleImageUpload(e.target.files)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-xs font-bold text-gray-600 hover:text-blue-700 transition-colors disabled:opacity-60"
              >
                {isUploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                {isUploading ? '上傳中…' : '上傳圖片（可多張）'}
              </button>
              <p className="text-[10px] text-gray-400">用於佐證老闆原話、會議截圖、客戶反饋等</p>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className={LABEL}>標籤（可多選）</label>
            <div className="flex flex-wrap gap-2">
              {DECISION_TAGS.map(t => {
                const selected = (form.tags ?? []).includes(t.id);
                const style = DECISION_TAG_STYLES[t.id];
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTag(t.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                      selected ? `${style.bg} ${style.text} border-current` : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {t.emoji} {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Supersedes */}
          <div>
            <label className={LABEL}>取代哪個舊決策？（選填）</label>
            <select
              className={INPUT}
              value={form.supersedesId ?? ''}
              onChange={e => setForm(prev => ({ ...prev, supersedesId: e.target.value || undefined }))}
            >
              <option value="">（獨立新決策）</option>
              {supersedesCandidates.map(d => (
                <option key={d.id} value={d.id}>{d.date} — {d.title}</option>
              ))}
            </select>
            {form.supersedesId && (
              <p className="text-[11px] text-amber-600 mt-1">⚠ 該舊決策將自動標記為「已被取代」</p>
            )}
          </div>

          {/* Linked Roadmap items */}
          {roadmapItems.length > 0 && (
            <div>
              <label className={LABEL}>關聯 Roadmap 項目（可多選）</label>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-50">
                {roadmapItems.map(r => {
                  const selected = (form.linkedRoadmapItemIds ?? []).includes(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleRoadmapItem(r.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                        selected ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        selected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                      }`}>
                        {selected && <span className="text-white text-[10px] font-bold">✓</span>}
                      </div>
                      <span className="text-xs text-gray-700 truncate">{r.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors">
              取消
            </button>
            <button
              type="submit"
              disabled={!form.title.trim() || !form.decision.trim() || !form.decidedBy.trim()}
              className="px-5 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {decision ? '儲存' : '記錄'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
