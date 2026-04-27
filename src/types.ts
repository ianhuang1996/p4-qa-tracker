export interface QAItem {
  id: string;
  title?: string;
  priority?: string;
  date: string;
  module: string;
  tester: string;
  description: string;
  /** @deprecated Use `imageLinks` array instead */
  imageLink: string;
  imageLinks?: string[];
  /** @deprecated Use `videoLinks` array instead */
  videoLink?: string;
  videoLinks?: string[];
  currentFlow: string;
  assignee: string;
  fixVersion?: string;
  answer: string;
  rdFix?: string;
  testMethod?: string;
  comments?: QAComment[];
  commentCount?: number;
  fixedAt?: number;
  version?: string;
  authorUID?: string;
  /** @deprecated Use `attachments` array instead */
  attachmentUrl?: string;
  /** @deprecated Use `attachments` array instead */
  attachmentName?: string;
  attachments?: { name: string; url: string }[];
  isNextRelease?: boolean;
  releaseNote?: string;
  linkedReleaseId?: string;
  linkedReleaseVersion?: string;
  sortOrder?: number;
  retestResult?: 'passed' | 'failed';
  retestNote?: string;
  retestDate?: number;
  retestBy?: string;
  retestEnvironment?: 'dev' | 'uat' | 'prod';
  /** Set when this item was confirmed as a duplicate of another (target item id). */
  duplicateOfId?: string;
}

export type TestEnvironment = 'dev' | 'uat' | 'prod';

export interface QAComment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: number;
  updatedAt?: number;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export interface AugmentedQAItem extends QAItem {
  priority: string;
  category: string;
  cleanDesc: string;
  displayTitle: string;
  comments: QAComment[];
  version?: string;
}

export type ViewMode = 'table' | 'kanban';
export type AppPage = 'overview' | 'todo' | 'qa' | 'release' | 'wiki' | 'pet' | 'meetings' | 'roadmap';

// ===== Decision Log =====
export type DecisionStatus = 'active' | 'superseded' | 'reversed';
export type DecisionTag = 'scope-change' | 'priority-change' | 'direction-pivot' | 'resource' | 'process' | 'other';

export interface Decision {
  id: string;
  date: string;                    // YYYY-MM-DD
  title: string;
  context?: string;                // 什麼觸發的
  decision: string;                // 決策內容
  rationale?: string;              // 為什麼
  decidedBy: string;               // 誰拍板
  status: DecisionStatus;
  supersedesId?: string;           // 取代了哪個舊決策
  supersededById?: string;         // 被哪個新決策取代
  linkedRoadmapItemIds?: string[];
  tags?: DecisionTag[];
  meetingNoteId?: string;          // 從會議記錄建立時的來源
  createdBy: string;
  createdByName: string;
  createdAt: number;
  updatedAt?: number;
}

// ===== Roadmap =====
export type RoadmapTrack = 'bug_fix' | 'feature' | 'backend';
export type RoadmapStatus = 'now' | 'next' | 'later' | 'completed' | 'cancelled';

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  track: RoadmapTrack;
  status: RoadmapStatus;
  targetMonth?: string;             // 'YYYY-MM', e.g. '2026-04'
  priority?: 'high' | 'medium' | 'low';
  linkedReleaseId?: string;
  linkedReleaseVersion?: string;
  linkedQAItemIds?: string[];     // 後台開發 track: linked QA items
  assignees: string[];
  createdBy: string;
  createdByName: string;
  sortOrder?: number;
  createdAt: number;
  updatedAt?: number;
  // Derived-only fields (not stored in Firestore, computed at runtime)
  isDerived?: boolean;
  qaStats?: { open: number; closed: number; total: number };
}

// ===== Meeting Notes =====
export type MeetingType = 'client' | 'internal';

export interface MeetingActionItem {
  id: string;
  text: string;
  assignee: string;
  linkedTodoId?: string;
  done: boolean;
}

export interface MeetingNote {
  id: string;
  title: string;
  date: string;           // YYYY-MM-DD
  type: MeetingType;
  attendees: string[];
  notes: string;          // free-form text / Markdown
  actionItems: MeetingActionItem[];
  aiSummary?: { keyPoints: string[]; suggestedActions: string[] };
  createdBy: string;
  createdByName: string;
  createdAt: number;
  updatedAt: number;
}

// ===== Pet System =====
export type PetRarity = 'common' | 'rare' | 'legendary';
export type PetStage = 'baby' | 'adult' | 'awakened';
export type PetBuffType =
  | 'encouragement' | 'item_highlight' | 'retest_badge' | 'streak_badge' | 'todo_celebrate' | 'my_tasks_highlight'
  | 'overdue_alert' | 'item_pin' | 'team_notify' | 'weekly_compare' | 'wiki_stale' | 'release_countdown'
  | 'p0_banner' | 'release_confetti' | 'phoenix_bonus';

export type PetTypeId =
  | 'bugsy' | 'patches' | 'clicky' | 'sheldon' | 'hoppy' | 'leapy'
  | 'sherlock' | 'zap' | 'squawk' | 'foxy' | 'hoot' | 'pingu'
  | 'draco' | 'prism' | 'blaze';

export interface PetDef {
  id: PetTypeId;
  name: string;
  emoji: string;
  rarity: PetRarity;
  buff: PetBuffType;
  buffDesc: string;
}

export interface Pet {
  typeId: PetTypeId;
  name: string;           // user-given name
  xp: number;
  level: number;          // 1–10
  stage: PetStage;
  lastFed: number;        // timestamp
  hatchedAt: number;
  eggRarity: PetRarity;
  cosmeticsOwned?: string[];
  activeBackground?: string;
  activeFrame?: string;
}

export type CoinReason =
  | 'fix_p0' | 'fix_p1' | 'fix_p2_p3' | 'ready_to_test'
  | 'retest_pass' | 'retest_fail'
  | 'file_bug' | 'daily_report' | 'todo_clear' | 'create_wiki' | 'create_todo'
  | 'release_publish' | 'release_zero_p0' | 'streak_bonus' | 'achievement_unlock'
  | 'phoenix_bonus' | 'history_retroactive'
  | 'create_meeting' | 'meeting_action_done';

export interface CoinTransaction {
  id: string;
  amount: number;
  reason: CoinReason;
  timestamp: number;
  note?: string;
}

export type WikiCategory = 'API' | '設計規範' | '產品規格' | '專案' | '一般';

export interface WikiPage {
  id: string;
  title: string;
  content: string;
  category: WikiCategory;
  createdBy: string;
  createdByName: string;
  createdAt: number;
  updatedAt: number;
  updatedBy: string;
  updatedByName: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

/** Shared props for components that render release-link controls */
export interface ReleaseLinksProps {
  unreleasedReleases?: { id: string; version: string; linkedItemIds: string[] }[];
  onLinkToRelease?: (releaseId: string) => void;
  onUnlinkFromRelease?: (releaseId: string) => void;
}

export interface Release {
  id: string;
  version: string;
  title: string;
  status: 'planning' | 'uat' | 'released' | 'cancelled';
  scheduledDate: string;
  releasedAt: number | null;
  linkedItemIds: string[];
  checklist: ChecklistItem[];
  releaseNotes: string;
  createdBy: string;
  createdByName: string;
  createdAt: number;
  sortOrder?: number;
}

export interface HistoryEntry {
  id: string;
  userId: string;
  userName: string;
  timestamp: number;
  changes: {
    field: string;
    oldValue: string | number | boolean | null;
    newValue: string | number | boolean | null;
  }[];
}

export interface Notification {
  id: string;
  userId: string; // Recipient
  fromUserId: string;
  fromUserName: string;
  itemId: string;
  itemTitle: string;
  type: 'status_change' | 'assignment' | 'comment' | 'team_notify';
  oldValue?: string;
  newValue?: string;
  isRead: boolean;
  createdAt: number;
}

export interface TodoItem {
  id: string;
  creatorId: string;       // 建立者 UID
  creatorName: string;     // 建立者名稱
  assignee: string;        // 負責人名稱 (e.g. 'Neo', 'Ian')
  text: string;
  completed: boolean;
  date: string;            // 'YYYY-MM-DD'
  priority?: 'high' | 'medium' | 'low';
  linkedQAItemId?: string;
  createdAt: number;
  completedAt?: number;
  // ── 任務單欄位 (type === 'task' 時啟用) ──
  type?: 'todo' | 'task';
  instruction?: string;    // 請做：具體指示
  deliverable?: string;    // 交付：交什麼給我
  dueTime?: string;        // 截止時間 HH:MM
}

export interface DailyReport {
  id: string;
  date: string;            // YYYY-MM-DD
  userId: string;
  completed: string;       // 🟢 今日完成
  inProgress: string;      // 🟡 進行中 / 明日重點
  risks: string;           // 🔴 風險 / 需協助
  createdAt: number;
  updatedAt: number;
}

// ===== Gamification =====

export type AchievementCategory = 'bugfix' | 'speed' | 'consistency' | 'todo' | 'wiki' | 'communication' | 'release' | 'qa' | 'special';

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  tier: 1 | 2 | 3;           // Bronze / Silver / Gold
  condition: {
    metric: string;           // e.g. 'bugs_fixed', 'p0_fixed', 'daily_report_streak'
    threshold: number;
  };
}

export interface UserAchievement {
  achievementId: string;
  unlockedAt: number;
}

export interface TeamGoalDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  type: 'release' | 'weekly';
}

export interface TeamGoalProgress {
  goalId: string;
  current: number;
  target: number;
  achieved: boolean;
}

export interface AchievementLog {
  id: string;
  achievementId: string;
  userId: string;
  userName: string;
  unlockedAt: number;
}
