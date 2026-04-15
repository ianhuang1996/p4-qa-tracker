import { useCallback } from 'react';
import { db, auth } from '../firebase';
import { collection, doc, setDoc, deleteDoc, addDoc, increment } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { QAItem, OperationType } from '../types';
import { parseMentions } from '../utils/mentionUtils';
import { createNotification, getUserIdByName } from '../services/notificationService';
import { handleFirestoreError } from '../utils/firestoreUtils';

/**
 * Comment CRUD for QA items.
 *
 * `getItem` is a stable lookup into the parent hook's items array — pass
 * it via `useCallback` to avoid unnecessary re-creations.
 */
export function useQAComments(
  user: FirebaseUser | null,
  getItem: (itemId: string) => QAItem | undefined,
) {
  const addComment = useCallback(async (itemId: string, text: string) => {
    if (!user || !text.trim()) return;
    const path = `qa_items/${itemId}/comments`;
    try {
      const commentsRef = collection(db, 'qa_items', itemId, 'comments');
      await addDoc(commentsRef, {
        userId: user.uid,
        userName: user.displayName || '匿名用戶',
        text: text.trim(),
        createdAt: Date.now(),
      });

      await setDoc(doc(db, 'qa_items', itemId), { commentCount: increment(1) }, { merge: true });

      const item = getItem(itemId);
      if (item?.authorUID && item.authorUID !== user.uid) {
        await createNotification({
          userId: item.authorUID,
          fromUserId: user.uid,
          fromUserName: user.displayName || '匿名用戶',
          itemId,
          itemTitle: item.title || item.description.substring(0, 30),
          type: 'comment',
          newValue: text.trim(),
        }, user);
      }

      const mentions = parseMentions(text);
      for (const name of mentions) {
        const mentionedUserId = await getUserIdByName(name);
        if (mentionedUserId && mentionedUserId !== user.uid && mentionedUserId !== item?.authorUID) {
          await createNotification({
            userId: mentionedUserId,
            fromUserId: user.uid,
            fromUserName: user.displayName || '匿名用戶',
            itemId,
            itemTitle: item?.title || item?.description.substring(0, 30) || itemId,
            type: 'comment',
            newValue: `提及了你: ${text.trim().substring(0, 50)}`,
          }, user);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }, [user, getItem]);

  const deleteComment = useCallback(async (itemId: string, commentId: string) => {
    const path = `qa_items/${itemId}/comments/${commentId}`;
    try {
      await deleteDoc(doc(db, 'qa_items', itemId, 'comments', commentId));
      await setDoc(doc(db, 'qa_items', itemId), { commentCount: increment(-1) }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }, []);

  const editComment = useCallback(async (itemId: string, commentId: string, newText: string) => {
    const path = `qa_items/${itemId}/comments/${commentId}`;
    try {
      await setDoc(doc(db, 'qa_items', itemId, 'comments', commentId), {
        text: newText.trim(),
        updatedAt: Date.now(),
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }, []);

  return { addComment, deleteComment, editComment };
}
