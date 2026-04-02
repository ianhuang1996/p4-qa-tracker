import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, orderBy, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { Notification } from '../types';

export function useNotifications(user: FirebaseUser | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: Notification[] = [];
      let unread = 0;
      snapshot.forEach((doc) => {
        const data = doc.data() as Notification;
        notifs.push({ ...data, id: doc.id });
        if (!data.isRead) unread++;
      });
      // Sort client-side
      notifs.sort((a, b) => b.createdAt - a.createdAt);
      setNotifications(notifs);
      setUnreadCount(unread);
    }, (error) => {
      console.error('Error fetching notifications for user:', user.uid, error);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    try {
      const docRef = doc(db, 'notifications', notificationId);
      await updateDoc(docRef, { isRead: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user || unreadCount === 0) return;
    const batch = writeBatch(db);
    notifications.forEach(notif => {
      if (!notif.isRead) {
        const docRef = doc(db, 'notifications', notif.id);
        batch.update(docRef, { isRead: true });
      }
    });
    try {
      await batch.commit();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const docRef = doc(db, 'notifications', notificationId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
  };
}
