import { RoadmapTrack, RoadmapStatus } from '../types';

export const ROADMAP_TRACKS: { id: RoadmapTrack; label: string; emoji: string }[] = [
  { id: 'feature',  label: '新功能',   emoji: '✨' },
  { id: 'bug_fix',  label: 'Bug 修正', emoji: '🐛' },
  { id: 'backend',  label: '後台開發', emoji: '⚙️' },
];

export const ROADMAP_BOARD_STATUSES: { id: RoadmapStatus; label: string; desc: string }[] = [
  { id: 'now',   label: 'Now',   desc: '正在進行中' },
  { id: 'next',  label: 'Next',  desc: '即將開始' },
  { id: 'later', label: 'Later', desc: '未來計畫' },
];

export const ROADMAP_TRACK_STYLES: Record<RoadmapTrack, { bg: string; text: string; border: string; dot: string; header: string }> = {
  bug_fix:  { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-400',    header: 'bg-red-100 text-red-800' },
  feature:  { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-400',   header: 'bg-blue-100 text-blue-800' },
  backend:  { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-400', header: 'bg-purple-100 text-purple-800' },
};

export const ROADMAP_STATUS_HEADER: Record<RoadmapStatus, string> = {
  now:       'bg-emerald-500 text-white',
  next:      'bg-blue-500 text-white',
  later:     'bg-slate-400 text-white',
  completed: 'bg-green-600 text-white',
  cancelled: 'bg-gray-300 text-gray-600',
};

export const ROADMAP_PRIORITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  high:   { bg: 'bg-red-100',   text: 'text-red-700',   label: '高' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-700', label: '中' },
  low:    { bg: 'bg-green-100', text: 'text-green-700', label: '低' },
};

const MONTH_LABELS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

/** Generate 6 upcoming months starting from the current month, in 'YYYY-MM' format */
export function getUpcomingMonths(): string[] {
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth(); // 0-based
  const result: string[] = [];
  for (let i = 0; i < 6; i++) {
    result.push(`${y}-${String(m + 1).padStart(2, '0')}`);
    m++;
    if (m > 11) { m = 0; y++; }
  }
  return result;
}

/** Display a 'YYYY-MM' string as '4月' (same year) or '2027/1月' (different year) */
export function formatMonth(yyyymm: string): string {
  const [y, mStr] = yyyymm.split('-');
  const monthIdx = parseInt(mStr, 10) - 1;
  const label = MONTH_LABELS[monthIdx] ?? mStr;
  const thisYear = new Date().getFullYear();
  return parseInt(y) === thisYear ? label : `${y}/${label}`;
}
