import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { toast } from 'sonner';
import { RoadmapItem, RoadmapStatus, Release, QAItem } from '../types';
import { EMAIL_TO_MEMBER, STATUS, RELEASE_STATUS, DEFAULT_DISPLAY_NAME } from '../constants';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function releaseToRoadmapStatus(r: Release): RoadmapStatus {
  if (r.status === RELEASE_STATUS.UAT) return 'now';
  if (r.status === RELEASE_STATUS.RELEASED) return 'completed';
  if (r.status === RELEASE_STATUS.PLANNING) {
    // 排程日期在 7 天內 → now，否則 → next
    if (r.scheduledDate) {
      const scheduled = new Date(r.scheduledDate + 'T00:00:00').getTime();
      if (scheduled - Date.now() <= SEVEN_DAYS_MS) return 'now';
    }
    return 'next';
  }
  return 'later';
}

function parseVersion(v: string): number[] {
  return v.replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
}

export function deriveBugFixItems(releases: Release[], qaItems: QAItem[]): RoadmapItem[] {
  return releases
    .filter(r => r.status !== RELEASE_STATUS.CANCELLED)
    .sort((a, b) => {
      const va = parseVersion(a.version);
      const vb = parseVersion(b.version);
      for (let i = 0; i < Math.max(va.length, vb.length); i++) {
        const diff = (vb[i] ?? 0) - (va[i] ?? 0); // desc: newest first
        if (diff !== 0) return diff;
      }
      return 0;
    })
    .map(r => {
      const linked = qaItems.filter(q => r.linkedItemIds.includes(q.id));
      const open   = linked.filter(q => q.currentFlow !== STATUS.closed && q.currentFlow !== STATUS.fixed).length;
      const closed = linked.filter(q => q.currentFlow === STATUS.closed || q.currentFlow === STATUS.fixed).length;
      return {
        id: `derived_${r.id}`,
        title: r.version,
        description: r.title || '',
        track: 'bug_fix',
        status: releaseToRoadmapStatus(r),
        targetMonth: r.scheduledDate ? r.scheduledDate.substring(0, 7) : undefined,  // 'YYYY-MM'
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
