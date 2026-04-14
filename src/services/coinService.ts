import { db } from '../firebase';
import { doc, setDoc, addDoc, collection, increment, getDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { CoinReason, Pet } from '../types';
import { COIN_REWARDS, getLevel, getStage, PETS_BY_RARITY } from '../constants/petConstants';

// ─── Award Coins (atomic) ────────────────────────────────────────
export async function awardCoins(
  userId: string,
  reason: CoinReason,
  note?: string,
  overrideAmount?: number,
) {
  const amount = overrideAmount ?? COIN_REWARDS[reason];
  if (amount <= 0) return;

  const userRef = doc(db, 'users', userId);
  // Atomic increment — no race condition
  await setDoc(userRef, { coins: increment(amount) }, { merge: true });

  // Also give pet XP equal to coins earned
  await setDoc(userRef, { 'pet.xp': increment(amount) }, { merge: true });

  // Recalculate and store level/stage synchronously after XP update
  const snap = await getDoc(userRef);
  const petData = snap.data()?.pet as Pet | undefined;
  if (petData) {
    const newXp = (petData.xp ?? 0) + amount;
    const newLevel = getLevel(newXp);
    const newStage = getStage(newLevel);
    if (newLevel !== petData.level || newStage !== petData.stage) {
      await setDoc(userRef, { 'pet.level': newLevel, 'pet.stage': newStage }, { merge: true });
    }
  }

  // Log transaction
  await addDoc(collection(db, 'users', userId, 'coinTransactions'), {
    amount,
    reason,
    note: note ?? null,
    timestamp: Date.now(),
  });
}

// ─── Spend Coins ────────────────────────────────────────────────
export async function spendCoins(userId: string, amount: number, reason: string): Promise<boolean> {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  const current = snap.data()?.coins ?? 0;
  if (current < amount) return false;

  await setDoc(userRef, { coins: increment(-amount) }, { merge: true });
  await addDoc(collection(db, 'users', userId, 'coinTransactions'), {
    amount: -amount,
    reason,
    timestamp: Date.now(),
  });
  return true;
}

// ─── Hatch Egg ──────────────────────────────────────────────────
export async function hatchEgg(user: FirebaseUser, rarity: 'common' | 'rare' | 'legendary'): Promise<Pet | null> {
  const success = await spendCoins(user.uid, { common: 100, rare: 300, legendary: 800 }[rarity], `hatch_${rarity}_egg`);
  if (!success) return null;

  const pool = PETS_BY_RARITY[rarity];
  const typeId = pool[Math.floor(Math.random() * pool.length)] as Pet['typeId'];

  const pet: Omit<Pet, 'name'> & { name: string } = {
    typeId,
    name: '',
    xp: 0,
    level: 1,
    stage: 'baby',
    lastFed: Date.now(),
    hatchedAt: Date.now(),
    eggRarity: rarity,
  };

  const userRef = doc(db, 'users', user.uid);
  await setDoc(userRef, { pet }, { merge: true });
  return pet;
}

// ─── Feed Pet ───────────────────────────────────────────────────
export async function feedPet(user: FirebaseUser): Promise<boolean> {
  const success = await spendCoins(user.uid, 20, 'feed_pet');
  if (!success) return false;

  const userRef = doc(db, 'users', user.uid);
  await setDoc(userRef, { 'pet.lastFed': Date.now() }, { merge: true });
  return true;
}

// ─── Abandon Pet ────────────────────────────────────────────────
export async function abandonPet(userId: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, { pet: null }, { merge: true });
}

// ─── Name Pet ───────────────────────────────────────────────────
export async function namePet(userId: string, name: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, { 'pet.name': name.trim() }, { merge: true });
}

// ─── History Retroactive Scan ────────────────────────────────────
// Scans historical records and awards 2x coins once per user.
export async function awardHistoryCoins(user: FirebaseUser): Promise<number> {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  if (snap.data()?.historyCoinAwarded) return 0; // already done

  let total = 0;

  // Count daily reports (userId field)
  const reportsQuery = query(
    collection(db, 'daily_reports'),
    where('userId', '==', user.uid),
  );
  const reportsSnap = await getDocs(reportsQuery);
  const reportCoins = reportsSnap.size * COIN_REWARDS.daily_report * 2;
  total += reportCoins;

  // Count QA items filed (authorUID field)
  const qaQuery = query(
    collection(db, 'qa_items'),
    where('authorUID', '==', user.uid),
  );
  const qaSnap = await getDocs(qaQuery);
  const bugCoins = qaSnap.size * COIN_REWARDS.file_bug * 2;
  total += bugCoins;

  // Count releases published (createdBy == uid, status == released)
  const releasesQuery = query(
    collection(db, 'releases'),
    where('createdBy', '==', user.uid),
    where('status', '==', 'released'),
  );
  const releasesSnap = await getDocs(releasesQuery);
  const releaseCoins = releasesSnap.size * COIN_REWARDS.release_publish * 2;
  total += releaseCoins;

  if (total > 0) {
    await setDoc(userRef, { coins: increment(total), historyCoinAwarded: true }, { merge: true });
    await addDoc(collection(db, 'users', user.uid, 'coinTransactions'), {
      amount: total,
      reason: 'history_retroactive' as CoinReason,
      note: `歷史回溯：${reportsSnap.size} 篇日報 + ${qaSnap.size} 個 Bug + ${releasesSnap.size} 次版更 (2x)`,
      timestamp: Date.now(),
    });
  } else {
    // Mark as done even if no coins
    await setDoc(userRef, { historyCoinAwarded: true }, { merge: true });
  }

  return total;
}
