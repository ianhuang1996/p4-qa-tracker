import React, { useState, useEffect } from 'react';
import { Rocket, Copy, Check, X, Sparkles } from 'lucide-react';
import { AugmentedQAItem } from '../types';

interface Props {
  items: AugmentedQAItem[];
  onItemClick: (item: AugmentedQAItem) => void;
  onRemoveFromRelease: (item: AugmentedQAItem) => void;
  onAutoAddReleaseItems?: () => void;
}

export const NextReleaseBlock: React.FC<Props> = ({ items, onItemClick, onRemoveFromRelease, onAutoAddReleaseItems }) => {
  const [scheduleText, setScheduleText] = useState(() => {
    return localStorage.getItem('releaseSchedule') || '16:00 → UAT 環境內測\n18:00 → 正式更新';
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    localStorage.setItem('releaseSchedule', scheduleText);
  }, [scheduleText]);

  const releaseItems = items.filter(i => i.isNextRelease);
  const eligibleItemsNotInRelease = items.filter(i => 
    i.currentFlow === '開發中' && !i.isNextRelease
  );

  if (releaseItems.length === 0 && eligibleItemsNotInRelease.length === 0) return null;

  const handleCopy = () => {
    const header = '二、今日版本更新排程';
    const itemsText = releaseItems.map(i => {
      const note = i.releaseNote ? `，${i.releaseNote}` : '';
      return `- ${i.displayTitle} (${i.id})${note}`;
    }).join('\n');
    
    const text = `${header}\n\n${scheduleText}\n\n預計更新項目\n${itemsText}`;
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-2xl border border-indigo-100 shadow-sm mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-black text-indigo-900 flex items-center gap-2">
          <Rocket className="text-indigo-600" />
          🚀 即將到來的更新 (Next Release)
        </h2>
        <div className="flex items-center gap-3">
          {onAutoAddReleaseItems && eligibleItemsNotInRelease.length > 0 && (
            <button 
              onClick={onAutoAddReleaseItems} 
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm animate-pulse"
            >
              <Sparkles size={16} />
              一鍵排入開發中項目 ({eligibleItemsNotInRelease.length})
            </button>
          )}
          <button 
            onClick={handleCopy} 
            className="flex items-center gap-2 bg-white hover:bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-sm font-bold border border-indigo-200 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={releaseItems.length === 0}
          >
            {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
            {copied ? '已複製！' : '複製更新公告'}
          </button>
        </div>
      </div>

      {releaseItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-2">
            <label className="text-xs font-bold text-indigo-800 uppercase tracking-wider">更新排程 (自動儲存)</label>
            <textarea
              className="w-full p-3 rounded-xl border border-indigo-200 bg-white/80 focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm text-indigo-900 h-[150px]"
              value={scheduleText}
              onChange={(e) => setScheduleText(e.target.value)}
              placeholder="輸入排程資訊..."
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-bold text-indigo-800 uppercase tracking-wider">
              預計更新項目 ({releaseItems.length})
            </label>
            <div className="bg-white/80 rounded-xl border border-indigo-200 p-2 h-[150px] overflow-y-auto custom-scrollbar space-y-1">
              {releaseItems.map(item => (
                <div 
                  key={item.id} 
                  className="flex items-start justify-between p-3 hover:bg-white rounded-lg group transition-colors cursor-pointer border border-transparent hover:border-indigo-100"
                  onClick={() => onItemClick(item)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-bold text-indigo-400 mt-0.5 w-12 shrink-0">{item.id}</span>
                    <div>
                      <p className="text-sm font-bold text-gray-800 line-clamp-1">{item.displayTitle}</p>
                      {item.releaseNote && (
                        <p className="text-xs text-orange-600 font-medium mt-1">
                          <span className="bg-orange-100 px-1.5 py-0.5 rounded mr-1">備註</span>
                          {item.releaseNote}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      onRemoveFromRelease(item); 
                    }}
                    className="text-gray-400 hover:text-red-500 p-1 shrink-0"
                    title="移出發布清單"
                    aria-label="移出發布清單"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-indigo-400 font-medium">
          目前沒有排入下次發布的項目。
        </div>
      )}
    </div>
  );
};
