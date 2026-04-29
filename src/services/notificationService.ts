import { db } from '../firebase';
import { collection, addDoc, getDocs, getDoc, doc, setDoc, query, where } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { Notification } from '../types';
import { MEMBER_TO_EMAIL, RDS, DEFAULT_DISPLAY_NAME } from '../constants';
import { getTodayStr } from '../utils/qaUtils';

const userIdCache = new Map<string, Promise<string | null>>();

export const getUserIdByName = (name: string): Promise<string | null> => {
  if (!name || name === 'Unassigned') return Promise.resolve(null);
  const cached = userIdCache.get(name);
  if (cached) return cached;
  const email = MEMBER_TO_EMAIL[name];
  if (!email) return Promise.resolve(null);
  const promise = (async () => {
    try {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) return snapshot.docs[0].id;
    } catch (error) {
      console.warn('Error finding user by email:', error);
      userIdCache.delete(name); // allow retry on failure
    }
    return null;
  })();
  userIdCache.set(name, promise);
  return promise;
};

export const sendSlackNotification = async (
  recipientEmail: string,
  message: string,
  itemId: string,
  itemTitle: string,
  type: string
): Promise<void> => {
  try {
    const { authedFetch } = await import('./apiClient');
    await authedFetch('/api/slack/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientEmail, message, itemId, itemTitle, type }),
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
      const typeLabels: Record<Notification['type'], string> = {
        status_change: `${notification.fromUserName} 將狀態從 ${notification.oldValue} → ${notification.newValue}`,
        assignment: `${notification.fromUserName} 將此項目指派給你`,
        comment: `${notification.fromUserName} 留言了`,
        team_notify: `${notification.fromUserName} 發出全隊通知`,
      };
      const message = typeLabels[notification.type];
      sendSlackNotification(recipientEmail, message, notification.itemId, notification.itemTitle, notification.type);
    }
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};

// ─── Team Notify (squawk pet buff) ───────────────────────────────
// Sends in-app notifications to all team members for a given item.
// Limited to 1 per day per user.
export const sendTeamNotify = async (
  sender: FirebaseUser,
  item: { id: string; title?: string; description: string },
): Promise<{ success: boolean; reason?: string }> => {
  const today = getTodayStr();
  const userRef = doc(db, 'users', sender.uid);

  try {
    const snap = await getDoc(userRef);
    if (snap.data()?.lastTeamNotifyDate === today) {
      return { success: false, reason: '今日已使用全隊通知（每天限 1 次）' };
    }

    const itemTitle = item.title || item.description.substring(0, 30);

    // Batch-resolve all recipient emails → UIDs in one query instead of N queries
    const recipientEmails = RDS
      .filter(n => n !== 'Unassigned')
      .map(n => MEMBER_TO_EMAIL[n])
      .filter(Boolean);
    const usersSnap = await getDocs(query(collection(db, 'users'), where('email', 'in', recipientEmails)));
    const emailToUid = Object.fromEntries(usersSnap.docs.map(d => [d.data().email as string, d.id]));

    await Promise.all(
      recipientEmails.map(email => {
        const recipientId = emailToUid[email];
        if (!recipientId || recipientId === sender.uid) return Promise.resolve();
        return addDoc(collection(db, 'notifications'), {
          userId: recipientId,
          fromUserId: sender.uid,
          fromUserName: sender.displayName || DEFAULT_DISPLAY_NAME,
          itemId: item.id,
          itemTitle,
          type: 'team_notify',
          isRead: false,
          createdAt: Date.now(),
        });
      })
    );

    await setDoc(userRef, { lastTeamNotifyDate: today }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('sendTeamNotify failed:', error);
    return { success: false, reason: '發送失敗，請稍後再試' };
  }
};
