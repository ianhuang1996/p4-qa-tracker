import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { Notification } from '../types';

export const getUserIdByName = async (name: string): Promise<string | null> => {
  if (!name || name === 'Unassigned') return null;
  try {
    const q = query(collection(db, 'users'), where('displayName', '==', name));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) return snapshot.docs[0].id;
  } catch (error) {
    console.error('Error finding user by name:', error);
  }
  return null;
};

export const sendSlackNotification = async (
  email: string,
  message: string,
  itemId: string,
  itemTitle: string,
  type: string
): Promise<void> => {
  try {
    await fetch('/api/slack/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, message, itemId, itemTitle, type }),
    });
  } catch (error) {
    // Slack is best-effort, don't block the main flow
    console.error('Slack notification failed:', error);
  }
};

export const getUserEmailById = async (userId: string): Promise<string | null> => {
  try {
    const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', userId)));
    if (!userDoc.empty) {
      return userDoc.docs[0].data().email || null;
    }
  } catch (error) {
    console.error('Error getting user email:', error);
  }
  return null;
};

export const createNotification = async (
  notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>,
  currentUser: FirebaseUser
): Promise<void> => {
  if (notification.userId === currentUser.uid) return;
  try {
    await addDoc(collection(db, 'notifications'), {
      ...notification,
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      isRead: false,
      createdAt: Date.now(),
    });

    const recipientEmail = await getUserEmailById(notification.userId);
    if (recipientEmail) {
      const typeLabels: Record<string, string> = {
        status_change: `${notification.fromUserName} 將狀態從 ${notification.oldValue} → ${notification.newValue}`,
        assignment: `${notification.fromUserName} 將此項目指派給你`,
        comment: `${notification.fromUserName} 留言了`,
      };
      const message = typeLabels[notification.type] || '新通知';
      sendSlackNotification(recipientEmail, message, notification.itemId, notification.itemTitle, notification.type);
    }
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};
