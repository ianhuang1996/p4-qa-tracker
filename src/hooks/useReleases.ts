import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, addDoc, query, orderBy, arrayUnion, arrayRemove } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { toast } from 'sonner';
import { Release, ChecklistItem, OperationType } from '../types';
import { handleFirestoreError } from '../utils/firestoreUtils';
import { awardCoins } from '../services/coinService';
import { STATUS, RELEASE_STATUS } from '../constants';

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: '1', label: 'UAT 測試完成', checked: false },
  { id: '2', label: 'Release Note 已撰寫', checked: false },
  { id: '3', label: '正式環境部署', checked: false },
  { id: '4', label: '發布更版通知', checked: false },
];

export function useReleases(user: FirebaseUser | null) {
  const [releases, setReleases] = useState<Release[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);
    const q = query(collection(db, 'releases'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Release[] = [];
      snapshot.forEach(d => items.push({ id: d.id, ...d.data() } as Release));
      setReleases(items);
      setError(null);
      setIsLoading(false);
    }, () => {
      setError('版更資料載入失敗');
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const addRelease = async (version: string, title: string, scheduledDate: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'releases'), {
        version,
        title,
        status: RELEASE_STATUS.PLANNING,
        scheduledDate,
        releasedAt: null,
        linkedItemIds: [],
        checklist: DEFAULT_CHECKLIST,
        releaseNotes: '',
        createdBy: user.uid,
        createdByName: user.displayName || '匿名',
        createdAt: Date.now(),
      });
      toast.success('版本已建立');
    } catch (error) {
      toast.error('建立版本失敗');
      handleFirestoreError(error, OperationType.WRITE, 'releases');
    }
  };

  const updateRelease = async (releaseId: string, updates: Partial<Release>) => {
    if (!user) return;
    const sanitized: Record<string, unknown> = {};
    Object.entries(updates).forEach(([key, val]) => {
      sanitized[key] = val === undefined ? null : val;
    });
    try {
      await setDoc(doc(db, 'releases', releaseId), sanitized, { merge: true });
    } catch (error) {
      toast.error('更新失敗');
      handleFirestoreError(error, OperationType.WRITE, `releases/${releaseId}`);
    }
  };

  const deleteRelease = async (releaseId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'releases', releaseId));
      toast.success('版本已刪除');
    } catch (error) {
      toast.error('刪除失敗');
      handleFirestoreError(error, OperationType.DELETE, `releases/${releaseId}`);
    }
  };

  const toggleChecklist = async (releaseId: string, checklist: ChecklistItem[], itemId: string) => {
    const updated = checklist.map(c => c.id === itemId ? { ...c, checked: !c.checked } : c);
    await updateRelease(releaseId, { checklist: updated });
  };

  const linkItems = async (releaseId: string, newIds: string[]) => {
    if (!user || newIds.length === 0) return;
    try {
      await setDoc(doc(db, 'releases', releaseId), {
        linkedItemIds: arrayUnion(...newIds)
      }, { merge: true });
      toast.success(`已加入 ${newIds.length} 個項目`);
    } catch (error) {
      toast.error('加入失敗');
      handleFirestoreError(error, OperationType.WRITE, `releases/${releaseId}`);
    }
  };

  const unlinkItem = async (releaseId: string, removeId: string) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'releases', releaseId), {
        linkedItemIds: arrayRemove(removeId)
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `releases/${releaseId}`);
    }
  };

  const unlinkItems = async (releaseId: string, removeIds: string[]) => {
    if (!user || removeIds.length === 0) return;
    try {
      await setDoc(doc(db, 'releases', releaseId), {
        linkedItemIds: arrayRemove(...removeIds)
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `releases/${releaseId}`);
    }
  };

  const executeRelease = async (release: Release) => {
    if (!user || release.linkedItemIds.length === 0) return;
    try {
      // Update QA items one by one (batch.update fails if any item has invalid fields in rules)
      let failCount = 0;
      for (const itemId of release.linkedItemIds) {
        try {
          const ref = doc(db, 'qa_items', itemId);
          await setDoc(ref, { currentFlow: STATUS.closed, fixVersion: release.version }, { merge: true });
        } catch (err) {
          console.error(`Failed to update ${itemId}:`, err);
          failCount++;
        }
      }
      // Update release status
      const releaseRef = doc(db, 'releases', release.id);
      await setDoc(releaseRef, { status: RELEASE_STATUS.RELEASED, releasedAt: Date.now() }, { merge: true });
      if (failCount > 0) {
        toast.success(`${release.version} 已發布！（${failCount} 個項目更新失敗，請手動檢查）`);
      } else {
        toast.success(`${release.version} 已正式發布！`);
      }
      awardCoins(user.uid, 'release_publish', release.version).catch(console.error);
    } catch (error) {
      toast.error('發布失敗');
      handleFirestoreError(error, OperationType.WRITE, `releases/${release.id}`);
    }
  };

  const updateReleaseSortOrders = async (updates: { id: string; sortOrder: number }[]) => {
    if (!user) return;
    try {
      for (const { id, sortOrder } of updates) {
        await setDoc(doc(db, 'releases', id), { sortOrder }, { merge: true });
      }
    } catch (error) {
      toast.error('排序儲存失敗');
      handleFirestoreError(error, OperationType.WRITE, 'releases (sort)');
    }
  };

  return { releases, isLoading, error, addRelease, updateRelease, deleteRelease, toggleChecklist, linkItems, unlinkItem, unlinkItems, executeRelease, updateReleaseSortOrders };
}
