import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { CoinTransaction } from '../types';
import { awardHistoryCoins, applyLaunchBonus } from '../services/coinService';

export function useCoins(user: FirebaseUser | null) {
  const [coins, setCoins] = useState(0);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [historyChecked, setHistoryChecked] = useState(false);

  // Listen to user's coin balance
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      setCoins(snap.data()?.coins ?? 0);
    });
    return () => unsubscribe();
  }, [user]);

  // Listen to recent transactions (last 20)
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'coinTransactions'),
      orderBy('timestamp', 'desc'),
      limit(20),
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const items: CoinTransaction[] = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() } as CoinTransaction));
      setTransactions(items);
    });
    return () => unsubscribe();
  }, [user]);

  // One-time history retroactive award + launch bonus (sequential to avoid concurrent double-award)
  useEffect(() => {
    if (!user || historyChecked) return;
    setHistoryChecked(true);
    (async () => {
      try { await awardHistoryCoins(user); } catch (e) { console.error(e); }
      try { await applyLaunchBonus(user.uid); } catch (e) { console.error(e); }
    })();
  }, [user, historyChecked]);

  return { coins, transactions };
}
