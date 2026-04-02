import React from 'react';
import { History } from 'lucide-react';
import { HistoryEntry } from '../../types';
import { formatTimestamp } from '../../utils/qaUtils';

interface ModalHistoryProps {
  history: HistoryEntry[];
}

export const ModalHistory: React.FC<ModalHistoryProps> = ({ history }) => {
  return (
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
                <span className="text-[10px] text-gray-400">{formatTimestamp(entry.timestamp)}</span>
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
  );
};
