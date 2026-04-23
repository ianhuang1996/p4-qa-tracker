import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { toast } from 'sonner';
import { RoadmapItem, RoadmapStatus, Release, QAItem } from '../types';
import { EMAIL_TO_MEMBER, STATUS, RELEASE_STATUS, DEFAULT_DISPLAY_NAME } from '../constants';

function parseVersion(v: string): number[] {
  return v.replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
}

function compareVersion(a: string, b: string): number {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  for (let i = 0; i < Math.max(va.length, vb.length); i++) {
    const diff = (va[i] ?? 0) - (vb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function deriveBugFixItems(releases: Release[], qaItems: QAItem[]): RoadmapItem[] {
  const nonCancelled = releases.filter(r => r.status !== RELEASE_STATUS.CANCELLED);

  // 未發布：UAT 優先 → PLANNING 按 scheduledDate 由近到遠 → 版本號小者優先
  const active = nonCancelled
    .filter(r => r.status === RELEASE_STATUS.UAT || r.status === RELEASE_STATUS.PLANNING)
    .sort((a, b) => {
      if (a.status === RELEASE_STATUS.UAT && b.status !== RELEASE_STATUS.UAT) return -1;
      if (b.status === RELEASE_STATUS.UAT && a.status !== RELEASE_STATUS.UAT) return 1;
      const aDate = a.scheduledDate ? new Date(a.scheduledDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bDate = b.scheduledDate ? new Date(b.scheduledDate).getTime() : Number.MAX_SAFE_INTEGER;
      if (aDate !== bDate) return aDate - bDate;
      return compareVersion(a.version, b.version);
    });

  const released = nonCancelled
    .filter(r => r.status === RELEASE_STATUS.RELEASED)
    .sort((a, b) => compareVersion(b.version, a.version)); // 新版本在上

  // now / next / later 各取 1；其餘未發布版本不顯示於 Roadmap（版更管理頁仍可見）
  const slots: { release: Release; status: RoadmapStatus }[] = [];
  if (active[0]) slots.push({ release: active[0], status: 'now' });
  if (active[1]) slots.push({ release: active[1], status: 'next' });
  if (active[2]) slots.push({ release: active[2], status: 'later' });
  released.forEach(r => slots.push({ release: r, status: 'completed' }));

  return slots.map(({ release: r, status }) => {
    const linked = qaItems.filter(q => r.linkedItemIds.includes(q.id));
    const open   = linked.filter(q => q.currentFlow !== STATUS.closed && q.currentFlow !== STATUS.fixed).length;
    const closed = linked.filter(q => q.currentFlow === STATUS.closed || q.currentFlow === STATUS.fixed).length;
    return {
      id: `derived_${r.id}`,
      title: r.version,
      description: r.title || '',
      track: 'bug_fix',
      status,
      targetMonth: r.scheduledDate ? r.scheduledDate.substring(0, 7) : undefined,
      assignees: [],
      createdBy: r.createdBy,
      createdByName: r.createdByName,
      createdAt: r.createdAt,
      linkedReleaseId: r.id,
      linkedReleaseVersion: r.version,
      isDerived: true,
      qaStats: { open, closed, total: linked.length },
    } satisfies RoadmapItem;
  });
}

export function useRoadmap(user: FirebaseUser | null) {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'roadmap_items'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as RoadmapItem)));
      setIsLoading(false);
    }, () => setIsLoading(false));
    return () => unsub();
  }, []);

  const addItem = async (item: Omit<RoadmapItem, 'id' | 'createdAt' | 'createdBy' | 'createdByName'>) => {
    if (!user) return;
    const createdByName = (user.email && EMAIL_TO_MEMBER[user.email]) || user.displayName || DEFAULT_DISPLAY_NAME;
    const data = Object.fromEntries(
      Object.entries({ ...item, createdBy: user.uid, createdByName, createdAt: Date.now() })
        .filter(([, v]) => v !== undefined)
    );
    try {
      await addDoc(collection(db, 'roadmap_items'), data);
      toast.success('已新增');
    } catch (error) {
      console.error('Roadmap addItem failed:', error);
      toast.error(`新增失敗：${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  };

  const updateItem = async (id: string, updates: Partial<RoadmapItem>) => {
    const data = Object.fromEntries(
      Object.entries({ ...updates, updatedAt: Date.now() })
        .filter(([, v]) => v !== undefined)
    );
    try {
      await updateDoc(doc(db, 'roadmap_items', id), data);
    } catch {
      toast.error('更新失敗');
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'roadmap_items', id));
      toast.success('已刪除');
    } catch {
      toast.error('刪除失敗');
    }
  };

  return { items, isLoading, addItem, updateItem, deleteItem };
}
