import { DecisionStatus, DecisionTag } from '../types';

export const DECISION_TAGS: { id: DecisionTag; label: string; emoji: string }[] = [
  { id: 'scope-change',    label: '範圍調整', emoji: '🎯' },
  { id: 'priority-change', label: '優先級變動', emoji: '⚡' },
  { id: 'direction-pivot', label: '方向轉變', emoji: '🧭' },
  { id: 'resource',        label: '資源調配', emoji: '👥' },
  { id: 'process',         label: '流程相關', emoji: '⚙️' },
  { id: 'other',           label: '其他',   emoji: '📌' },
];

export const DECISION_TAG_STYLES: Record<DecisionTag, { bg: string; text: string }> = {
  'scope-change':    { bg: 'bg-purple-50', text: 'text-purple-700' },
  'priority-change': { bg: 'bg-orange-50', text: 'text-orange-700' },
  'direction-pivot': { bg: 'bg-red-50',    text: 'text-red-700' },
  'resource':        { bg: 'bg-blue-50',   text: 'text-blue-700' },
  'process':         { bg: 'bg-gray-50',   text: 'text-gray-700' },
  'other':           { bg: 'bg-amber-50',  text: 'text-amber-700' },
};

export const DECISION_STATUS_STYLES: Record<DecisionStatus, { bg: string; text: string; label: string }> = {
  active:     { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '生效中' },
  superseded: { bg: 'bg-gray-100',    text: 'text-gray-500',    label: '已被取代' },
  reversed:   { bg: 'bg-red-100',     text: 'text-red-600',     label: '已推翻' },
};

/** 決策人候選 — 包含團隊成員 + 常見角色 */
export const DECISION_MAKERS = ['老闆', 'Ian', 'Sienna', 'Neo', 'Summer', '后玲', 'Popo', '團隊共識'];
