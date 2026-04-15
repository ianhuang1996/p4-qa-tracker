import { useState, useEffect, useCallback } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch, addDoc, query } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { toast } from 'sonner';
import { QAItem, OperationType } from '../types';
import { createNotification, getUserIdByName } from '../services/notificationService';
import { handleFirestoreError } from '../utils/firestoreUtils';
import { awardCoins } from '../services/coinService';
import { STATUS } from '../constants';
import { QAItemSchema } from '../utils/schemas';
import { useQAComments } from './useQAComments';

export function useQAItems(user: FirebaseUser | null, isAuthReady: boolean) {
  const [data, setData] = useState<QAItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthReady || !user) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    const path = 'qa_items';
    const q = query(collection(db, path));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: QAItem[] = [];
      snapshot.forEach((doc) => {
        const result = QAItemSchema.safeParse({ id: doc.id, ...doc.data() });
        if (result.success) {
          items.push(result.data as QAItem);
        } else {
          console.warn(`[QA] Skipping malformed document ${doc.id}`, result.error.issues);
        }
      });
      // Client-side sort to ensure correct numerical order for IDs like QA-001, QA-100
      items.sort((a, b) => {
        const numA = parseInt(a.id.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.id.replace(/\D/g, ''), 10) || 0;
        return numB - numA; // Sort descending (newest first)
      });
      setData(items);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthReady, user]);

  useEffect(() => {
    if (isAuthReady && user) {
      const userRef = doc(db, 'users', user.uid);
      setDoc(userRef, {
        uid: user.uid,
        displayName: user.displayName || '匿名用戶',
        email: user.email,
        photoURL: user.photoURL,
        lastLogin: Date.now()
      }, { merge: true }).catch(err => {
        console.error('Failed to update user profile for:', user.uid, err);
      });
    }
  }, [isAuthReady, user]);

  const updateItem = async (itemId: string, updates: Partial<QAItem>, oldItem?: QAItem, silent?: boolean) => {
    if (!user) return;

    // Sanitize updates for Firestore (replace undefined with null or remove)
    const sanitizedUpdates: Record<string, unknown> = {};
    Object.entries(updates).forEach(([key, val]) => {
      sanitizedUpdates[key] = val === undefined ? null : val;
    });

    // Optimistic update
    const previousData = [...data];
    setData(prev => prev.map(item => item.id === itemId ? { ...item, ...sanitizedUpdates } : item));

    const path = `qa_items/${itemId}`;
    try {
      const docRef = doc(db, 'qa_items', itemId);
      await setDoc(docRef, sanitizedUpdates, { merge: true });

      if (!silent) toast.success('更新成功');

      // ── Coin awards ───────────────────────────────────────────
      // RD marks as ready-to-test → fix coins based on priority
      if (updates.currentFlow === STATUS.readyToTest && oldItem) {
        const priority = oldItem.priority || '-';
        if (priority === 'P0') awardCoins(user.uid, 'fix_p0', oldItem.id).catch(console.error);
        else if (priority === 'P1') awardCoins(user.uid, 'fix_p1', oldItem.id).catch(console.error);
        else if (priority === 'P2' || priority === 'P3') awardCoins(user.uid, 'fix_p2_p3', oldItem.id).catch(console.error);
      }
      // PM retest result
      if (updates.retestResult === 'passed') {
        awardCoins(user.uid, 'retest_pass', itemId).catch(console.error);
      } else if (updates.retestResult === 'failed') {
        awardCoins(user.uid, 'retest_fail', itemId).catch(console.error);
      }
      // ─────────────────────────────────────────────────────────

      // Auto-notify on status change
      if (oldItem && updates.currentFlow && updates.currentFlow !== oldItem.currentFlow) {
        // Notify assignee about status change
        const assigneeId = await getUserIdByName(oldItem.assignee);
        if (assigneeId && assigneeId !== user.uid) {
          await createNotification({
            userId: assigneeId,
            fromUserId: user.uid,
            fromUserName: user.displayName || '匿名',
            itemId,
            itemTitle: oldItem.title || oldItem.description.substring(0, 30),
            type: 'status_change',
            oldValue: oldItem.currentFlow,
            newValue: updates.currentFlow,
          }, user);
        }
        // Also notify author if different
        if (oldItem.authorUID && oldItem.authorUID !== user.uid && oldItem.authorUID !== assigneeId) {
          await createNotification({
            userId: oldItem.authorUID,
            fromUserId: user.uid,
            fromUserName: user.displayName || '匿名',
            itemId,
            itemTitle: oldItem.title || oldItem.description.substring(0, 30),
            type: 'status_change',
            oldValue: oldItem.currentFlow,
            newValue: updates.currentFlow,
          }, user);
        }
      }

      // Auto-notify on assignee change
      if (oldItem && updates.assignee && updates.assignee !== oldItem.assignee) {
        const newAssigneeId = await getUserIdByName(updates.assignee);
        if (newAssigneeId && newAssigneeId !== user.uid) {
          await createNotification({
            userId: newAssigneeId,
            fromUserId: user.uid,
            fromUserName: user.displayName || '匿名',
            itemId,
            itemTitle: oldItem.title || oldItem.description.substring(0, 30),
            type: 'assignment',
            newValue: updates.assignee,
          }, user);
        }
      }
    } catch (error) {
      setData(previousData); // Rollback
      toast.error('更新失敗');
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const addItem = async (item: QAItem) => {
    if (!user) return;
    const path = `qa_items/${item.id}`;
    try {
      const docRef = doc(db, 'qa_items', item.id);
      const itemToSave = {
        ...item,
        authorUID: user.uid,
        createdAt: Date.now()
      };
      await setDoc(docRef, itemToSave);
      toast.success('新增成功');
      awardCoins(user.uid, 'file_bug', item.id).catch(console.error);
    } catch (error) {
      toast.error('新增失敗');
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!user) return;
    const path = `qa_items/${itemId}`;
    try {
      await deleteDoc(doc(db, 'qa_items', itemId));
      toast.success('刪除成功');
    } catch (error) {
      toast.error('刪除失敗');
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const getItem = useCallback((itemId: string) => data.find(i => i.id === itemId), [data]);
  const { addComment, deleteComment, editComment } = useQAComments(user, getItem);

  const bulkDelete = async (itemIds: string[]) => {
    if (!user || itemIds.length === 0) return;
    const batch = writeBatch(db);
    itemIds.forEach(id => {
      batch.delete(doc(db, 'qa_items', id));
    });
    try {
      await batch.commit();
      toast.success(`已刪除 ${itemIds.length} 個項目`);
    } catch (error) {
      toast.error('批次刪除失敗');
      handleFirestoreError(error, OperationType.DELETE, 'qa_items (bulk delete)');
    }
  };

  const bulkUpdate = async (itemIds: string[], updates: Partial<QAItem>) => {
    if (!user || itemIds.length === 0) return;
    const sanitized: Record<string, unknown> = {};
    Object.entries(updates).forEach(([key, val]) => {
      sanitized[key] = val === undefined ? null : val;
    });
    const batch = writeBatch(db);
    itemIds.forEach(id => {
      const docRef = doc(db, 'qa_items', id);
      batch.update(docRef, sanitized);
    });
    try {
      await batch.commit();
      toast.success(`已更新 ${itemIds.length} 個項目`);
    } catch (error) {
      toast.error('批次更新失敗');
      handleFirestoreError(error, OperationType.WRITE, 'qa_items (bulk)');
    }
  };

  return {
    data,
    isLoading,
    updateItem,
    addItem,
    deleteItem,
    addComment,
    deleteComment,
    editComment,
    bulkUpdate,
    bulkDelete
  };
}
