import { toDateStr } from './qaUtils';

export interface WeekBoundary {
  start: string; // YYYY-MM-DD (Monday)
  end: string;   // YYYY-MM-DD (Sunday)
  label: string; // e.g. "3/31 ~ 4/6"
}

export interface WeeklyStats {
  addedCount: number;
  fixedCount: number;
  closedCount: number;
  remainingCount: number;
  fixRate: number; // percentage
}

export interface RDWorkload {
  name: string;
  assigned: number;
  fixed: number;
  inProgress: number;
}

export interface TrendPoint {
  week: string;
  added: number;
  fixed: number;
  remaining: number;
}

export function getWeekBoundaries(weekOffset: number = 0): WeekBoundary {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon + weekOffset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: toDateStr(monday),
    end: toDateStr(sunday),
    label: `${monday.getMonth() + 1}/${monday.getDate()} ~ ${sunday.getMonth() + 1}/${sunday.getDate()}`,
  };
}

interface ItemLike {
  date: string;
  currentFlow: string;
  fixedAt?: number;
  assignee: string;
  priority?: string;
}

export function computeWeeklyStats<T extends ItemLike>(items: T[], start: string, end: string): WeeklyStats {
  const added = items.filter(i => i.date >= start && i.date <= end);
  const fixed = items.filter(i => {
    if (!i.fixedAt) return false;
    const fixDate = toDateStr(new Date(i.fixedAt));
    return fixDate >= start && fixDate <= end;
  });
  const closed = items.filter(i => {
    return (i.currentFlow === '已關閉' || i.currentFlow === '已修復') && i.fixedAt &&
      toDateStr(new Date(i.fixedAt)) >= start && toDateStr(new Date(i.fixedAt)) <= end;
  });
  const remaining = items.filter(i => i.currentFlow !== '已關閉' && i.currentFlow !== '已修復');

  const addedCount = added.length;
  const fixedCount = fixed.length;

  return {
    addedCount,
    fixedCount,
    closedCount: closed.length,
    remainingCount: remaining.length,
    fixRate: addedCount > 0 ? Math.round((fixedCount / addedCount) * 100) : 0,
  };
}

export function computeRDWorkload<T extends ItemLike>(items: T[]): RDWorkload[] {
  const active = items.filter(i => i.currentFlow !== '已關閉' && i.currentFlow !== '已修復');
  const map: Record<string, RDWorkload> = {};

  active.forEach(item => {
    const name = item.assignee || 'Unassigned';
    if (!map[name]) map[name] = { name, assigned: 0, fixed: 0, inProgress: 0 };
    map[name].assigned++;
    if (item.currentFlow === '開發中') map[name].inProgress++;
  });

  // Count fixed items per RD (all time)
  items.filter(i => i.currentFlow === '已修復' || i.currentFlow === '已關閉').forEach(item => {
    const name = item.assignee || 'Unassigned';
    if (!map[name]) map[name] = { name, assigned: 0, fixed: 0, inProgress: 0 };
    map[name].fixed++;
  });

  return Object.values(map).sort((a, b) => b.assigned - a.assigned);
}

export function computeTrendData<T extends ItemLike>(items: T[], weeks: number = 8): TrendPoint[] {
  const points: TrendPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const { start, end, label } = getWeekBoundaries(-i);
    const stats = computeWeeklyStats(items, start, end);
    points.push({
      week: label,
      added: stats.addedCount,
      fixed: stats.fixedCount,
      remaining: stats.remainingCount,
    });
  }
  return points;
}
