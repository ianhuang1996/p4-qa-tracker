import React from 'react';
import { CheckCircle, User, Tag, Trash2, X, Rocket } from 'lucide-react';
import { RDS, MODULES, QA_FLOWS } from '../constants';

interface BulkActionsProps {
  selectedIds: string[];
  onBulkUpdate: (data: Record<string, unknown>) => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
}

export const BulkActions: React.FC<BulkActionsProps> = ({
  selectedIds, onBulkUpdate, onBulkDelete, onClearSelection
}) => {
  if (selectedIds.length === 0) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 border border-gray-700 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 pr-6 border-r border-gray-700">
        <div className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
          {selectedIds.length}
        </div>
        <span className="text-sm font-bold">已選取</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-indigo-500/10 rounded-lg p-1 border border-indigo-500/20">
          <button
            onClick={() => onBulkUpdate({ isNextRelease: true })}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 text-white hover:bg-indigo-600 rounded-md transition-colors text-xs font-bold shadow-sm"
            title="排入下次發布"
          >
            <Rocket size={14} />
            排入發布
          </button>
          <button
            onClick={() => onBulkUpdate({ isNextRelease: false, releaseNote: '' })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-indigo-300 hover:bg-indigo-500/20 hover:text-indigo-200 rounded-md transition-colors text-xs font-bold"
            title="移出下次發布"
          >
            移出
          </button>
        </div>

        <div className="w-px h-6 bg-gray-700 mx-2"></div>

        <div className="flex items-center gap-2">
          <User size={16} className="text-gray-400" />
          <select 
            className="bg-gray-800 border-none text-xs rounded-lg focus:ring-0 cursor-pointer"
            onChange={(e) => onBulkUpdate({ assignee: e.target.value })}
            defaultValue=""
          >
            <option value="" disabled>變更負責人</option>
            {RDS.map(rd => <option key={rd} value={rd}>{rd}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Tag size={16} className="text-gray-400" />
          <select 
            className="bg-gray-800 border-none text-xs rounded-lg focus:ring-0 cursor-pointer"
            onChange={(e) => onBulkUpdate({ module: e.target.value })}
            defaultValue=""
          >
            <option value="" disabled>變更模組</option>
            {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <CheckCircle size={16} className="text-gray-400" />
          <select 
            className="bg-gray-800 border-none text-xs rounded-lg focus:ring-0 cursor-pointer"
            onChange={(e) => onBulkUpdate({ currentFlow: e.target.value })}
            defaultValue=""
          >
            <option value="" disabled>變更狀態</option>
            {QA_FLOWS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <button
          onClick={() => {
            if (confirm(`確定要刪除這 ${selectedIds.length} 個項目嗎？`)) {
              onBulkDelete();
            }
          }}
          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          title="批次刪除"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <button 
        onClick={onClearSelection}
        className="ml-4 p-1 hover:bg-gray-800 rounded-full transition-colors"
      >
        <X size={20} />
      </button>
    </div>
  );
};
