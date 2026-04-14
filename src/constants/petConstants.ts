import { PetDef, PetRarity, PetStage, CoinReason } from '../types';

// ─── Pet Definitions ────────────────────────────────────────────
export const PET_DEFS: Record<string, PetDef> = {
  // ── Common (普通蛋) ──────────────────────────────────────────
  bugsy:   { id: 'bugsy',   name: '偵錯蟲',   emoji: '🐛', rarity: 'common',    buff: 'encouragement',      buffDesc: '每天顯示一句隨機鼓勵語' },
  patches: { id: 'patches', name: 'Debug 貓', emoji: '🐱', rarity: 'common',    buff: 'item_highlight',     buffDesc: '自己負責的 items 顯示彩色左邊框' },
  clicky:  { id: 'clicky',  name: '測試鼠',   emoji: '🐹', rarity: 'common',    buff: 'retest_badge',       buffDesc: 'FilterBar 顯示「今日需複測」數量 badge' },
  sheldon: { id: 'sheldon', name: '穩健龜',   emoji: '🐢', rarity: 'common',    buff: 'streak_badge',       buffDesc: '日報連續天數顯示在頭像旁' },
  hoppy:   { id: 'hoppy',   name: '跳躍兔',   emoji: '🐰', rarity: 'common',    buff: 'todo_celebrate',     buffDesc: 'Todo 清零時觸發慶祝動畫' },
  leapy:   { id: 'leapy',   name: '跳板蛙',   emoji: '🐸', rarity: 'common',    buff: 'my_tasks_highlight', buffDesc: '「我的任務」按鈕高亮並顯示數量' },
  // ── Rare (稀有蛋) ────────────────────────────────────────────
  sherlock: { id: 'sherlock', name: '偵探犬',   emoji: '🔍', rarity: 'rare',    buff: 'overdue_alert',      buffDesc: 'Dashboard 標出 7 天未更新的 P0/P1' },
  zap:      { id: 'zap',     name: '閃電鼬',   emoji: '⚡', rarity: 'rare',    buff: 'item_pin',           buffDesc: '自己負責的 items 在清單中置頂' },
  squawk:   { id: 'squawk',  name: '廣播鸚鵡', emoji: '📣', rarity: 'rare',    buff: 'team_notify',        buffDesc: '每天可對 1 個 item 發全隊通知' },
  foxy:     { id: 'foxy',    name: '數據狐',   emoji: '🦊', rarity: 'rare',    buff: 'weekly_compare',     buffDesc: '個人卡片顯示本週 vs 上週修復數對比' },
  hoot:     { id: 'hoot',    name: '知識梟',   emoji: '🦉', rarity: 'rare',    buff: 'wiki_stale',         buffDesc: 'Wiki 頁顯示超過 30 天未更新的頁面提醒' },
  pingu:    { id: 'pingu',   name: '版更企鵝', emoji: '🐧', rarity: 'rare',    buff: 'release_countdown',  buffDesc: 'ReleasePage 顯示距 scheduledDate 倒數天數' },
  // ── Legendary (傳說蛋) ───────────────────────────────────────
  draco:  { id: 'draco',  name: '程式龍',   emoji: '🐉', rarity: 'legendary', buff: 'p0_banner',         buffDesc: 'P0 超過 3 天未處理時 Dashboard 顯示緊急 banner' },
  prism:  { id: 'prism',  name: '彩虹獸',   emoji: '🦄', rarity: 'legendary', buff: 'release_confetti',  buffDesc: '版更發布時觸發全頁 confetti 慶祝動畫' },
  blaze:  { id: 'blaze',  name: '不死鳳凰', emoji: '🔥', rarity: 'legendary', buff: 'phoenix_bonus',     buffDesc: '退回重修後修好時額外 +30 coins' },
};

// Pets grouped by rarity (for egg hatching pool)
export const PETS_BY_RARITY: Record<PetRarity, string[]> = {
  common:    ['bugsy', 'patches', 'clicky', 'sheldon', 'hoppy', 'leapy'],
  rare:      ['sherlock', 'zap', 'squawk', 'foxy', 'hoot', 'pingu'],
  legendary: ['draco', 'prism', 'blaze'],
};

// ─── Egg Definitions ────────────────────────────────────────────
export interface EggDef {
  rarity: PetRarity;
  name: string;
  emoji: string;
  price: number;
  color: string;
}

export const EGG_DEFS: EggDef[] = [
  { rarity: 'common',    name: '普通蛋',  emoji: '🥚', price: 100, color: 'bg-gray-100 border-gray-300 text-gray-700' },
  { rarity: 'rare',      name: '稀有蛋',  emoji: '💎', price: 300, color: 'bg-blue-50 border-blue-300 text-blue-700' },
  { rarity: 'legendary', name: '傳說蛋',  emoji: '✨', price: 800, color: 'bg-yellow-50 border-yellow-300 text-yellow-700' },
];

// ─── Coin Rewards ───────────────────────────────────────────────
export const COIN_REWARDS: Record<CoinReason, number> = {
  fix_p0:              50,
  fix_p1:              20,
  fix_p2_p3:           10,
  ready_to_test:        0,   // no direct reward (reward is fix_pX above)
  retest_pass:          5,
  retest_fail:         12,
  file_bug:             5,
  daily_report:         5,
  todo_clear:           8,
  create_wiki:         10,
  create_todo:          2,
  release_publish:     40,
  release_zero_p0:     30,
  streak_bonus:        15,
  achievement_unlock:  20,
  phoenix_bonus:       30,
  history_retroactive:  0,   // calculated dynamically (2x of base)
};

// ─── Level / XP System ──────────────────────────────────────────
// Index = level - 1, value = cumulative XP needed to reach that level
export const XP_THRESHOLDS = [0, 150, 350, 600, 900, 1300, 1800, 2500, 3300, 4200] as const;
export const MAX_LEVEL = 10;

export function getLevel(xp: number): number {
  for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= XP_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function getStage(level: number): PetStage {
  if (level >= 7) return 'awakened';
  if (level >= 4) return 'adult';
  return 'baby';
}

export function getXpToNextLevel(xp: number): { current: number; needed: number; level: number } {
  const level = getLevel(xp);
  if (level >= MAX_LEVEL) return { current: xp - XP_THRESHOLDS[MAX_LEVEL - 1], needed: 0, level };
  const currentThreshold = XP_THRESHOLDS[level - 1];
  const nextThreshold = XP_THRESHOLDS[level];
  return {
    current: xp - currentThreshold,
    needed: nextThreshold - currentThreshold,
    level,
  };
}

// ─── Happiness ──────────────────────────────────────────────────
const FEED_DECAY_HOURS = 24; // happiness drops to 0 after 24h without feeding

export function getHappiness(lastFed: number): number {
  const hoursSince = (Date.now() - lastFed) / (1000 * 60 * 60);
  return Math.max(0, Math.round(100 - (hoursSince / FEED_DECAY_HOURS) * 100));
}

export const FEED_COST = 20; // coins per feeding

export function getEggPrice(rarity: PetRarity): number {
  return EGG_DEFS.find(e => e.rarity === rarity)?.price ?? 0;
}

// ─── Stage Labels ───────────────────────────────────────────────
export const STAGE_LABEL: Record<PetStage, string> = {
  baby:     '幼體',
  adult:    '成體',
  awakened: '覺醒',
};

export const RARITY_LABEL: Record<PetRarity, string> = {
  common:    '普通',
  rare:      '稀有',
  legendary: '傳說',
};

export const RARITY_COLOR: Record<PetRarity, string> = {
  common:    'text-gray-600 bg-gray-100 border-gray-300',
  rare:      'text-blue-600 bg-blue-50 border-blue-200',
  legendary: 'text-yellow-600 bg-yellow-50 border-yellow-300',
};

// ─── Transaction Reason Labels ──────────────────────────────────
export const REASON_LABEL: Record<string, string> = {
  fix_p0:              '修復 P0 Bug',
  fix_p1:              '修復 P1 Bug',
  fix_p2_p3:           '修復 P2/P3 Bug',
  ready_to_test:       '標記待測試',
  retest_pass:         'Retest 通過',
  retest_fail:         'Retest 退回（發現問題）',
  file_bug:            '回報 Bug',
  daily_report:        '撰寫日報',
  todo_clear:          '完成所有待辦',
  create_wiki:         '建立 Wiki 頁面',
  create_todo:         '新增待辦事項',
  release_publish:     '正式發布版更',
  release_zero_p0:     '零 P0 發布獎勵',
  streak_bonus:        '連續打卡獎勵',
  achievement_unlock:  '解鎖成就',
  phoenix_bonus:       '鳳凰加成（退回後修復）',
  history_retroactive: '歷史紀錄回溯獎勵',
  hatch_common_egg:    '孵化普通蛋',
  hatch_rare_egg:      '孵化稀有蛋',
  hatch_legendary_egg: '孵化傳說蛋',
  feed_pet:            '餵食寵物',
};

// ─── Encouragement Messages (for Bugsy buff) ────────────────────
export const ENCOURAGEMENTS = [
  '今天也要加油！Bug 是讓系統更強壯的機會 💪',
  '每修一個 Bug，產品就進化一次 🚀',
  '堅持就是勝利，你做得很好！✨',
  '團隊有你，品質更有保障 🛡️',
  '今日的 Bug，是明日穩定的基石 🔧',
  '你的每一次 Retest，都是對品質的承諾 🔍',
  '專注當下，一個 Bug 接一個 Bug 🎯',
  'P0 都難不倒你，繼續衝！🐉',
];
