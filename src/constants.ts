export const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const SEVERITY_COLORS = {
  '嚴重': '#ef4444',
  '一般': '#3b82f6',
};

export const PRIORITY_COLORS: Record<string, string> = {
  'P0': 'bg-red-500 text-white border-red-600',
  'P1': 'bg-orange-100 text-orange-800 border-orange-200',
  'P2': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'P3': 'bg-green-100 text-green-800 border-green-200',
};

export const QA_FLOWS = ['待處理', '開發中', '已修正待測試', '已修復', '退回重修', '已關閉'];
export const PMS = ['Ian', 'Sienna'];
export const RDS = ['Neo', 'Summer', '后玲', 'Popo', 'Unassigned'];
export const MODULES = ['Presenter', 'Promoter', '企業組織', '雙模式', '全域設定', '後台', '其他'];

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
  '已關閉': 'bg-gray-100 text-gray-600 border-gray-200',
  '已修復': 'bg-green-100 text-green-700 border-green-200',
  '已修正待測試': 'bg-teal-100 text-teal-700 border-teal-200',
  '退回重修': 'bg-red-500 text-white border-red-600',
  '開發中': 'bg-blue-100 text-blue-700 border-blue-200',
  '待處理': 'bg-slate-100 text-slate-700 border-slate-200',
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
  // 特殊
  { id: 'first_bug', name: '先驅者', description: '提交系統第一個 bug', icon: '🌟', category: 'special', tier: 2, condition: { metric: 'is_first_bug_author', threshold: 1 } },
  { id: 'all_categories', name: '全能王', description: '解鎖所有類別各一個成就', icon: '👑', category: 'special', tier: 3, condition: { metric: 'categories_unlocked', threshold: 6 } },
];

export const TEAM_GOAL_DEFS: TeamGoalDef[] = [
  { id: 'zero_p0', name: '零 P0 達成', icon: '🛡️', description: '版更時 0 個 P0 遺留', type: 'release' },
  { id: 'release_on_time', name: '版更準時', icon: '⏰', description: '在排定日期前完成所有 checklist', type: 'release' },
  { id: 'bug_clear', name: 'Bug 清零', icon: '🧹', description: '本版所有關聯 QA items 全部關閉', type: 'release' },
];

export const ACHIEVEMENT_TIER_COLORS: Record<number, string> = {
  1: 'from-amber-600 to-amber-800',    // Bronze
  2: 'from-gray-300 to-gray-500',       // Silver
  3: 'from-yellow-300 to-yellow-500',    // Gold
};
