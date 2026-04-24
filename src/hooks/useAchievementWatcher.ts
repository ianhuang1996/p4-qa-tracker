import { useEffect, useRef, useState } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, where, addDoc, getDocs } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { toast } from 'sonner';
import { TodoItem } from '../types';
import { EMAIL_TO_MEMBER, DEFAULT_DISPLAY_NAME } from '../constants';
import { useQAItems } from './useQAItems';
import { useReleases } from './useReleases';
import { useWikiPages } from './useWikiPages';
import { useMeetingNotes } from './useMeetingNotes';
import { useAchievements, useAllDailyReports } from './useAchievements';

// Fetches ALL todos (no date filter) for lifetime achievement metrics.
// Scoped to achievement-watcher only; other UIs use date-ranged useTodos for perf.
function useAllTodos(user: FirebaseUser | null): TodoItem[] {
  const [todos, setTodos] = useState<TodoItem[]>([]);

  useEffect(() => {
    if (!user) {
      setTodos([]);
      return;
    }
    const q = query(collection(db, 'todos'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snap) => setTodos(snap.docs.map(d => ({ id: d.id, ...d.data() } as TodoItem))),
      (err) => console.warn('Achievement watcher: todos fetch failed', err),
    );
    return () => unsubscribe();
  }, [user]);

  return todos;
}

/**
 * Global achievement watcher — mount once at App level.
 * Fetches all metric inputs and runs `useAchievements` so unlock detection + Firestore write
 * happen regardless of which page the user is on.
 *
 * Side effect only: writes new unlocks to `achievement_logs` and shows toast.
 */
export function useAchievementWatcher(user: FirebaseUser | null, isAuthReady: boolean): void {
  const { data: qaItems } = useQAItems(user, isAuthReady);
  const todos = useAllTodos(user);
  const { releases } = useReleases(user);
  const { pages: wikiPages } = useWikiPages(user);
  const { meetings } = useMeetingNotes(user);
  const dailyReports = useAllDailyReports(user);

  const { unlockedAchievements } = useAchievements({
    user,
    qaItems,
    todos,
    wikiPages,
    releases,
    dailyReports,
    meetings,
  });

  // ─── Detect new unlocks → save to Firestore + toast ───
  const loggedIdsRef = useRef<Set<string>>(new Set());
  const [logsReady, setLogsReady] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLogsReady(false);
    loggedIdsRef.current = new Set();
    let mounted = true;
    const q = query(collection(db, 'achievement_logs'), where('userId', '==', user.uid));
    getDocs(q).then(snapshot => {
      if (!mounted) return;
      snapshot.forEach(d => loggedIdsRef.current.add(d.data().achievementId));
      setLogsReady(true);
    }).catch(err => {
      if (!mounted) return;
      console.warn('Failed to load achievement logs:', err);
      setLogsReady(true);
    });
    return () => { mounted = false; };
  }, [user]);

  useEffect(() => {
    if (!user || !logsReady || unlockedAchievements.length === 0) return;

    unlockedAchievements.forEach(ach => {
      if (loggedIdsRef.current.has(ach.id)) return;
      loggedIdsRef.current.add(ach.id);

      const canonicalName = (user.email && EMAIL_TO_MEMBER[user.email]) || user.displayName || DEFAULT_DISPLAY_NAME;
      addDoc(collection(db, 'achievement_logs'), {
        achievementId: ach.id,
        userId: user.uid,
        userName: canonicalName,
        unlockedAt: Date.now(),
      }).catch(err => console.error('Failed to log achievement:', err));

      toast.success(`🎉 解鎖成就「${ach.name}」— ${ach.description}`, { duration: 5000 });
    });
  }, [user, logsReady, unlockedAchievements]);
}
