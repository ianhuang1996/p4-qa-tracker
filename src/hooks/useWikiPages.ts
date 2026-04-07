import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, addDoc, query, orderBy } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { toast } from 'sonner';
import { WikiPage, WikiCategory } from '../types';

export function useWikiPages(user: FirebaseUser | null) {
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);
    const q = query(collection(db, 'wiki_pages'), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: WikiPage[] = [];
      snapshot.forEach(d => items.push({ id: d.id, ...d.data() } as WikiPage));
      setPages(items);
      setIsLoading(false);
    }, (error) => {
      console.error('Failed to fetch wiki pages:', error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const addPage = async (title: string, category: WikiCategory) => {
    if (!user) return null;
    try {
      const ref = await addDoc(collection(db, 'wiki_pages'), {
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
      return ref.id;
    } catch (error) {
      toast.error('建立失敗');
      console.error(error);
      return null;
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
      await setDoc(doc(db, 'wiki_pages', pageId), sanitized, { merge: true });
    } catch (error) {
      toast.error('儲存失敗');
      console.error(error);
    }
  };

  const deletePage = async (pageId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'wiki_pages', pageId));
      toast.success('頁面已刪除');
    } catch (error) {
      toast.error('刪除失敗');
      console.error(error);
    }
  };

  return { pages, isLoading, addPage, updatePage, deletePage };
}
