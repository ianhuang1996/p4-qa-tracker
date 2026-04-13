// ═══════════════════════════════════════════════════════════
// 🎨 統一色彩系統 — Single Source of Truth
// ═══════════════════════════════════════════════════════════

/** 語意色：hex（圖表用）+ Tailwind class（UI 用） */
export const SEMANTIC = {
  danger:  { hex: '#ef4444', tw: 'red-500' },     // P0, 退回重修, 高優先
  warning: { hex: '#f97316', tw: 'orange-500' },   // P1, 待處理
  caution: { hex: '#f59e0b', tw: 'amber-500' },    // P2, 趨勢
  success: { hex: '#22c55e', tw: 'green-500' },    // P3, 已修復, 完成
  info:    { hex: '#3b82f6', tw: 'blue-500' },     // 開發中, 主色
  teal:    { hex: '#14b8a6', tw: 'teal-500' },     // 已修正待測試
  neutral: { hex: '#9ca3af', tw: 'gray-400' },     // 已關閉, Unassigned
} as const;

/** 團隊成員固定色 — avatar + 圖表共用 */
export const MEMBER_COLORS: Record<string, { hex: string; bg: string }> = {
  'Ian':        { hex: '#3b82f6', bg: 'bg-blue-500' },
  'Sienna':     { hex: '#ec4899', bg: 'bg-pink-500' },
  'Neo':        { hex: '#10b981', bg: 'bg-emerald-500' },
  'Summer':     { hex: '#f59e0b', bg: 'bg-amber-500' },
  '后玲':       { hex: '#8b5cf6', bg: 'bg-violet-500' },
  'Popo':       { hex: '#06b6d4', bg: 'bg-cyan-500' },
  'Unassigned': { hex: '#9ca3af', bg: 'bg-gray-400' },
};

/** 模組固定色 — 圓餅圖 + 標籤共用 */
export const MODULE_COLORS: Record<string, { hex: string; bg: string }> = {
  'Presenter':  { hex: '#3b82f6', bg: 'bg-blue-500' },
  'Promoter':   { hex: '#10b981', bg: 'bg-emerald-500' },
  '企業組織':    { hex: '#f97316', bg: 'bg-orange-500' },
  '雙模式':      { hex: '#f59e0b', bg: 'bg-amber-500' },
  '全域設定':    { hex: '#8b5cf6', bg: 'bg-violet-500' },
  '後台':        { hex: '#06b6d4', bg: 'bg-cyan-500' },
  '其他':        { hex: '#f43f5e', bg: 'bg-rose-500' },
};

/** 圖表用 hex 陣列（從 MODULE_COLORS 導出，保證順序一致） */
export const MODULES = ['Presenter', 'Promoter', '企業組織', '雙模式', '全域設定', '後台', '其他'];
export const CHART_COLORS = MODULES.map(m => MODULE_COLORS[m].hex);

/** 版更狀態色 */
export const RELEASE_STATUS_COLORS: Record<string, string> = {
  planning:  'bg-blue-100 text-blue-700 border-blue-200',
  uat:       'bg-orange-100 text-orange-700 border-orange-200',
  released:  'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
};

/** 版更狀態中文標籤 */
export const RELEASE_STATUS_LABEL: Record<string, string> = {
  planning:  '規劃中',
  uat:       'UAT 測試',
  released:  '已發布',
  cancelled: '已取消',
};

/** 成就階級色（inline style 用） */
export const ACHIEVEMENT_TIER_STYLES: Record<number, React.CSSProperties> = {
  1: { background: 'linear-gradient(135deg, #b45309, #92400e)' },  // Bronze
  2: { background: 'linear-gradient(135deg, #9ca3af, #6b7280)' },  // Silver
  3: { background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' },  // Gold
};
import React from 'react';

// ═══════════════════════════════════════════════════════════
// 🧩 UI Design Tokens — Single Source of Truth for repeated patterns
// ═══════════════════════════════════════════════════════════

/** 按鈕樣式 tokens */
export const BTN = {
  create:     'flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-md text-sm font-bold',
  primary:    'flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-blue-200',
  secondary:  'flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-3 py-2.5 rounded-xl transition-all border border-gray-200 shadow-sm text-sm font-bold',
  danger:     'flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-red-200',
  ghost:      'text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors px-3 py-2',
  icon:       'p-1.5 rounded-lg transition-colors text-gray-400 hover:text-blue-600 hover:bg-blue-50',
  iconDanger: 'p-1.5 rounded-lg transition-colors text-gray-400 hover:text-red-500 hover:bg-red-50',
} as const;

/** 篩選 pill tokens（狀態、優先級、負責人、模組等） */
export const FILTER_PILL = {
  base:     'px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors',
  active:   'bg-blue-600 text-white border-blue-600',
  inactive: 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300',
} as const;

/** 已套用篩選標籤 token */
export const ACTIVE_TAG = 'inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg border border-blue-200' as const;

// ═══════════════════════════════════════════════════════════
// 🏷️ 業務常數
// ═══════════════════════════════════════════════════════════

export const PRIORITY_COLORS: Record<string, string> = {
  'P0': 'bg-red-500 text-white border-red-600',
  'P1': 'bg-orange-100 text-orange-800 border-orange-200',
  'P2': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'P3': 'bg-green-100 text-green-800 border-green-200',
};

/** QA 狀態具名常數 — 避免 magic strings */
export const STATUS = {
  pending:     '待處理',
  inProgress:  '開發中',
  readyToTest: '已修正待測試',
  fixed:       '已修復',
  returned:    '退回重修',
  closed:      '已關閉',
} as const;

export type StatusValue = typeof STATUS[keyof typeof STATUS];

export const QA_FLOWS: StatusValue[] = [STATUS.pending, STATUS.inProgress, STATUS.readyToTest, STATUS.fixed, STATUS.returned, STATUS.closed];
export const PMS = ['Ian', 'Sienna'];
export const RDS = ['Neo', 'Summer', '后玲', 'Popo', 'Unassigned'];

export const ADMIN_EMAILS: string[] = [
  'ian@osensetech.com',
  'sienna@osensetech.com',
];

export const SORT_EDITOR_EMAILS: string[] = [
  'ian@osensetech.com',
  'sienna@osensetech.com',
];

export const PRIORITY_ORDER: Record<string, number> = {
  'P0': 0,
  'P1': 1,
  'P2': 2,
  'P3': 3,
  '-': 4,
};

export const STATUS_COLORS: Record<string, string> = {
  [STATUS.closed]:      'bg-gray-100 text-gray-600 border-gray-200',
  [STATUS.fixed]:       'bg-green-100 text-green-700 border-green-200',
  [STATUS.readyToTest]: 'bg-teal-100 text-teal-700 border-teal-200',
  [STATUS.returned]:    'bg-red-500 text-white border-red-600',
  [STATUS.inProgress]:  'bg-blue-100 text-blue-700 border-blue-200',
  [STATUS.pending]:     'bg-slate-100 text-slate-700 border-slate-200',
};

// ===== Gamification =====

// 2026 台灣國定假日 (MM-DD format)
export const HOLIDAYS_2026: string[] = [
  '01-01', // 元旦
  '01-26', '01-27', '01-28', '01-29', '01-30', // 農曆春節 (除夕~初四)
  '02-02', // 補假
  '02-23', // 228 補假
  '02-27', // 228 補假
  '02-28', // 和平紀念日
  '04-03', // 清明節前
  '04-04', // 兒童節
  '04-05', // 清明節
  '04-06', // 補假
  '05-01', // 勞動節
  '05-31', // 端午節
  '06-01', // 補假
  '10-05', // 中秋節
  '10-06', // 補假
  '10-10', // 國慶日
  '10-25', // 光復節（觀察）
];

import { AchievementDef, TeamGoalDef } from './types';

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // Bug Hunter
  { id: 'bug_10', name: '初心者', description: '修復 10 個 bug', icon: '🐛', category: 'bugfix', tier: 1, condition: { metric: 'bugs_fixed', threshold: 10 } },
  { id: 'bug_50', name: '獵人', description: '修復 50 個 bug', icon: '🔫', category: 'bugfix', tier: 2, condition: { metric: 'bugs_fixed', threshold: 50 } },
  { id: 'bug_100', name: '傳說', description: '修復 100 個 bug', icon: '🏆', category: 'bugfix', tier: 3, condition: { metric: 'bugs_fixed', threshold: 100 } },
  // 消防員
  { id: 'p0_5', name: '滅火器', description: '修復 5 個 P0', icon: '🧯', category: 'bugfix', tier: 1, condition: { metric: 'p0_fixed', threshold: 5 } },
  { id: 'p0p1_20', name: '消防隊長', description: '修復 20 個 P0/P1', icon: '🚒', category: 'bugfix', tier: 2, condition: { metric: 'p0p1_fixed', threshold: 20 } },
  // 速度
  { id: 'fast_p0', name: '閃電俠', description: '24hr 內修復 P0', icon: '⚡', category: 'speed', tier: 2, condition: { metric: 'fast_p0_fix', threshold: 1 } },
  { id: 'daily_3fix', name: '光速', description: '單日修復 3+ 個 bug', icon: '💨', category: 'speed', tier: 1, condition: { metric: 'max_daily_fixes', threshold: 3 } },
  // 持續力
  { id: 'streak_7', name: '打卡王', description: '連續 7 個工作日交日報', icon: '📅', category: 'consistency', tier: 1, condition: { metric: 'report_streak', threshold: 7 } },
  { id: 'streak_30', name: '鐵人', description: '連續 30 個工作日交日報', icon: '🦾', category: 'consistency', tier: 3, condition: { metric: 'report_streak', threshold: 30 } },
  // Todo
  { id: 'todo_5day', name: '效率達人', description: '單日完成 5+ 個待辦', icon: '✅', category: 'todo', tier: 1, condition: { metric: 'max_daily_todos', threshold: 5 } },
  { id: 'todo_clear_7', name: '全勤', description: '連續 7 個工作日清空待辦', icon: '🎯', category: 'todo', tier: 2, condition: { metric: 'todo_clear_streak', threshold: 7 } },
  // 知識
  { id: 'wiki_5', name: '寫手', description: '建立 5 篇 Wiki', icon: '📝', category: 'wiki', tier: 1, condition: { metric: 'wiki_created', threshold: 5 } },
  { id: 'wiki_20', name: '百科全書', description: '建立 20 篇 Wiki', icon: '📚', category: 'wiki', tier: 3, condition: { metric: 'wiki_created', threshold: 20 } },
  // 溝通
  { id: 'comment_50', name: '話題王', description: '留言 50 則', icon: '💬', category: 'communication', tier: 1, condition: { metric: 'comments_made', threshold: 50 } },
  { id: 'comment_200', name: '導師', description: '留言 200 則', icon: '🎓', category: 'communication', tier: 3, condition: { metric: 'comments_made', threshold: 200 } },
  // 版更
  { id: 'release_5', name: '出貨達人', description: '參與 5 次版更', icon: '📦', category: 'release', tier: 1, condition: { metric: 'releases_participated', threshold: 5 } },
  { id: 'release_10', name: '里程碑', description: '參與 10 次版更', icon: '🏅', category: 'release', tier: 2, condition: { metric: 'releases_participated', threshold: 10 } },
  // QA (PM)
  { id: 'bugs_filed_20', name: '鷹眼', description: '提交 20 個 bug', icon: '🦅', category: 'qa', tier: 1, condition: { metric: 'bugs_filed', threshold: 20 } },
  { id: 'bugs_filed_50', name: '品質守門員', description: '提交 50 個 bug', icon: '🛡️', category: 'qa', tier: 2, condition: { metric: 'bugs_filed', threshold: 50 } },
  { id: 'retest_10', name: '嚴格把關', description: '複測 10 次', icon: '🔍', category: 'qa', tier: 1, condition: { metric: 'retest_count', threshold: 10 } },
  { id: 'retest_fail_5', name: '零容忍', description: '退回重修 5 次', icon: '🚫', category: 'qa', tier: 2, condition: { metric: 'retest_failed', threshold: 5 } },
  { id: 'release_pub_3', name: '出貨指揮官', description: '發布 3 個版本', icon: '🚀', category: 'qa', tier: 1, condition: { metric: 'releases_published', threshold: 3 } },
  { id: 'release_pub_10', name: '發行大師', description: '發布 10 個版本', icon: '🎖️', category: 'qa', tier: 3, condition: { metric: 'releases_published', threshold: 10 } },
  { id: 'todos_assigned_50', name: '任務分配王', description: '幫團隊建立 50 個 todo', icon: '📋', category: 'qa', tier: 1, condition: { metric: 'todos_created_for_others', threshold: 50 } },
  { id: 'todos_assigned_100', name: '團隊教練', description: '幫團隊建立 100 個 todo', icon: '🏅', category: 'qa', tier: 2, condition: { metric: 'todos_created_for_others', threshold: 100 } },
  // 特殊 / 隱藏
  { id: 'first_bug', name: '先驅者', description: '提交系統第一個 bug', icon: '🌟', category: 'special', tier: 2, condition: { metric: 'is_first_bug_author', threshold: 1 } },
  { id: 'all_categories', name: '全能王', description: '解鎖所有類別各一個成就', icon: '👑', category: 'special', tier: 3, condition: { metric: 'categories_unlocked', threshold: 7 } },
  { id: 'self_fix', name: '自產自銷', description: '自己提的 bug 自己修', icon: '🔄', category: 'special', tier: 1, condition: { metric: 'self_filed_and_fixed', threshold: 1 } },
  { id: 'phoenix', name: '不死鳥', description: '同一個 bug 被退回 3 次後終於修好', icon: '🐦‍🔥', category: 'special', tier: 2, condition: { metric: 'phoenix_fix', threshold: 1 } },
  { id: 'all_modules', name: '全模組制霸', description: '修過所有 7 個模組的 bug', icon: '🗺️', category: 'special', tier: 3, condition: { metric: 'modules_fixed', threshold: 7 } },
  { id: 'night_owl', name: '深夜戰士', description: '晚上 10 點後更新 QA item', icon: '🌙', category: 'special', tier: 1, condition: { metric: 'late_night_updates', threshold: 1 } },
  { id: 'day_100', name: '百日紀念', description: '系統使用滿 100 天', icon: '💯', category: 'special', tier: 2, condition: { metric: 'days_since_first_action', threshold: 100 } },
];

export const FEATURE_FLAGS = {
  AI_FEATURES: !!import.meta.env.VITE_GEMINI_API_KEY,
} as const;

export const TEAM_GOAL_DEFS: TeamGoalDef[] = [
  { id: 'zero_p0', name: '零 P0 達成', icon: '🛡️', description: '版更時 0 個 P0 遺留', type: 'release' },
  { id: 'release_on_time', name: '版更準時', icon: '⏰', description: '在排定日期前完成所有 checklist', type: 'release' },
  { id: 'bug_clear', name: 'Bug 清零', icon: '🧹', description: '本版所有關聯 QA items 全部關閉', type: 'release' },
];

