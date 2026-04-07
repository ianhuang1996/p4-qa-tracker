import { useMemo, useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, orderBy, limit as fbLimit } from 'firebase/firestore';
import { QAItem } from '../data';
import { AugmentedQAItem, TodoItem, WikiPage, Release, DailyReport, TeamGoalProgress } from '../types';
import { ACHIEVEMENT_DEFS, TEAM_GOAL_DEFS, HOLIDAYS_2026, PMS, RDS } from '../constants';
import { augmentQAItems } from '../utils/qaUtils';

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
