import React, { useState } from 'react';
import { X, Share2, MessageSquare, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QAComment } from '../../data';
import { AugmentedQAItem } from '../../types';
import { RDS, PMS } from '../../constants';
import { summarizeDiscussion } from '../../services/geminiService';
import { User as FirebaseUser } from 'firebase/auth';
import { formatTimestamp } from '../../utils/qaUtils';

interface ModalCommentsProps {
  item: AugmentedQAItem;
  comments: QAComment[];
  user: FirebaseUser;
  onCommentSubmit: (text: string) => void;
  onCommentDelete: (id: string) => void;
}

export const ModalComments: React.FC<ModalCommentsProps> = ({
  item, comments, user, onCommentSubmit, onCommentDelete
}) => {
  const [commentText, setCommentText] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setCommentText(value);
    setShowMentions(value.endsWith('@'));
  };

  const insertMention = (name: string) => {
    setCommentText(prev => prev + name + ' ');
    setShowMentions(false);
  };

  const handleSummarize = async () => {
    setIsSummarizing(true);
    try {
      const summary = await summarizeDiscussion(item, comments);
      setAiSummary(summary);
    } catch (error) {
      console.error('AI summarize failed:', error);
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
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
                  <span className="text-[10px] text-gray-400">{formatTimestamp(comment.createdAt)}</span>
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
  );
};
