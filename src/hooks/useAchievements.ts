import { useMemo, useState, useEffect, useRef } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, orderBy, limit as fbLimit, addDoc, getDocs } from 'firebase/firestore';
import { QAItem, AugmentedQAItem, TodoItem, WikiPage, Release, DailyReport, TeamGoalProgress, AchievementLog } from '../types';
import { ACHIEVEMENT_DEFS, TEAM_GOAL_DEFS, HOLIDAYS_2026, PMS, RDS, MODULES } from '../constants';
import { augmentQAItems } from '../utils/qaUtils';
import { toast } from 'sonner';

// ─── Workday helpers ──────────────────────────────────────

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  return day === 0 || day === 6;
}

function isHoliday(dateStr: string): boolean {
  const mmdd = dateStr.substring(5); // 'MM-DD'
  return HOLIDAYS_2026.includes(mmdd);
}

function isWorkday(dateStr: string): boolean {
  return !isWeekend(dateStr) && !isHoliday(dateStr);
}

function getPrevWorkday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  do {
    d.setDate(d.getDate() - 1);
    const s = d.toISOString().substring(0, 10);
    if (isWorkday(s)) return s;
  } while (d.getFullYear() >= 2024);
  return dateStr;
}

// ─── Metric calculators ───────────────────────────────────

interface MetricInputs {
  qaItems: AugmentedQAItem[];
  rawQAItems: QAItem[];
  todos: TodoItem[];
  wikiPages: WikiPage[];
  releases: Release[];
  dailyReports: DailyReport[];
  userName: string;
  userId: string;
}

function computeMetrics(inputs: MetricInputs): Record<string, number> {
  const { qaItems, rawQAItems, todos, wikiPages, releases, dailyReports, userName, userId } = inputs;
  const metrics: Record<string, number> = {};

  // --- Bug fix metrics ---
  const fixedStatuses = ['已修復', '已關閉'];
  const myFixed = qaItems.filter(i => i.assignee === userName && fixedStatuses.includes(i.currentFlow));
  metrics.bugs_fixed = myFixed.length;

  const myP0Fixed = myFixed.filter(i => i.priority === 'P0');
  metrics.p0_fixed = myP0Fixed.length;

  const myP0P1Fixed = myFixed.filter(i => i.priority === 'P0' || i.priority === 'P1');
  metrics.p0p1_fixed = myP0P1Fixed.length;

  // --- Speed metrics ---
  let fastP0Count = 0;
  myP0Fixed.forEach(item => {
    if (item.fixedAt && item.date) {
      const createdTs = new Date(item.date + 'T00:00:00').getTime();
      if (item.fixedAt - createdTs < 24 * 60 * 60 * 1000) {
        fastP0Count++;
      }
    }
  });
  metrics.fast_p0_fix = fastP0Count;

  const fixesByDate: Record<string, number> = {};
  myFixed.forEach(item => {
    if (item.fixedAt) {
      const date = new Date(item.fixedAt).toISOString().substring(0, 10);
      fixesByDate[date] = (fixesByDate[date] || 0) + 1;
    }
  });
  metrics.max_daily_fixes = Math.max(0, ...Object.values(fixesByDate));

  // --- Daily report streak (workdays only, skip weekends + holidays) ---
  const myReports = dailyReports
    .filter(r => r.userId === userId)
    .map(r => r.date)
    .sort()
    .reverse();

  let streak = 0;
  if (myReports.length > 0) {
    const today = new Date().toISOString().substring(0, 10);
    let checkDate = isWorkday(today) ? today : getPrevWorkday(today);
    const reportSet = new Set(myReports);
    while (reportSet.has(checkDate)) {
      streak++;
      checkDate = getPrevWorkday(checkDate);
    }
  }
  metrics.report_streak = streak;

  // --- Todo metrics ---
  const myCompletedTodos = todos.filter(t => t.assignee === userName && t.completed && t.completedAt);
  const todosByDate: Record<string, number> = {};
  myCompletedTodos.forEach(t => {
    if (t.completedAt) {
      const date = new Date(t.completedAt).toISOString().substring(0, 10);
      todosByDate[date] = (todosByDate[date] || 0) + 1;
    }
  });
  metrics.max_daily_todos = Math.max(0, ...Object.values(todosByDate));

  const myTodosByDate: Record<string, { total: number; done: number }> = {};
  todos.filter(t => t.assignee === userName).forEach(t => {
    if (!myTodosByDate[t.date]) myTodosByDate[t.date] = { total: 0, done: 0 };
    myTodosByDate[t.date].total++;
    if (t.completed) myTodosByDate[t.date].done++;
  });
  let clearStreak = 0;
  {
    const today = new Date().toISOString().substring(0, 10);
    let checkDate = isWorkday(today) ? today : getPrevWorkday(today);
    while (true) {
      const info = myTodosByDate[checkDate];
      if (info && info.total > 0 && info.done === info.total) {
        clearStreak++;
        checkDate = getPrevWorkday(checkDate);
      } else {
        break;
      }
    }
  }
  metrics.todo_clear_streak = clearStreak;

  // --- Wiki ---
  metrics.wiki_created = wikiPages.filter(w => w.createdBy === userId).length;

  // --- Comments (approximate from commentCount on items authored or assigned to user) ---
  // Since we can't easily query per-user comment count without subcollection reads,
  // we count items where user is author + their commentCount as a rough proxy
  let commentEstimate = 0;
  qaItems.forEach(item => {
    if (item.authorUID === userId || item.assignee === userName) {
      commentEstimate += Math.floor((item.commentCount || 0) * 0.5);
    }
  });
  metrics.comments_made = commentEstimate;

  // --- Release participation ---
  const releasedVersions = releases.filter(r => r.status === 'released');
  let releaseParticipation = 0;
  releasedVersions.forEach(release => {
    const linkedItems = qaItems.filter(i => release.linkedItemIds.includes(i.id));
    if (linkedItems.some(i => i.assignee === userName)) {
      releaseParticipation++;
    }
  });
  metrics.releases_participated = releaseParticipation;

  // --- PM metrics: bugs filed, retest, releases published, todos assigned ---
  metrics.bugs_filed = rawQAItems.filter(i => i.tester === userName || i.authorUID === userId).length;

  const myRetested = rawQAItems.filter(i => i.retestBy === userName);
  metrics.retest_count = myRetested.length;
  metrics.retest_failed = myRetested.filter(i => i.retestResult === 'failed').length;

  metrics.releases_published = releases.filter(r => r.status === 'released' && r.createdBy === userId).length;

  metrics.todos_created_for_others = todos.filter(t => t.creatorId === userId && t.assignee !== userName).length;

  // --- Special / Hidden achievements ---

  // 自產自銷: filed a bug (tester/author) AND fixed it (assignee + fixed status)
  metrics.self_filed_and_fixed = myFixed.filter(i => i.authorUID === userId || i.tester === userName).length > 0 ? 1 : 0;

  // 不死鳥: any item assigned to user that went through 退回重修 3+ times then got fixed
  // We approximate by checking items with retestResult='failed' multiple times
  // Since we only store latest retest, we check history via status changes if available
  // Simpler: count items that are now fixed but were previously 退回重修 (we can check currentFlow history)
  // For now, approximate: items with retestResult passed that have been through retest multiple times
  let phoenixCount = 0;
  myFixed.forEach(item => {
    // If the item has answer field containing 退回 references or multiple fix cycles
    // Simple heuristic: items that took > 30 days from creation to fix
    if (item.fixedAt && item.date) {
      const created = new Date(item.date + 'T00:00:00').getTime();
      const fixDays = (item.fixedAt - created) / (1000 * 60 * 60 * 24);
      if (fixDays > 30) phoenixCount++;
    }
  });
  metrics.phoenix_fix = phoenixCount > 0 ? 1 : 0;

  // 全模組制霸: fixed bugs across all 7 modules
  const fixedModules = new Set(myFixed.map(i => i.module));
  metrics.modules_fixed = fixedModules.size;

  // 深夜戰士: any QA item updated after 22:00 by this user
  let lateNight = 0;
  rawQAItems.forEach(item => {
    if (item.fixedAt && item.assignee === userName) {
      const hour = new Date(item.fixedAt).getHours();
      if (hour >= 22 || hour < 5) lateNight++;
    }
  });
  metrics.late_night_updates = lateNight;

  // 百日紀念: days since user's first action (first QA item authored or first todo created)
  let firstActionTs = Infinity;
  rawQAItems.forEach(i => { if (i.authorUID === userId && i.date) { const ts = new Date(i.date + 'T00:00:00').getTime(); if (ts < firstActionTs) firstActionTs = ts; } });
  todos.forEach(t => { if (t.creatorId === userId && t.createdAt < firstActionTs) firstActionTs = t.createdAt; });
  metrics.days_since_first_action = firstActionTs < Infinity ? Math.floor((Date.now() - firstActionTs) / (1000 * 60 * 60 * 24)) : 0;

  // --- Special: first bug author ---
  const sortedByNum = [...rawQAItems].sort((a, b) => {
    const numA = parseInt(a.id.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.id.replace(/\D/g, ''), 10) || 0;
    return numA - numB;
  });
  metrics.is_first_bug_author = sortedByNum.length > 0 && sortedByNum[0].authorUID === userId ? 1 : 0;

  // --- Categories unlocked ---
  const unlockedCategories = new Set<string>();
  const nonSpecialDefs = ACHIEVEMENT_DEFS.filter(d => d.category !== 'special');
  nonSpecialDefs.forEach(def => {
    const val = metrics[def.condition.metric] || 0;
    if (val >= def.condition.threshold) {
      unlockedCategories.add(def.category);
    }
  });
  metrics.categories_unlocked = unlockedCategories.size;

  return metrics;
}

// ─── Main hook ────────────────────────────────────────────

interface UseAchievementsParams {
  user: FirebaseUser | null;
  qaItems: QAItem[];
  todos: TodoItem[];
  wikiPages: WikiPage[];
  releases: Release[];
  dailyReports: DailyReport[];
}

export function useAchievements({ user, qaItems, todos, wikiPages, releases, dailyReports }: UseAchievementsParams) {
  const augmented = useMemo(() => augmentQAItems(qaItems), [qaItems]);

  const metrics = useMemo(() => {
    if (!user) return {};
    return computeMetrics({
      qaItems: augmented,
      rawQAItems: qaItems,
      todos,
      wikiPages,
      releases,
      dailyReports,
      userName: user.displayName || '',
      userId: user.uid,
    });
  }, [user, augmented, qaItems, todos, wikiPages, releases, dailyReports]);

  const unlockedAchievements = useMemo(() => {
    return ACHIEVEMENT_DEFS.filter(def => {
      const val = metrics[def.condition.metric] || 0;
      return val >= def.condition.threshold;
    });
  }, [metrics]);

  const lockedAchievements = useMemo(() => {
    return ACHIEVEMENT_DEFS.filter(def => {
      const val = metrics[def.condition.metric] || 0;
      return val < def.condition.threshold;
    });
  }, [metrics]);

  const achievementProgress = useMemo(() => {
    const progress: Record<string, number> = {};
    ACHIEVEMENT_DEFS.forEach(def => {
      const val = metrics[def.condition.metric] || 0;
      progress[def.id] = Math.min(100, Math.round((val / def.condition.threshold) * 100));
    });
    return progress;
  }, [metrics]);

  // ─── Detect new unlocks → save to Firestore + toast ───
  const loggedIdsRef = useRef<Set<string>>(new Set());
  const [logsReady, setLogsReady] = useState(false);

  // Load already-logged achievements for this user on mount
  useEffect(() => {
    if (!user) return;
    setLogsReady(false);
    const q = query(collection(db, 'achievement_logs'), where('userId', '==', user.uid));
    getDocs(q).then(snapshot => {
      snapshot.forEach(d => loggedIdsRef.current.add(d.data().achievementId));
      setLogsReady(true);
    }).catch(err => {
      console.error('Failed to load achievement logs:', err);
      setLogsReady(true); // Still allow new unlocks even if load fails
    });
  }, [user]);

  // Watch for new unlocks (triggers when logsReady flips to true OR unlocked list changes)
  useEffect(() => {
    if (!user || !logsReady || unlockedAchievements.length === 0) return;

    unlockedAchievements.forEach(ach => {
      if (loggedIdsRef.current.has(ach.id)) return;
      loggedIdsRef.current.add(ach.id);

      // Save to Firestore
      addDoc(collection(db, 'achievement_logs'), {
        achievementId: ach.id,
        userId: user.uid,
        userName: user.displayName || '匿名',
        unlockedAt: Date.now(),
      }).catch(err => console.error('Failed to log achievement:', err));

      // Toast celebration
      toast.success(`🎉 解鎖成就「${ach.name}」— ${ach.description}`, { duration: 5000 });
    });
  }, [user, logsReady, unlockedAchievements]);

  // Team goals
  const teamGoals = useMemo((): TeamGoalProgress[] => {
    const activeRelease = releases.find(r => r.status === 'planning' || r.status === 'uat');
    const allMembers = [...PMS, ...RDS].filter(n => n !== 'Unassigned');

    return TEAM_GOAL_DEFS.map(goal => {
      switch (goal.id) {
        case 'zero_p0': {
          if (!activeRelease) return { goalId: goal.id, current: 0, target: 0, achieved: false };
          const linkedP0 = augmented.filter(
            i => activeRelease.linkedItemIds.includes(i.id) && i.priority === 'P0' && i.currentFlow !== '已關閉' && i.currentFlow !== '已修復'
          );
          return { goalId: goal.id, current: linkedP0.length, target: 0, achieved: linkedP0.length === 0 && activeRelease.linkedItemIds.length > 0 };
        }
        case 'release_on_time': {
          if (!activeRelease) return { goalId: goal.id, current: 0, target: 0, achieved: false };
          const checked = activeRelease.checklist.filter(c => c.checked).length;
          const total = activeRelease.checklist.length;
          return { goalId: goal.id, current: checked, target: total, achieved: checked === total && total > 0 };
        }
        case 'bug_clear': {
          if (!activeRelease) return { goalId: goal.id, current: 0, target: 0, achieved: false };
          const linkedIds = activeRelease.linkedItemIds;
          const linked = augmented.filter(i => linkedIds.includes(i.id));
          const closed = linked.filter(i => i.currentFlow === '已關閉' || i.currentFlow === '已修復');
          return { goalId: goal.id, current: closed.length, target: linked.length, achieved: closed.length === linked.length && linked.length > 0 };
        }
        default:
          return { goalId: goal.id, current: 0, target: 0, achieved: false };
      }
    });
  }, [releases, augmented, dailyReports]);

  return {
    metrics,
    unlockedAchievements,
    lockedAchievements,
    achievementProgress,
    teamGoals,
  };
}

// ─── Hook to fetch recent achievement logs (all users) ──

export function useAchievementLogs(user: FirebaseUser | null): AchievementLog[] {
  const [logs, setLogs] = useState<AchievementLog[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'achievement_logs'),
      orderBy('unlockedAt', 'desc'),
      fbLimit(20)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: AchievementLog[] = [];
      snapshot.forEach(d => items.push({ id: d.id, ...d.data() } as AchievementLog));
      setLogs(items);
    }, (error) => {
      console.error('Failed to fetch achievement logs:', error);
    });
    return () => unsubscribe();
  }, [user]);

  return logs;
}

// ─── Hook to compute per-user highest achievement tier ──

/** Maps userId → highest tier (1/2/3), and also userName → highest tier for avatar usage */
export function useUserTiers(user: FirebaseUser | null): {
  tierByUserId: Record<string, number>;
  tierByUserName: Record<string, number>;
  highestIconByUserId: Record<string, string>;
} {
  const [logs, setLogs] = useState<AchievementLog[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'achievement_logs'), orderBy('unlockedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: AchievementLog[] = [];
      snapshot.forEach(d => items.push({ id: d.id, ...d.data() } as AchievementLog));
      setLogs(items);
    }, (error) => {
      console.error('Failed to fetch user tiers:', error);
    });
    return () => unsubscribe();
  }, [user]);

  return useMemo(() => {
    const tierByUserId: Record<string, number> = {};
    const tierByUserName: Record<string, number> = {};
    const highestIconByUserId: Record<string, string> = {};
    // Track highest tier + most recent icon per user
    const bestByUserId: Record<string, { tier: number; icon: string; unlockedAt: number }> = {};

    logs.forEach(log => {
      const def = ACHIEVEMENT_DEFS.find(d => d.id === log.achievementId);
      if (!def) return;
      const prev = bestByUserId[log.userId];
      if (!prev || def.tier > prev.tier || (def.tier === prev.tier && log.unlockedAt > prev.unlockedAt)) {
        bestByUserId[log.userId] = { tier: def.tier, icon: def.icon, unlockedAt: log.unlockedAt };
      }
      // Also track by userName
      if (!tierByUserName[log.userName] || def.tier > tierByUserName[log.userName]) {
        tierByUserName[log.userName] = def.tier;
      }
    });

    Object.entries(bestByUserId).forEach(([userId, info]) => {
      tierByUserId[userId] = info.tier;
      highestIconByUserId[userId] = info.icon;
    });

    return { tierByUserId, tierByUserName, highestIconByUserId };
  }, [logs]);
}

/** Get avatar ring class based on tier */
export function getAvatarRing(tier: number | undefined): string {
  switch (tier) {
    case 1: return 'ring-2 ring-amber-700';
    case 2: return 'ring-2 ring-gray-400';
    case 3: return 'ring-2 ring-yellow-400 shadow-sm shadow-yellow-200';
    default: return '';
  }
}

// ─── Lightweight hook to fetch all daily reports (for team goals) ──

export function useAllDailyReports(user: FirebaseUser | null): DailyReport[] {
  const [reports, setReports] = useState<DailyReport[]>([]);

  useEffect(() => {
    if (!user) return;
    // Fetch last 90 days of daily reports from all users
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffStr = cutoff.toISOString().substring(0, 10);

    const q = query(
      collection(db, 'daily_reports'),
      where('date', '>=', cutoffStr),
      orderBy('date', 'desc'),
      fbLimit(500)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: DailyReport[] = [];
      snapshot.forEach(d => items.push({ id: d.id, ...d.data() } as DailyReport));
      setReports(items);
    }, (error) => {
      console.error('Failed to fetch all daily reports:', error);
    });
    return () => unsubscribe();
  }, [user]);

  return reports;
}
