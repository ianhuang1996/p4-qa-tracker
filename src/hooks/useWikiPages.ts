import { useMemo } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc, addDoc, query, orderBy } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { toast } from 'sonner';
import { WikiPage, WikiCategory, OperationType } from '../types';
import { handleFirestoreError } from '../utils/firestoreUtils';
import { awardCoins } from '../services/coinService';
import { useFirestoreCollection } from './useFirestoreCollection';

const COLLECTION = 'wiki_pages';

export function useWikiPages(user: FirebaseUser | null) {
  const q = useMemo(
    () => user ? query(collection(db, COLLECTION), orderBy('updatedAt', 'desc')) : null,
    [user],
  );

  const { data: pages, isLoading, error } = useFirestoreCollection(
    q,
    (d) => ({ id: d.id, ...d.data() } as WikiPage),
    COLLECTION,
  );

  const addPage = async (title: string, category: WikiCategory) => {
    if (!user) return null;
    try {
      const ref = await addDoc(collection(db, COLLECTION), {
        title,
        content: '',
        category,
        createdBy: user.uid,
        createdByName: user.displayName || '匿名',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        updatedBy: user.uid,
        updatedByName: user.displayName || '匿名',
      });
      toast.success('頁面已建立');
      awardCoins(user.uid, 'create_wiki', title).catch(console.error);
      return ref.id;
    } catch (error) {
      toast.error('建立失敗');
      handleFirestoreError(error, OperationType.WRITE, COLLECTION);
    }
  };

  const updatePage = async (pageId: string, updates: Partial<WikiPage>) => {
    if (!user) return;
    const sanitized: Record<string, unknown> = {};
    Object.entries(updates).forEach(([key, val]) => {
      sanitized[key] = val === undefined ? null : val;
    });
    sanitized.updatedAt = Date.now();
    sanitized.updatedBy = user.uid;
    sanitized.updatedByName = user.displayName || '匿名';
    try {
      await setDoc(doc(db, COLLECTION, pageId), sanitized, { merge: true });
    } catch (error) {
      toast.error('儲存失敗');
      handleFirestoreError(error, OperationType.WRITE, `${COLLECTION}/${pageId}`);
    }
  };

  const deletePage = async (pageId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, COLLECTION, pageId));
      toast.success('頁面已刪除');
    } catch (error) {
      toast.error('刪除失敗');
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTION}/${pageId}`);
    }
  };

  return { pages, isLoading, error, addPage, updatePage, deletePage };
}
