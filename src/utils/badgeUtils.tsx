import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { AugmentedQAItem } from '../types';
import { STATUS } from '../constants';

const CLOSED_STATUSES: string[] = [STATUS.fixed, STATUS.closed, STATUS.readyToTest];

export function getOverdueBadge(item: AugmentedQAItem): React.ReactElement | null {
  if (CLOSED_STATUSES.includes(item.currentFlow)) return null;
  if (!item.date) return null;
  const created = new Date(item.date + 'T00:00:00').getTime();
  const days = Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24));
  if (days > 14)
    return (
      <span
        className="flex items-center gap-0.5 px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[9px] font-bold border border-red-200 shrink-0"
        title={`建立已 ${days} 天`}
      >
        <AlertTriangle size={9} />{days}天
      </span>
    );
  if (days > 7)
    return (
      <span
        className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded text-[9px] font-bold border border-amber-200 shrink-0"
        title={`建立已 ${days} 天`}
      >
        <AlertTriangle size={9} />{days}天
      </span>
    );
  return null;
}
