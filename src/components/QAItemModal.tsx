import React, { useState, useEffect, useRef } from 'react';
import { X, Edit2, Trash2, Save, Info, AlertTriangle, MessageSquare, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QAItem, QAComment, AugmentedQAItem, HistoryEntry, ReleaseLinksProps } from '../types';
import { STATUS_COLORS, BTN } from '../constants';
import { getVideoEmbedUrl } from '../utils/qaUtils';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';

import { ModalEditForm } from './modal/ModalEditForm';
import { ModalDetails } from './modal/ModalDetails';
import { ModalComments } from './modal/ModalComments';
import { ModalHistory } from './modal/ModalHistory';

interface QAItemModalProps extends ReleaseLinksProps {
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
  user: FirebaseUser;
  isUploading: boolean;
  onImageUpload: (file: File) => void;
  onFileUpload: (file: File) => void;
  activeReleaseVersion?: string;
  isInActiveRelease?: boolean;
  onToggleRelease?: (add: boolean) => void;
}

export const QAItemModal: React.FC<QAItemModalProps> = ({
  item, isEditing, isAdding, editForm, setEditForm,
  onClose, onEdit, onSave, onDelete, onCancel,
  onQuickStatusUpdate, onCommentSubmit, onCommentDelete,
  user, isUploading, onImageUpload, onFileUpload,
  activeReleaseVersion, isInActiveRelease, onToggleRelease,
  unreleasedReleases = [], onLinkToRelease, onUnlinkFromRelease
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'history'>('details');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxVideo, setLightboxVideo] = useState<{ url: string, isDirect: boolean } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [comments, setComments] = useState<QAComment[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxUrl) setLightboxUrl(null);
        else if (lightboxVideo) setLightboxVideo(null);
        else if (showDeleteConfirm) setShowDeleteConfirm(false);
        else onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [lightboxUrl, lightboxVideo, showDeleteConfirm, onClose]);

  // Focus trap
  useEffect(() => {
    modalRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!item.id) return;

    const historyRef = collection(db, 'qa_items', item.id, 'history');
    const qHistory = query(historyRef, orderBy('timestamp', 'desc'));
    const unsubscribeHistory = onSnapshot(qHistory, (snapshot) => {
      const entries: HistoryEntry[] = [];
      snapshot.forEach(doc => entries.push({ id: doc.id, ...doc.data() } as HistoryEntry));
      setHistory(entries);
    });

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
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-label={isAdding ? '新增問題' : `問題詳情 ${item.id}`}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm overflow-hidden outline-none"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
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
                aria-label="編輯問題"
              >
                <Edit2 size={20} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="關閉"
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
            <ModalEditForm
              editForm={editForm}
              setEditForm={setEditForm}
              isUploading={isUploading}
              onImageUpload={onImageUpload}
              onFileUpload={onFileUpload}
              isDragging={isDragging}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              activeReleaseVersion={activeReleaseVersion}
              isInActiveRelease={isInActiveRelease}
              onToggleRelease={onToggleRelease}
              unreleasedReleases={unreleasedReleases}
              itemId={item.id}
              onLinkToRelease={onLinkToRelease}
              onUnlinkFromRelease={onUnlinkFromRelease}
            />
          ) : activeTab === 'details' ? (
            <ModalDetails
              item={item}
              onQuickStatusUpdate={onQuickStatusUpdate}
              onLightboxOpen={setLightboxUrl}
              onVideoLightboxOpen={(url, isDirect) => setLightboxVideo({ url, isDirect })}
            />
          ) : activeTab === 'comments' ? (
            <ModalComments
              item={item}
              comments={comments}
              user={user}
              onCommentSubmit={onCommentSubmit}
              onCommentDelete={onCommentDelete}
            />
          ) : (
            <ModalHistory history={history} />
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
                  disabled={!editForm?.title?.trim()}
                  className={`${BTN.primary} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <Save size={18} /> 儲存變更
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onEdit}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Edit2 size={16} /> 編輯
                </button>
                <button
                  onClick={onClose}
                  className="bg-gray-900 text-white px-8 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors"
                >
                  關閉
                </button>
              </>
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

      {/* Image Lightbox */}
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
