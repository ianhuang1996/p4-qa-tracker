import React, { useMemo } from 'react';
import { X, Video, UploadCloud, Loader2, FileText, Check, AlertTriangle, ArrowRight } from 'lucide-react';
import { QAItem, ReleaseLinksProps } from '../../types';
import { QA_FLOWS, RDS, MODULES, STATUS } from '../../constants';
import { getDirectImageUrl } from '../../utils/qaUtils';

interface ModalEditFormProps extends ReleaseLinksProps {
  editForm: QAItem | null;
  setEditForm: React.Dispatch<React.SetStateAction<QAItem | null>>;
  isUploading: boolean;
  onImageUpload: (file: File) => void;
  onFileUpload: (file: File) => void;
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  activeReleaseVersion?: string;
  isInActiveRelease?: boolean;
  onToggleRelease?: (add: boolean) => void;
  itemId?: string;
  /** Existing items used for duplicate detection while creating a new bug. */
  existingItems?: QAItem[];
  /** True when this form is creating a new item (enables duplicate detection). */
  isCreating?: boolean;
  /** Called when user picks one of the similar items — usually closes the create form and navigates. */
  onJumpToSimilar?: (itemId: string) => void;
}

export const ModalEditForm: React.FC<ModalEditFormProps> = ({
  editForm, setEditForm, isUploading, onImageUpload, onFileUpload,
  isDragging, onDragOver, onDragLeave, onDrop,
  activeReleaseVersion, isInActiveRelease, onToggleRelease,
  unreleasedReleases = [], itemId, onLinkToRelease, onUnlinkFromRelease,
  existingItems, isCreating, onJumpToSimilar,
}) => {
  // Find similar items (same module, fuzzy title match) only while creating a new item.
  const similarItems = useMemo(() => {
    if (!isCreating || !existingItems || !editForm) return [];
    const title = (editForm.title || '').trim();
    if (title.length < 3) return [];
    const tLower = title.toLowerCase();
    const tWords = tLower.split(/\s+/).filter(w => w.length >= 2);
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - THIRTY_DAYS_MS;
    return existingItems
      .filter(it => {
        if (it.id === editForm.id) return false;
        if (it.currentFlow === STATUS.closed) return false;
        if (editForm.module && it.module !== editForm.module) return false;
        const itTitle = (it.title || '').toLowerCase();
        if (!itTitle) return false;
        // direct substring OR any 2+ char word in common
        if (itTitle.includes(tLower) || tLower.includes(itTitle)) return true;
        if (tWords.some(w => itTitle.includes(w))) return true;
        return false;
      })
      .filter(it => new Date(it.date + 'T00:00:00').getTime() >= cutoff)
      .sort((a, b) =>
        new Date(b.date + 'T00:00:00').getTime() - new Date(a.date + 'T00:00:00').getTime()
      )
      .slice(0, 3);
  }, [isCreating, existingItems, editForm]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            標題 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${editForm !== null && !editForm?.title?.trim() ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
            value={editForm?.title || ''}
            onChange={(e) => setEditForm(prev => prev ? { ...prev, title: e.target.value } : null)}
            placeholder="請輸入問題標題"
          />
          {editForm !== null && !editForm?.title?.trim() && (
            <p className="text-xs text-red-500">標題為必填</p>
          )}
          {similarItems.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-2">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle size={14} className="text-amber-600" />
                <span className="text-xs font-bold text-amber-800">可能重複（{similarItems.length}）</span>
              </div>
              <div className="space-y-1.5">
                {similarItems.map(sim => (
                  <button
                    key={sim.id}
                    type="button"
                    onClick={() => onJumpToSimilar?.(sim.id)}
                    className="w-full text-left bg-white border border-amber-200 hover:border-amber-400 hover:bg-amber-50 rounded-lg px-2.5 py-1.5 flex items-center gap-2 transition-colors group"
                  >
                    <span className="text-[10px] font-bold text-gray-400 shrink-0">{sim.id}</span>
                    <span className="text-xs text-gray-700 truncate flex-1">{sim.title || '(無標題)'}</span>
                    <span className="text-[10px] text-gray-400 shrink-0">{sim.currentFlow}</span>
                    <ArrowRight size={12} className="text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-amber-700 mt-1.5">點擊跳轉至既有項目，或繼續建立新項目</p>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">優先級</label>
          <select
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
            value={editForm?.priority || '-'}
            onChange={(e) => setEditForm(prev => prev ? { ...prev, priority: e.target.value } : null)}
          >
            <option value="-">無優先級</option>
            <option value="P0">P0 - 立即修復</option>
            <option value="P1">P1 - 嚴重問題</option>
            <option value="P2">P2 - 一般問題</option>
            <option value="P3">P3 - 優化建議</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">負責人</label>
          <select
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
            value={editForm?.assignee || 'Unassigned'}
            onChange={(e) => setEditForm(prev => prev ? { ...prev, assignee: e.target.value } : null)}
          >
            {RDS.map(rd => <option key={rd} value={rd}>{rd}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">模組</label>
          <select
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
            value={editForm?.module || '其他'}
            onChange={(e) => setEditForm(prev => prev ? { ...prev, module: e.target.value } : null)}
          >
            {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">問題敘述</label>
          <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">支援 Markdown 語法</span>
        </div>
        <textarea
          className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all min-h-[120px] font-mono text-sm"
          value={editForm?.description || ''}
          onChange={(e) => setEditForm(prev => prev ? { ...prev, description: e.target.value } : null)}
          placeholder={"## 現況\n\n\n## 預期結果\n\n"}
        />
      </div>

      {unreleasedReleases.length > 0 && itemId && onLinkToRelease && onUnlinkFromRelease ? (
        <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-2">
          <label className="text-xs font-bold text-indigo-600 uppercase tracking-wider">排入版本</label>
          <div className="space-y-1.5">
            {unreleasedReleases.map(r => {
              const isLinked = r.linkedItemIds.includes(itemId);
              return (
                <label key={r.id} className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input
                      type="radio"
                      name="releaseVersion"
                      className="peer sr-only"
                      checked={isLinked}
                      onChange={() => {
                        // Unlink from all other releases first, then link to this one
                        unreleasedReleases.forEach(other => {
                          if (other.id !== r.id && other.linkedItemIds.includes(itemId)) {
                            onUnlinkFromRelease(other.id);
                          }
                        });
                        if (!isLinked) onLinkToRelease(r.id);
                      }}
                    />
                    <div className="w-5 h-5 rounded-full border-2 border-indigo-300 bg-white peer-checked:bg-indigo-500 peer-checked:border-indigo-500 transition-all flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <span className={`text-sm font-bold transition-colors ${isLinked ? 'text-indigo-700' : 'text-gray-500 group-hover:text-indigo-600'}`}>
                    {r.version}
                  </span>
                </label>
              );
            })}
            {/* Option to unlink from all */}
            {unreleasedReleases.some(r => r.linkedItemIds.includes(itemId)) && (
              <button
                onClick={() => unreleasedReleases.forEach(r => {
                  if (r.linkedItemIds.includes(itemId)) onUnlinkFromRelease(r.id);
                })}
                className="text-xs text-gray-400 hover:text-red-500 font-bold mt-1 transition-colors"
              >
                移除版本關聯
              </button>
            )}
          </div>
        </div>
      ) : onToggleRelease ? (
        <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-2">
          <p className="text-xs text-indigo-400">目前沒有進行中的版本，請先至版更管理建立版本</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">圖片附件 (可多張)</label>

          {editForm?.imageLink && (
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-200">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 shrink-0">
                <img src={getDirectImageUrl(editForm.imageLink)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <span className="text-xs text-gray-500 truncate flex-1">{editForm.imageLink}</span>
              <button
                onClick={() => setEditForm(prev => prev ? { ...prev, imageLink: '' } : null)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {editForm?.imageLinks?.map((link, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-200">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 shrink-0">
                <img src={getDirectImageUrl(link)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <span className="text-xs text-gray-500 truncate flex-1">{link}</span>
              <button
                onClick={() => setEditForm(prev => {
                  if (!prev) return null;
                  const newLinks = [...(prev.imageLinks || [])];
                  newLinks.splice(index, 1);
                  return { ...prev, imageLinks: newLinks };
                })}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ))}

          <div
            className={`flex gap-2 p-1 rounded-2xl border-2 border-dashed transition-all ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-transparent'}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <input
              type="text"
              className="flex-1 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
              placeholder="貼上圖片網址或拖曳圖片"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (val) {
                    setEditForm(prev => {
                      if (!prev) return null;
                      return { ...prev, imageLinks: [...(prev.imageLinks || []), val] };
                    });
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
            />
            <label className="cursor-pointer bg-blue-50 text-blue-600 p-3 rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center min-w-[48px]">
              {isUploading ? <Loader2 size={20} className="animate-spin" /> : <UploadCloud size={20} />}
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && onImageUpload(e.target.files[0])}
                disabled={isUploading}
              />
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">影片連結 (可多個)</label>

          {editForm?.videoLink && (
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-200">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <Video size={16} />
              </div>
              <span className="text-xs text-gray-500 truncate flex-1">{editForm.videoLink}</span>
              <button
                onClick={() => setEditForm(prev => prev ? { ...prev, videoLink: '' } : null)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {editForm?.videoLinks?.map((link, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-200">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <Video size={16} />
              </div>
              <span className="text-xs text-gray-500 truncate flex-1">{link}</span>
              <button
                onClick={() => setEditForm(prev => {
                  if (!prev) return null;
                  const newLinks = [...(prev.videoLinks || [])];
                  newLinks.splice(index, 1);
                  return { ...prev, videoLinks: newLinks };
                })}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ))}

          <input
            type="text"
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
            placeholder="貼上 YouTube/Drive 連結並按 Enter"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const val = (e.target as HTMLInputElement).value.trim();
                if (val) {
                  setEditForm(prev => {
                    if (!prev) return null;
                    return { ...prev, videoLinks: [...(prev.videoLinks || []), val] };
                  });
                  (e.target as HTMLInputElement).value = '';
                }
              }
            }}
            onBlur={(e) => {
              const val = e.target.value.trim();
              if (val) {
                setEditForm(prev => {
                  if (!prev) return null;
                  return { ...prev, videoLinks: [...(prev.videoLinks || []), val] };
                });
                e.target.value = '';
              }
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">檔案附件 (PDF, ZIP, 等)</label>
        <div className="space-y-3">
          {editForm?.attachmentUrl && (
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-xl bg-gray-50 transition-all hover:border-blue-300">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600 shrink-0">
                  <FileText size={20} />
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-sm font-bold text-gray-700 truncate">{editForm.attachmentName || '已上傳附件'}</span>
                  <span className="text-xs text-gray-400 truncate">{editForm.attachmentUrl}</span>
                </div>
              </div>
              <button
                onClick={() => setEditForm(prev => prev ? { ...prev, attachmentUrl: '', attachmentName: '' } : null)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0 ml-2"
                title="移除附件"
              >
                <X size={20} />
              </button>
            </div>
          )}

          {editForm?.attachments?.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-xl bg-gray-50 transition-all hover:border-blue-300">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600 shrink-0">
                  <FileText size={20} />
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-sm font-bold text-gray-700 truncate">{file.name || '已上傳附件'}</span>
                  <span className="text-xs text-gray-400 truncate">{file.url}</span>
                </div>
              </div>
              <button
                onClick={() => setEditForm(prev => {
                  if (!prev) return null;
                  const newAttachments = [...(prev.attachments || [])];
                  newAttachments.splice(index, 1);
                  return { ...prev, attachments: newAttachments };
                })}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0 ml-2"
                title="移除附件"
              >
                <X size={20} />
              </button>
            </div>
          ))}

          <label className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-xl transition-all cursor-pointer ${isUploading ? 'border-gray-300 bg-gray-50 cursor-not-allowed' : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50 text-gray-500 hover:text-blue-600'}`}>
            {isUploading ? (
              <>
                <Loader2 size={20} className="animate-spin text-blue-500" />
                <span className="text-sm font-bold text-blue-500">上傳中...</span>
              </>
            ) : (
              <>
                <UploadCloud size={20} />
                <span className="text-sm font-bold">點擊上傳檔案 (可多個)</span>
              </>
            )}
            <input
              type="file"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onFileUpload(e.target.files[0])}
              disabled={isUploading}
            />
          </label>
        </div>
      </div>
    </div>
  );
};
