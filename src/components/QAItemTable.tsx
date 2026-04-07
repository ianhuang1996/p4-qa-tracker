import React from 'react';
import { Video, CheckCircle, XCircle, ArrowUp, ArrowDown, ArrowUpDown, MessageSquare, FileText, Rocket } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { AugmentedQAItem } from '../types';
import { PRIORITY_COLORS, STATUS_COLORS, RDS } from '../constants';
import { getDirectImageUrl, getAvatarColor } from '../utils/qaUtils';

interface QAItemTableProps {
  items: AugmentedQAItem[];
  onItemClick: (item: AugmentedQAItem) => void;
  onStatusChange: (item: AugmentedQAItem, newStatus: string) => void;
  onAssigneeChange: (item: AugmentedQAItem, newAssignee: string) => void;
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
  onSort: (key: string) => void;
}

export const QAItemTable: React.FC<QAItemTableProps> = ({ 
  items, onItemClick, onStatusChange, onAssigneeChange, selectedIds, setSelectedIds, sortConfig, onSort
}) => {
  const [openAssigneeId, setOpenAssigneeId] = React.useState<string | null>(null);

  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(i => i.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const renderSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-blue-600" /> : <ArrowDown size={12} className="text-blue-600" />;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <input 
                  type="checkbox" 
                  checked={items.length > 0 && selectedIds.length === items.length}
                  onChange={toggleSelectAll}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th 
                className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer group hover:text-blue-600 transition-colors"
                onClick={() => onSort('id')}
              >
                <div className="flex items-center gap-1">
                  編號 {renderSortIcon('id')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer group hover:text-blue-600 transition-colors"
                onClick={() => onSort('priority')}
              >
                <div className="flex items-center gap-1">
                  優先級 {renderSortIcon('priority')}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">模組</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">標題</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">負責人</th>
              <th 
                className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer group hover:text-blue-600 transition-colors"
                onClick={() => onSort('currentFlow')}
              >
                <div className="flex items-center gap-1">
                  狀態 {renderSortIcon('currentFlow')}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">附件</th>
              <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item) => (
              <tr 
                key={item.id} 
                className={`hover:bg-blue-50/30 transition-colors cursor-pointer group ${selectedIds.includes(item.id) ? 'bg-blue-50/50' : ''}`}
                onClick={() => onItemClick(item)}
              >
                <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-xs font-bold text-gray-400">{item.id}</td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {item.priority !== '-' && (
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${PRIORITY_COLORS[item.priority]}`}>
                      {item.priority}
                    </span>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded border border-gray-200 uppercase tracking-wider">
                    {item.module}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {item.displayTitle}
                    </div>
                    {item.isNextRelease && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold border border-indigo-100" title="排入下次發布">
                        <Rocket size={10} />
                        Next
                      </div>
                    )}
                    {item.commentCount && item.commentCount > 0 ? (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold border border-blue-100">
                        <MessageSquare size={10} />
                        {item.commentCount}
                      </div>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="relative">
                    <div 
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded-lg transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenAssigneeId(openAssigneeId === item.id ? null : item.id);
                      }}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold ${getAvatarColor(item.assignee)}`}>
                        {item.assignee.charAt(0)}
                      </div>
                      <span className="text-xs text-gray-600 font-medium">{item.assignee}</span>
                    </div>

                    {openAssigneeId === item.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={(e) => { e.stopPropagation(); setOpenAssigneeId(null); }} 
                        />
                        <div className="absolute left-0 mt-1 w-32 bg-white rounded-xl shadow-xl border border-gray-100 z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                          {RDS.map((rd) => (
                            <button
                              key={rd}
                              className={`w-full px-4 py-2 text-left text-xs hover:bg-blue-50 transition-colors flex items-center gap-2 ${
                                item.assignee === rd ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-600'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onAssigneeChange(item, rd);
                                setOpenAssigneeId(null);
                              }}
                            >
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white font-bold ${getAvatarColor(rd)}`}>
                                {rd.charAt(0)}
                              </div>
                              {rd}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${STATUS_COLORS[item.currentFlow || '待處理']}`}>
                    {item.currentFlow}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {(item.imageLink || (item.imageLinks && item.imageLinks.length > 0)) && (
                      <div className="w-8 h-8 rounded border border-gray-200 overflow-hidden bg-gray-50 flex-shrink-0">
                        <img src={getDirectImageUrl(item.imageLinks?.[0] || item.imageLink || '')} alt="img" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    )}
                    {(item.videoLink || (item.videoLinks && item.videoLinks.length > 0)) && <Video size={16} className="text-purple-400" />}
                    {(item.attachmentUrl || (item.attachments && item.attachments.length > 0)) && <FileText size={16} className="text-orange-400" />}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-1">
                    {(item.currentFlow === '開發中' || item.currentFlow === '退回重修') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onStatusChange(item, '已修正待測試'); }}
                        className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                        title="標記為已修正待測試"
                        aria-label="標記為已修正待測試"
                      >
                        <CheckCircle size={14} />
                      </button>
                    )}
                    {item.currentFlow === '已修正待測試' && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); onStatusChange(item, '已修復'); }}
                          className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                          title="測試通過"
                          aria-label="標記為已修復"
                        >
                          <CheckCircle size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onStatusChange(item, '退回重修'); }}
                          className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                          title="退回重修"
                          aria-label="退回重修"
                        >
                          <XCircle size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={9}>
                  <EmptyState title="找不到符合條件的項目" description="請嘗試調整篩選條件，或點擊右上角「新增問題」" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
