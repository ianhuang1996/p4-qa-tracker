import React, { useState, useMemo } from 'react';
import { ArrowRight, Calendar, Package, Clock, AlertTriangle } from 'lucide-react';
import { Release, AugmentedQAItem } from '../types';
import { RESOLVED_FLOWS, isActiveRelease } from '../constants';

function getDaysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getCountdownDisplay(days: number): { text: string; color: string; urgent: boolean } {
  if (days < 0) return { text: `已逾期 ${Math.abs(days)} 天`, color: 'bg-red-500 text-white', urgent: true };
  if (days === 0) return { text: '今天到期！', color: 'bg-red-500 text-white', urgent: true };
  if (days <= 3) return { text: `剩 ${days} 天！`, color: 'bg-red-100 text-red-700 border border-red-200', urgent: true };
  if (days <= 7) return { text: `剩 ${days} 天`, color: 'bg-orange-100 text-orange-700 border border-orange-200', urgent: false };
  return { text: `還有 ${days} 天`, color: 'bg-green-100 text-green-700 border border-green-200', urgent: false };
}

const STATUS_LABEL: Record<string, string> = {
  planning: '規劃中',
  uat: 'UAT',
  released: '已發布',
  cancelled: '已取消',
};

interface Props {
  releases: Release[];
  allItems: AugmentedQAItem[];
  onNavigateToRelease: () => void;
}

export const NextReleaseBlock: React.FC<Props> = ({ releases, allItems, onNavigateToRelease }) => {
  // Sort by scheduledDate ascending (nearest deadline first, newer plans to the right)
  const unreleased = useMemo(() =>
    releases
      .filter(r => isActiveRelease(r.status))
      .sort((a, b) => (a.scheduledDate || '').localeCompare(b.scheduledDate || '')),
  [releases]);

  // Default to the nearest deadline (index 0 after sort)
  const [selectedIdx, setSelectedIdx] = useState(0);

  if (unreleased.length === 0) return null;

  const current = unreleased[Math.min(selectedIdx, unreleased.length - 1)];
  const linkedItems = allItems.filter(i => current.linkedItemIds.includes(i.id));
  const fixedCount = linkedItems.filter(i => RESOLVED_FLOWS.has(i.currentFlow)).length;
  const totalItems = linkedItems.length;
  const blockingItems = linkedItems
    .filter(i => (i.priority === 'P0' || i.priority === 'P1') && !RESOLVED_FLOWS.has(i.currentFlow))
    .slice(0, 2);
  const fixPct = totalItems > 0 ? Math.round((fixedCount / totalItems) * 100) : 0;
  const checklistDone = current.checklist.filter(c => c.checked).length;
  const checklistTotal = current.checklist.length;

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
      {/* Tabs — only show if multiple */}
      {unreleased.length > 1 && (
        <div className="flex items-center gap-1 px-4 pt-3">
          {unreleased.map((r, idx) => (
            <button
              key={r.id}
              onClick={() => setSelectedIdx(idx)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                idx === selectedIdx
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white/60 text-indigo-500 hover:bg-white border border-indigo-100'
              }`}
            >
              {r.version} <span className="opacity-60">{STATUS_LABEL[r.status]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Compact info row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0">
            <Package size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-black text-indigo-900">{current.version}</span>
              {unreleased.length === 1 && (
                <span className="text-[10px] font-bold bg-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded">
                  {STATUS_LABEL[current.status]}
                </span>
              )}
              <span className="text-[10px] text-indigo-500 flex items-center gap-1">
                <Calendar size={10} /> {current.scheduledDate}
              </span>
              {current.scheduledDate && (() => {
                const days = getDaysUntil(current.scheduledDate);
                const { text, color, urgent } = getCountdownDisplay(days);
                return (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${color} ${urgent ? 'animate-pulse' : ''} flex items-center gap-1`}>
                    <Clock size={9} /> {text}
                  </span>
                );
              })()}
            </div>
            {/* Progress summary */}
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] text-indigo-500 shrink-0">修復</span>
                <div className="w-24 sm:w-32 bg-indigo-100 rounded-full h-1.5">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${fixPct === 100 ? 'bg-green-500' : 'bg-indigo-600'}`}
                    style={{ width: `${fixPct}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-indigo-600 shrink-0">{fixedCount}/{totalItems}</span>
              </div>
              <span className="text-[10px] text-indigo-400">
                檢查表 {checklistDone}/{checklistTotal}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onNavigateToRelease}
          className="flex items-center gap-1.5 bg-white hover:bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-indigo-200 transition-colors shadow-sm shrink-0"
        >
          前往版更管理 <ArrowRight size={12} />
        </button>
      </div>

      {/* Blocking items */}
      {blockingItems.length > 0 && (
        <div className="px-4 pb-4 space-y-1.5">
          {blockingItems.map(item => (
            <div key={item.id} className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
              <AlertTriangle size={12} className="text-red-500 shrink-0" />
              <span className="text-[10px] font-bold text-red-600 shrink-0">{item.priority}</span>
              <span className="text-[11px] text-red-700 truncate flex-1">{item.title || item.description?.substring(0, 60) || item.id}</span>
              <span className="text-[10px] text-red-400 shrink-0">{item.assignee}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
