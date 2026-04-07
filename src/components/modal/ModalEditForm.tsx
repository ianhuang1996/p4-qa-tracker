import React from 'react';
import { X, Video, UploadCloud, Loader2, FileText, Check } from 'lucide-react';
import { QAItem } from '../../data';
import { QA_FLOWS, RDS, MODULES } from '../../constants';
import { getDirectImageUrl } from '../../utils/qaUtils';

interface ModalEditFormProps {
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
}

export const ModalEditForm: React.FC<ModalEditFormProps> = ({
  editForm, setEditForm, isUploading, onImageUpload, onFileUpload,
  isDragging, onDragOver, onDragLeave, onDrop,
  activeReleaseVersion, isInActiveRelease, onToggleRelease
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">標題</label>
          <input
            type="text"
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            value={editForm?.title || ''}
            onChange={(e) => setEditForm(prev => prev ? { ...prev, title: e.target.value } : null)}
            placeholder="請輸入問題標題"
          />
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
          placeholder="請詳細描述問題內容... (支援 Markdown)"
        />
      </div>

      {onToggleRelease && (
        <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-2">
          {activeReleaseVersion ? (
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={isInActiveRelease || false}
                  onChange={(e) => onToggleRelease(e.target.checked)}
                />
                <div className="w-5 h-5 rounded border-2 border-indigo-300 bg-white peer-checked:bg-indigo-500 peer-checked:border-indigo-500 transition-all flex items-center justify-center">
                  <Check size={14} className="text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
              </div>
              <span className="text-sm font-bold text-indigo-900 group-hover:text-indigo-700 transition-colors">
                排入 {activeReleaseVersion}
              </span>
            </label>
          ) : (
            <p className="text-xs text-indigo-400">目前沒有進行中的版本，請先至版更管理建立版本</p>
          )}
        </div>
      )}

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
