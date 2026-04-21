import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, query, orderBy, writeBatch } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { toast } from 'sonner';
import { Decision } from '../types';
import { EMAIL_TO_MEMBER, DEFAULT_DISPLAY_NAME } from '../constants';

export function useDecisions(user: FirebaseUser | null) {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'decisions'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setDecisions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Decision)));
      setIsLoading(false);
    }, (err) => {
      console.error('Load decisions failed:', err);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const addDecision = async (data: Omit<Decision, 'id' | 'createdAt' | 'createdBy' | 'createdByName' | 'status' | 'supersededById'>) => {
    if (!user) return;
    const createdByName = (user.email && EMAIL_TO_MEMBER[user.email]) || user.displayName || DEFAULT_DISPLAY_NAME;

    const sanitized = Object.fromEntries(
      Object.entries({
        ...data,
        status: 'active' as const,
        createdBy: user.uid,
        createdByName,
        createdAt: Date.now(),
      }).filter(([, v]) => v !== undefined)
    );

    try {
      // If this decision supersedes another, use batch write to update both atomically
      if (data.supersedesId) {
        const batch = writeBatch(db);
        const newRef = doc(collection(db, 'decisions'));
        batch.set(newRef, sanitized);
        batch.update(doc(db, 'decisions', data.supersedesId), {
          status: 'superseded',
          supersededById: newRef.id,
          updatedAt: Date.now(),
        });
        await batch.commit();
      } else {
        await addDoc(collection(db, 'decisions'), sanitized);
      }
      toast.success('決策已記錄');
    } catch (error) {
      console.error('addDecision failed:', error);
      toast.error(`記錄失敗：${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  };

  const updateDecision = async (id: string, updates: Partial<Decision>) => {
    const sanitized = Object.fromEntries(
      Object.entries({ ...updates, updatedAt: Date.now() }).filter(([, v]) => v !== undefined)
    );
    try {
      await updateDoc(doc(db, 'decisions', id), sanitized);
    } catch (error) {
      console.error('updateDecision failed:', error);
      toast.error('更新失敗');
    }
  };

  const deleteDecision = async (id: string) => {
    try {
      // If this decision had superseded another, restore that one to active
      const target = decisions.find(d => d.id === id);
      const batch = writeBatch(db);
      batch.delete(doc(db, 'decisions', id));
      if (target?.supersedesId) {
        const parent = decisions.find(d => d.id === target.supersedesId);
        if (parent?.supersededById === id) {
          batch.update(doc(db, 'decisions', target.supersedesId), {
            status: 'active',
            supersededById: null,
            updatedAt: Date.now(),
          });
        }
      }
      await batch.commit();
      toast.success('已刪除');
    } catch (error) {
      console.error('deleteDecision failed:', error);
      toast.error('刪除失敗');
    }
  };

  return { decisions, isLoading, addDecision, updateDecision, deleteDecision };
}
