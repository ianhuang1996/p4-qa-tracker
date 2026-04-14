import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, query, where, orderBy, limit as fbLimit } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { toast } from 'sonner';
import { DailyReport, OperationType } from '../types';
import { handleFirestoreError } from '../utils/firestoreUtils';
import { awardCoins } from '../services/coinService';

export function useDailyReport(user: FirebaseUser | null, date: string) {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [recentReports, setRecentReports] = useState<DailyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current day's report
  useEffect(() => {
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);
    const docId = `${user.uid}_${date}`;
    const unsubscribe = onSnapshot(doc(db, 'daily_reports', docId), (snapshot) => {
      if (snapshot.exists()) {
        setReport({ id: snapshot.id, ...snapshot.data() } as DailyReport);
      } else {
        setReport(null);
      }
      setIsLoading(false);
    }, (error) => {
      console.error('Failed to fetch daily report:', error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user, date]);

  // Fetch recent 7 days
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'daily_reports'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc'),
      fbLimit(7)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: DailyReport[] = [];
      snapshot.forEach(d => items.push({ id: d.id, ...d.data() } as DailyReport));
      setRecentReports(items);
    });
    return () => unsubscribe();
  }, [user]);

  const saveReport = async (completed: string, inProgress: string, risks: string) => {
    if (!user) return;
    const docId = `${user.uid}_${date}`;
    const isNew = !report;
    try {
      await setDoc(doc(db, 'daily_reports', docId), {
        date,
        userId: user.uid,
        completed,
        inProgress,
        risks,
        createdAt: report?.createdAt || Date.now(),
        updatedAt: Date.now(),
      });
      toast.success('進度報告已儲存');
      if (isNew) awardCoins(user.uid, 'daily_report', date).catch(console.error);
    } catch (error) {
      toast.error('儲存失敗');
      handleFirestoreError(error, OperationType.WRITE, `daily_reports/${docId}`);
    }
  };

  return { report, recentReports, isLoading, saveReport };
}
