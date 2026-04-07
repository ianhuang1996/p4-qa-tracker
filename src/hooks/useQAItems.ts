import { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch, addDoc, query, orderBy, getDocFromServer, where, getDocs, limit, increment } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { toast } from 'sonner';
import { QAItem, QAComment } from '../data';
import { parseMentions } from '../utils/mentionUtils';
import { AugmentedQAItem, OperationType, HistoryEntry, Notification } from '../types';

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

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
        items.push(doc.data() as QAItem);
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
      console.log('Updating user profile for:', user.uid);
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

  const getUserIdByName = async (name: string): Promise<string | null> => {
    if (!name || name === 'Unassigned') return null;
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('displayName', '==', name));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].id;
      }
    } catch (error) {
      console.error('Error finding user by name:', error);
    }
    return null;
  };

  const createNotification = async (notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => {
    if (notification.userId === user?.uid) return; // Don't notify self
    try {
      const notificationRef = collection(db, 'notifications');
      await addDoc(notificationRef, {
        ...notification,
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
        isRead: false,
        createdAt: Date.now()
      });
    } catch (error) {
      console.error('Failed to create notification:', error);
    }
  };

  const updateItem = async (itemId: string, updates: Partial<QAItem>, oldItem?: QAItem, silent?: boolean) => {
    if (!user) return;

    // Sanitize updates for Firestore (replace undefined with null or remove)
    const sanitizedUpdates: any = {};
    Object.keys(updates).forEach(key => {
      const val = (updates as any)[key];
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

  const addComment = async (itemId: string, text: string) => {
    if (!user || !text.trim()) return;
    const path = `qa_items/${itemId}/comments`;
    try {
      const commentsRef = collection(db, 'qa_items', itemId, 'comments');
      await addDoc(commentsRef, {
        userId: user.uid,
        userName: user.displayName || '匿名用戶',
        text: text.trim(),
        createdAt: Date.now()
      });

      // Update comment count on main document
      await setDoc(doc(db, 'qa_items', itemId), {
        commentCount: increment(1)
      }, { merge: true });

      // Notify the author of the item about the new comment
      const item = data.find(i => i.id === itemId);
      if (item && item.authorUID && item.authorUID !== user.uid) {
        await createNotification({
          userId: item.authorUID,
          fromUserId: user.uid,
          fromUserName: user.displayName || '匿名用戶',
          itemId: itemId,
          itemTitle: item.title || item.description.substring(0, 30),
          type: 'comment',
          newValue: text.trim()
        });
      }

      // Notify @mentioned users
      const mentions = parseMentions(text);
      for (const name of mentions) {
        const mentionedUserId = await getUserIdByName(name);
        if (mentionedUserId && mentionedUserId !== user.uid && mentionedUserId !== item?.authorUID) {
          await createNotification({
            userId: mentionedUserId,
            fromUserId: user.uid,
            fromUserName: user.displayName || '匿名用戶',
            itemId: itemId,
            itemTitle: item?.title || item?.description.substring(0, 30) || itemId,
            type: 'comment',
            newValue: `提及了你: ${text.trim().substring(0, 50)}`
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const deleteComment = async (itemId: string, commentId: string) => {
    const path = `qa_items/${itemId}/comments/${commentId}`;
    try {
      await deleteDoc(doc(db, 'qa_items', itemId, 'comments', commentId));
      
      // Update comment count on main document
      await setDoc(doc(db, 'qa_items', itemId), {
        commentCount: increment(-1)
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const editComment = async (itemId: string, commentId: string, newText: string) => {
    const path = `qa_items/${itemId}/comments/${commentId}`;
    try {
      await setDoc(doc(db, 'qa_items', itemId, 'comments', commentId), {
        text: newText.trim(),
        updatedAt: Date.now()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

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
