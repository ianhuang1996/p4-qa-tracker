import React from 'react';
import { ArrowRight, Check, Square, Calendar, Package } from 'lucide-react';
import { Release, AugmentedQAItem } from '../types';

interface Props {
  activeRelease: Release | null;
  linkedItems: AugmentedQAItem[];
  onNavigateToRelease: () => void;
}

export const NextReleaseBlock: React.FC<Props> = ({ activeRelease, linkedItems, onNavigateToRelease }) => {
  if (!activeRelease) return null;

  const checklistDone = activeRelease.checklist.filter(c => c.checked).length;
  const checklistTotal = activeRelease.checklist.length;
  const fixedCount = linkedItems.filter(i => i.currentFlow === '已修復' || i.currentFlow === '已關閉' || i.currentFlow === '已修正待測試').length;
  const totalItems = linkedItems.length;

  const STATUS_LABEL: Record<string, string> = {
    planning: '規劃中',
    uat: 'UAT 測試',
    released: '已發布',
    cancelled: '已取消',
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-5 sm:p-6 rounded-2xl border border-indigo-100 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0">
            <Package size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-indigo-900 flex items-center gap-2">
              {activeRelease.version}
              <span className="text-xs font-bold bg-indigo-200 text-indigo-700 px-2 py-0.5 rounded-lg">
                {STATUS_LABEL[activeRelease.status]}
              </span>
            </h2>
            <p className="text-xs text-indigo-600 flex items-center gap-1 mt-0.5">
              <Calendar size={12} />
              預計 {activeRelease.scheduledDate}
            </p>
          </div>
        </div>
        <button
          onClick={onNavigateToRelease}
          className="flex items-center gap-2 bg-white hover:bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-sm font-bold border border-indigo-200 transition-colors shadow-sm"
        >
          前往版更管理 <ArrowRight size={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Fix progress */}
        <div className="bg-white/80 rounded-xl border border-indigo-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-indigo-700">修復進度</span>
            <span className="text-xs font-bold text-indigo-500">{fixedCount}/{totalItems}</span>
          </div>
          <div className="w-full bg-indigo-100 rounded-full h-2 mb-3">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${totalItems > 0 ? (fixedCount / totalItems) * 100 : 0}%` }}
            />
          </div>
          <p className="text-[10px] text-indigo-400">
            {totalItems === 0 ? '尚未加入項目' :
             fixedCount === totalItems ? '所有項目已就緒！' :
             `還有 ${totalItems - fixedCount} 個項目待修復`}
          </p>
        </div>

        {/* Checklist progress */}
        <div className="bg-white/80 rounded-xl border border-indigo-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-indigo-700">發布檢查表</span>
            <span className="text-xs font-bold text-indigo-500">{checklistDone}/{checklistTotal}</span>
          </div>
          <div className="space-y-1.5">
            {activeRelease.checklist.map(item => (
              <div key={item.id} className="flex items-center gap-2 text-xs">
                {item.checked ?
                  <Check size={14} className="text-green-500 shrink-0" /> :
                  <Square size={14} className="text-indigo-300 shrink-0" />
                }
                <span className={item.checked ? 'text-indigo-400 line-through' : 'text-indigo-700'}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
