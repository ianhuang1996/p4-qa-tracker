import React, { useState, useEffect } from 'react';
import { 
  X, Edit2, Trash2, Save, ExternalLink, Image as ImageIcon, Video, 
  Calendar, User, Tag, Info, AlertTriangle, CheckCircle, Share2, Plus,
  MessageSquare, History, AtSign, LayoutGrid, UploadCloud, Sparkles, Loader2, Maximize, Play, FileText, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AugmentedQAItem, HistoryEntry } from '../types';
import { QA_FLOWS, RDS, PMS, MODULES, PRIORITY_COLORS, STATUS_COLORS } from '../constants';
import { getDirectImageUrl, getVideoEmbedUrl, isDirectVideo } from '../utils/qaUtils';
import { QAItem, QAComment } from '../data';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { summarizeDiscussion } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface QAItemModalProps {
  item: AugmentedQAItem;
  isEditing: boolean;
  isAdding: boolean;
  editForm: QAItem | null;
  setEditForm: React.Dispatch<React.SetStateAction<QAItem | null>>;
  onClose: () => void;
  onEdit: () => void;
  onSave: () => void;
  onDelete: () => void;
  onCancel: () => void;
  onQuickStatusUpdate: (status: string) => void;
  onCommentSubmit: (text: string) => void;
  onCommentDelete: (id: string) => void;
  onCommentEdit: (id: string, text: string) => void;
  user: any;
  isUploading: boolean;
  onImageUpload: (file: File) => void;
  onFileUpload: (file: File) => void;
}

export const QAItemModal: React.FC<QAItemModalProps> = ({
  item, isEditing, isAdding, editForm, setEditForm,
  onClose, onEdit, onSave, onDelete, onCancel,
  onQuickStatusUpdate, onCommentSubmit, onCommentDelete, onCommentEdit,
  user, isUploading, onImageUpload, onFileUpload
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'history'>('details');
  const [commentText, setCommentText] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxVideo, setLightboxVideo] = useState<{ url: string, isDirect: boolean } | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [comments, setComments] = useState<QAComment[]>([]);

  useEffect(() => {
    if (!item.id) return;
    
    // Fetch History
    const historyRef = collection(db, 'qa_items', item.id, 'history');
    const qHistory = query(historyRef, orderBy('timestamp', 'desc'));
    const unsubscribeHistory = onSnapshot(qHistory, (snapshot) => {
      const entries: HistoryEntry[] = [];
      snapshot.forEach(doc => entries.push({ id: doc.id, ...doc.data() } as HistoryEntry));
      setHistory(entries);
    });

    // Fetch Comments
    const commentsRef = collection(db, 'qa_items', item.id, 'comments');
    const qComments = query(commentsRef, orderBy('createdAt', 'asc'));
    const unsubscribeComments = onSnapshot(qComments, (snapshot) => {
      const entries: QAComment[] = [];
      snapshot.forEach(doc => entries.push({ id: doc.id, ...doc.data() } as QAComment));
      setComments(entries);
    });

    return () => {
      unsubscribeHistory();
      unsubscribeComments();
    };
  }, [item.id]);

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setCommentText(value);
    if (value.endsWith('@')) {
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (name: string) => {
    setCommentText(prev => prev + name + ' ');
    setShowMentions(false);
  };

  const handleSummarize = async () => {
    setIsSummarizing(true);
    const summary = await summarizeDiscussion(item, comments);
    setAiSummary(summary);
    setIsSummarizing(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isEditing) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isEditing) return;
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      onImageUpload(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, x: '100%' }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="bg-white shadow-2xl w-full max-w-3xl h-full flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              {isAdding ? '新增問題' : item.id}
            </span>
            {!isEditing && (
              <span className={`px-3 py-1 text-xs font-bold rounded-full border ${STATUS_COLORS[item.currentFlow || '待處理']}`}>
                {item.currentFlow}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button 
                onClick={onEdit}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="編輯"
              >
                <Edit2 size={20} />
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        {!isAdding && !isEditing && (
          <div className="flex border-b border-gray-100 px-4 bg-white sticky top-0 z-10">
            <button 
              onClick={() => setActiveTab('details')}
              className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'details' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <Info size={16} /> 詳情
            </button>
            <button 
              onClick={() => setActiveTab('comments')}
              className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'comments' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <MessageSquare size={16} /> 留言 ({comments.length})
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'history' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <History size={16} /> 紀錄 ({history.length})
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {isEditing ? (
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

              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      className="peer sr-only"
                      checked={editForm?.isNextRelease || false}
                      onChange={(e) => setEditForm(prev => prev ? { ...prev, isNextRelease: e.target.checked } : null)}
                    />
                    <div className="w-5 h-5 rounded border-2 border-indigo-300 bg-white peer-checked:bg-indigo-500 peer-checked:border-indigo-500 transition-all flex items-center justify-center">
                      <Check size={14} className="text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-indigo-900 group-hover:text-indigo-700 transition-colors">
                    排入下次發布 (Next Release)
                  </span>
                </label>
                
                {editForm?.isNextRelease && (
                  <div className="pl-8 animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2 block">發布備註 (選填)</label>
                    <input 
                      type="text" 
                      className="w-full p-3 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-white text-sm"
                      value={editForm?.releaseNote || ''}
                      onChange={(e) => setEditForm(prev => prev ? { ...prev, releaseNote: e.target.value } : null)}
                      placeholder="例如：Neo 需再確認"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">圖片附件 (可多張)</label>
                  
                  {/* Legacy imageLink */}
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

                  {/* Multiple imageLinks */}
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
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
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
                  
                  {/* Legacy videoLink */}
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

                  {/* Multiple videoLinks */}
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
                  {/* Legacy single attachment */}
                  {editForm?.attachmentUrl && (
                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-xl bg-gray-50 transition-all hover:border-blue-300">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="bg-blue-100 p-2 rounded-lg text-blue-600 shrink-0">
                          <FileText size={20} />
                        </div>
                        <div className="flex flex-col truncate">
                          <span className="text-sm font-bold text-gray-700 truncate">
                            {editForm.attachmentName || '已上傳附件'}
                          </span>
                          <span className="text-xs text-gray-400 truncate">
                            {editForm.attachmentUrl}
                          </span>
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

                  {/* Multiple attachments */}
                  {editForm?.attachments?.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-xl bg-gray-50 transition-all hover:border-blue-300">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="bg-blue-100 p-2 rounded-lg text-blue-600 shrink-0">
                          <FileText size={20} />
                        </div>
                        <div className="flex flex-col truncate">
                          <span className="text-sm font-bold text-gray-700 truncate">
                            {file.name || '已上傳附件'}
                          </span>
                          <span className="text-xs text-gray-400 truncate">
                            {file.url}
                          </span>
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
          ) : activeTab === 'details' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">{item.displayTitle}</h2>
                  <div className="prose prose-blue max-w-none text-gray-600 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {item.cleanDesc}
                    </ReactMarkdown>
                  </div>
                </div>

                {(item.imageLink || item.videoLink || (item.imageLinks && item.imageLinks.length > 0) || (item.videoLinks && item.videoLinks.length > 0)) && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                      <ImageIcon size={16} /> 媒體附件
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Images */}
                      {item.imageLink && (
                        <div 
                          className="relative group cursor-zoom-in rounded-xl overflow-hidden border border-gray-200 aspect-video bg-gray-100"
                          onClick={() => setLightboxUrl(getDirectImageUrl(item.imageLink!))}
                        >
                          <img 
                            src={getDirectImageUrl(item.imageLink)} 
                            alt="QA Screenshot" 
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="bg-white/90 text-gray-900 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">點擊放大</span>
                          </div>
                        </div>
                      )}
                      {item.imageLinks?.map((link, idx) => (
                        <div 
                          key={`img-${idx}`}
                          className="relative group cursor-zoom-in rounded-xl overflow-hidden border border-gray-200 aspect-video bg-gray-100"
                          onClick={() => setLightboxUrl(getDirectImageUrl(link))}
                        >
                          <img 
                            src={getDirectImageUrl(link)} 
                            alt={`QA Screenshot ${idx + 1}`} 
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="bg-white/90 text-gray-900 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">點擊放大</span>
                          </div>
                        </div>
                      ))}

                      {/* Videos */}
                      {item.videoLink && (
                        (isDirectVideo(item.videoLink) || getVideoEmbedUrl(item.videoLink)) ? (
                          <div 
                            className="relative rounded-xl overflow-hidden border border-gray-200 aspect-video bg-black group cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLightboxVideo({
                                url: item.videoLink!,
                                isDirect: isDirectVideo(item.videoLink!)
                              });
                            }}
                          >
                            {isDirectVideo(item.videoLink) ? (
                              <video src={item.videoLink} className="w-full h-full object-cover pointer-events-none opacity-70 group-hover:opacity-50 transition-opacity" />
                            ) : (
                              <iframe 
                                src={getVideoEmbedUrl(item.videoLink)!} 
                                className="w-full h-full pointer-events-none opacity-70 group-hover:opacity-50 transition-opacity" 
                                allowFullScreen
                                tabIndex={-1}
                              />
                            )}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="bg-black/60 text-white p-4 rounded-full backdrop-blur-sm group-hover:scale-110 group-hover:bg-blue-600/90 transition-all shadow-xl border border-white/10">
                                <Play size={32} className="ml-1" fill="currentColor" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <a 
                            href={item.videoLink} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex flex-col items-center justify-center p-6 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors gap-3 group h-full min-h-[160px]"
                            onClick={e => e.stopPropagation()}
                          >
                            <div className="bg-white p-3 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                              <ExternalLink size={24} className="text-blue-500" />
                            </div>
                            <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">開啟外部影片連結</span>
                          </a>
                        )
                      )}
                      {item.videoLinks?.map((link, idx) => (
                        (isDirectVideo(link) || getVideoEmbedUrl(link)) ? (
                          <div 
                            key={`vid-${idx}`}
                            className="relative rounded-xl overflow-hidden border border-gray-200 aspect-video bg-black group cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLightboxVideo({
                                url: link,
                                isDirect: isDirectVideo(link)
                              });
                            }}
                          >
                            {isDirectVideo(link) ? (
                              <video src={link} className="w-full h-full object-cover pointer-events-none opacity-70 group-hover:opacity-50 transition-opacity" />
                            ) : (
                              <iframe 
                                src={getVideoEmbedUrl(link)!} 
                                className="w-full h-full pointer-events-none opacity-70 group-hover:opacity-50 transition-opacity" 
                                allowFullScreen
                                tabIndex={-1}
                              />
                            )}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="bg-black/60 text-white p-4 rounded-full backdrop-blur-sm group-hover:scale-110 group-hover:bg-blue-600/90 transition-all shadow-xl border border-white/10">
                                <Play size={32} className="ml-1" fill="currentColor" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <a 
                            key={`vid-link-${idx}`}
                            href={link} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex flex-col items-center justify-center p-6 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors gap-3 group h-full min-h-[160px]"
                            onClick={e => e.stopPropagation()}
                          >
                            <div className="bg-white p-3 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                              <ExternalLink size={24} className="text-blue-500" />
                            </div>
                            <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">開啟外部影片連結</span>
                          </a>
                        )
                      ))}
                    </div>
                  </div>
                )}

                {(item.attachmentUrl || (item.attachments && item.attachments.length > 0)) && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                      <ExternalLink size={16} /> 檔案附件
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      {item.attachmentUrl && (
                        <a 
                          href={item.attachmentUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-center p-4 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors gap-3 group"
                        >
                          <div className="bg-white p-2 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                            <FileText size={20} className="text-blue-500" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-bold text-gray-700 group-hover:text-blue-600">{item.attachmentName || '下載附件'}</div>
                            <div className="text-xs text-gray-400">點擊下載或預覽</div>
                          </div>
                        </a>
                      )}
                      {item.attachments?.map((file, index) => (
                        <a 
                          key={index}
                          href={file.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-center p-4 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors gap-3 group"
                        >
                          <div className="bg-white p-2 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                            <FileText size={20} className="text-blue-500" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-bold text-gray-700 group-hover:text-blue-600">{file.name || '下載附件'}</div>
                            <div className="text-xs text-gray-400">點擊下載或預覽</div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-4">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">屬性資訊</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 flex items-center gap-2"><Tag size={14} /> 優先級</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${PRIORITY_COLORS[item.priority]}`}>{item.priority}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 flex items-center gap-2"><LayoutGrid size={14} /> 模組</span>
                      <span className="text-xs font-bold text-gray-700">{item.module}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 flex items-center gap-2"><User size={14} /> 負責人</span>
                      <span className="text-xs font-bold text-gray-700">{item.assignee}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 flex items-center gap-2"><User size={14} /> 測試人員</span>
                      <span className="text-xs font-bold text-gray-700">{item.tester}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 flex items-center gap-2"><Calendar size={14} /> 測試日期</span>
                      <span className="text-xs font-bold text-gray-700">{item.date}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 space-y-4">
                  <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider">快速操作</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {QA_FLOWS.filter(s => s !== item.currentFlow).map(status => (
                      <button 
                        key={status}
                        onClick={() => onQuickStatusUpdate(status)}
                        className="text-[10px] font-bold py-2 px-3 bg-white border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'comments' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">討論留言</h3>
                {comments.length > 3 && (
                  <button 
                    onClick={handleSummarize}
                    disabled={isSummarizing}
                    className="flex items-center gap-2 text-xs font-bold text-purple-600 hover:text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSummarizing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    AI 討論摘要
                  </button>
                )}
              </div>

              {aiSummary && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-purple-50 border border-purple-100 p-4 rounded-2xl relative"
                >
                  <button 
                    onClick={() => setAiSummary(null)}
                    className="absolute top-2 right-2 text-purple-400 hover:text-purple-600"
                  >
                    <X size={14} />
                  </button>
                  <div className="flex items-start gap-3">
                    <Sparkles size={18} className="text-purple-600 shrink-0 mt-1" />
                    <div className="text-sm text-purple-900 whitespace-pre-wrap leading-relaxed">
                      <div className="font-bold mb-1">AI 討論摘要：</div>
                      {aiSummary}
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="relative">
                <textarea 
                  className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all min-h-[100px] text-sm"
                  placeholder="輸入留言... (使用 @ 提及成員)"
                  value={commentText}
                  onChange={handleCommentChange}
                />
                <AnimatePresence>
                  {showMentions && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-full left-0 mb-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl p-2 z-20"
                    >
                      <div className="text-[10px] font-bold text-gray-400 px-2 py-1 uppercase tracking-wider">提及成員</div>
                      {[...RDS, ...PMS].filter(n => n !== 'Unassigned').map(name => (
                        <button 
                          key={name}
                          onClick={() => insertMention(name)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 rounded-lg flex items-center gap-2"
                        >
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-[10px] text-white font-bold">{name.charAt(0)}</div>
                          {name}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex justify-end mt-2">
                  <button 
                    onClick={() => { onCommentSubmit(commentText); setCommentText(''); }}
                    className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center gap-2"
                  >
                    <Share2 size={16} /> 送出留言
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {comments.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-sm">尚無留言</p>
                  </div>
                ) : (
                  comments.slice().reverse().map(comment => (
                    <div key={comment.id} className="flex gap-4 group">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center font-bold text-gray-500">
                        {comment.userName.charAt(0)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-gray-900">{comment.userName}</span>
                          <span className="text-[10px] text-gray-400">{new Date(comment.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-2xl rounded-tl-none border border-gray-100 text-sm text-gray-700 relative">
                          {comment.text}
                          {user?.uid === comment.userId && (
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                              <button onClick={() => onCommentDelete(comment.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {history.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <History size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="text-sm">尚無紀錄</p>
                </div>
              ) : (
                history.map(entry => (
                  <div key={entry.id} className="flex gap-4 relative pb-6 last:pb-0">
                    <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gray-100 last:hidden"></div>
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex-shrink-0 flex items-center justify-center text-blue-500 z-10">
                      <History size={18} />
                    </div>
                    <div className="flex-1 pt-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-gray-900">{entry.userName}</span>
                        <span className="text-[10px] text-gray-400">{new Date(entry.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm space-y-2">
                        {entry.changes.map((change, idx) => (
                          <div key={idx} className="text-xs">
                            {change.field === 'all' ? (
                              <span className="text-green-600 font-bold">建立項目</span>
                            ) : (
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="text-gray-500">修改了</span>
                                <span className="font-bold text-gray-700">{change.field}</span>
                                <span className="text-gray-400">從</span>
                                <span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded line-through">{String(change.oldValue || '無')}</span>
                                <span className="text-gray-400">改為</span>
                                <span className="px-1.5 py-0.5 bg-green-50 text-green-600 rounded font-bold">{String(change.newValue || '無')}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <div>
            {!isEditing && !isAdding && (
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 hover:text-red-700 text-sm font-bold flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-red-50 transition-colors"
              >
                <Trash2 size={18} /> 刪除項目
              </button>
            )}
          </div>
          <div className="flex gap-3">
            {isEditing ? (
              <>
                <button 
                  onClick={onCancel}
                  className="px-6 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={onSave}
                  className="bg-blue-600 text-white px-8 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center gap-2"
                >
                  <Save size={18} /> 儲存變更
                </button>
              </>
            ) : (
              <button 
                onClick={onClose}
                className="bg-gray-900 text-white px-8 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors"
              >
                關閉
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">確定要刪除嗎？</h3>
              <p className="text-gray-500 text-sm mb-8">此操作無法復原，該項目的所有資料與留言將被永久移除。</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={onDelete}
                  className="flex-1 bg-red-600 text-white py-3 rounded-2xl text-sm font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                >
                  確定刪除
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
            onClick={() => setLightboxUrl(null)}
          >
            <button className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors">
              <X size={32} />
            </button>
            <motion.img 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              src={lightboxUrl} 
              className="max-w-full max-h-full object-contain shadow-2xl"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Lightbox */}
      <AnimatePresence>
        {lightboxVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 md:p-12"
          >
            <button
              onClick={() => setLightboxVideo(null)}
              className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors z-50 p-2"
            >
              <X size={32} />
            </button>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-6xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl relative"
            >
              {lightboxVideo.isDirect ? (
                <video src={lightboxVideo.url} controls autoPlay className="w-full h-full outline-none" />
              ) : (
                <iframe src={getVideoEmbedUrl(lightboxVideo.url) || ''} className="w-full h-full border-0" allowFullScreen allow="autoplay; fullscreen" />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
