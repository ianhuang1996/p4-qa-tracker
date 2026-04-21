import React from 'react';
import { Pencil, Trash2, Calendar, ArrowRight, CheckCircle, Circle } from 'lucide-react';
import { RoadmapItem } from '../types';
import { ROADMAP_TRACK_STYLES, ROADMAP_PRIORITY_STYLES, formatMonth } from '../constants/roadmapConstants';
import { getAvatarColor } from '../utils/qaUtils';

interface RoadmapCardProps {
  item: RoadmapItem;
  canEdit: boolean;
  compact?: boolean;     // Timeline uses compact mode
  onEdit: (item: RoadmapItem) => void;
  onDelete: (id: string) => void;
  onNavigateToRelease?: () => void;
  onNavigateToQAItem?: (qaId: string) => void;
  linkedQAItems?: { id: string; title?: string; description: string; currentFlow: string }[];
}

export const RoadmapCard: React.FC<RoadmapCardProps> = ({
  item, canEdit, compact, onEdit, onDelete,
  onNavigateToRelease, onNavigateToQAItem, linkedQAItems = [],
}) => {
  // ── Compact card (Timeline view) ──────────────────────────────
  if (compact) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-2.5 space-y-1.5 transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between gap-1.5">
          <p className="text-xs font-bold text-gray-900 leading-snug flex-1 line-clamp-2">{item.title}</p>
          <div className="flex gap-0.5 shrink-0">
            {item.isDerived && onNavigateToRelease && (
              <button onClick={onNavigateToRelease} className="p-1 rounded text-gray-400 hover:text-teal-600 transition-colors" title="查看版更">
                <ArrowRight size={11} />
              </button>
            )}
            {!item.isDerived && canEdit && (
              <>
                <button onClick={() => onEdit(item)} className="p-1 rounded text-gray-400 hover:text-blue-600 transition-colors" aria-label="編輯">
                  <Pencil size={11} />
                </button>
                <button onClick={() => onDelete(item.id)} className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors" aria-label="刪除">
                  <Trash2 size={11} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* QA stats bar (derived only) */}
        {item.isDerived && item.qaStats && item.qaStats.total > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-teal-500 rounded-full" style={{ width: `${Math.round(item.qaStats.closed / item.qaStats.total * 100)}%` }} />
            </div>
            <span className="text-[9px] text-gray-400 shrink-0">{item.qaStats.closed}/{item.qaStats.total}</span>
          </div>
        )}

        {/* Priority badge + avatars on single line */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex gap-1">
            {item.priority && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${ROADMAP_PRIORITY_STYLES[item.priority].bg} ${ROADMAP_PRIORITY_STYLES[item.priority].text}`}>
                {ROADMAP_PRIORITY_STYLES[item.priority].label}
              </span>
            )}
          </div>
          {item.assignees.length > 0 && (
            <div className="flex -space-x-1">
              {item.assignees.slice(0, 4).map(name => (
                <div
                  key={name}
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white font-bold ring-1 ring-white ${getAvatarColor(name)}`}
                  title={name}
                >
                  {name.charAt(0)}
                </div>
              ))}
              {item.assignees.length > 4 && (
                <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[8px] text-gray-500 font-bold ring-1 ring-white">
                  +{item.assignees.length - 4}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Full card (Board view) ────────────────────────────────────
  return (
    <div className="bg-white rounded-xl border shadow-sm p-3.5 space-y-2.5 transition-shadow hover:shadow-md">
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-gray-900 leading-snug flex-1">{item.title}</p>
        <div className="flex gap-1 shrink-0">
          {item.isDerived && onNavigateToRelease && (
            <button onClick={onNavigateToRelease} className="p-2 rounded-md text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors" title="查看版更詳情">
              <ArrowRight size={13} />
            </button>
          )}
          {!item.isDerived && canEdit && (
            <>
              <button onClick={() => onEdit(item)} className="p-2 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" aria-label="編輯">
                <Pencil size={13} />
              </button>
              <button onClick={() => onDelete(item.id)} className="p-2 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" aria-label="刪除">
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      {item.description && (
        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{item.description}</p>
      )}

      {/* Derived: QA stats bar */}
      {item.isDerived && item.qaStats && item.qaStats.total > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-gray-500">
            <span>QA items</span>
            <span className="font-bold">{item.qaStats.closed}/{item.qaStats.total} 完成</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${Math.round(item.qaStats.closed / item.qaStats.total * 100)}%` }} />
          </div>
        </div>
      )}

      {/* Backend: linked QA items */}
      {item.track === 'backend' && linkedQAItems.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">關聯 QA Items</p>
          <div className="space-y-1">
            {linkedQAItems.slice(0, 3).map(qa => {
              const done = qa.currentFlow === '已修復' || qa.currentFlow === '已關閉';
              return (
                <button
                  key={qa.id}
                  onClick={() => onNavigateToQAItem?.(qa.id)}
                  className="w-full flex items-center gap-1.5 text-left text-[11px] text-gray-600 hover:text-blue-600 transition-colors group"
                >
                  {done ? <CheckCircle size={11} className="text-green-500 shrink-0" /> : <Circle size={11} className="text-gray-300 shrink-0" />}
                  <span className="truncate group-hover:underline">{qa.id} {qa.title || qa.description.substring(0, 30)}</span>
                </button>
              );
            })}
            {linkedQAItems.length > 3 && (
              <p className="text-[10px] text-gray-400 pl-4">+{linkedQAItems.length - 3} 個項目</p>
            )}
          </div>
        </div>
      )}

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        {item.priority && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROADMAP_PRIORITY_STYLES[item.priority].bg} ${ROADMAP_PRIORITY_STYLES[item.priority].text}`}>
            {ROADMAP_PRIORITY_STYLES[item.priority].label}優先
          </span>
        )}
        {item.targetMonth && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
            <Calendar size={9} />
            {formatMonth(item.targetMonth)}
          </span>
        )}
      </div>

      {/* Assignees */}
      {item.assignees.length > 0 && (
        <div className="flex items-center gap-1 pt-0.5">
          {item.assignees.map(name => (
            <div key={name} className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] text-white font-bold shrink-0 ${getAvatarColor(name)}`} title={name}>
              {name.charAt(0)}
            </div>
          ))}
          <span className="text-[10px] text-gray-400 ml-1">{item.assignees.join(', ')}</span>
        </div>
      )}
    </div>
  );
};
