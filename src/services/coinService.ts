import { db } from '../firebase';
import { doc, setDoc, addDoc, collection, increment, getDoc, updateDoc, runTransaction, query, where, getDocs } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { CoinReason, Pet, PetRarity } from '../types';
import { COIN_REWARDS, getLevel, getStage, PETS_BY_RARITY, getEggPrice, FEED_COST } from '../constants/petConstants';
import { RELEASE_STATUS } from '../constants';

// ─── Internal: fire-and-forget transaction log ───────────────────
function logTx(userId: string, amount: number, reason: string, note?: string | null) {
  addDoc(collection(db, 'users', userId, 'coinTransactions'), {
    amount,
    reason,
    note: note ?? null,
    timestamp: Date.now(),
  }).catch(() => {});
}

// ─── Award Coins ─────────────────────────────────────────────────
// Atomically increments coins + pet XP in one transaction so
// an in-flight pet abandon can never cause a split-brain update.
export async function awardCoins(
  userId: string,
  reason: CoinReason,
  note?: string,
  overrideAmount?: number,
) {
  const amount = overrideAmount ?? COIN_REWARDS[reason];
  if (amount <= 0) return;

  const userRef = doc(db, 'users', userId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    const petData = snap.data()?.pet as Pet | undefined;

    const updates: Record<string, unknown> = { coins: increment(amount) };
    if (petData) {
      const newXp = (petData.xp ?? 0) + amount;
      const newLevel = getLevel(newXp);
      const newStage = getStage(newLevel);
      updates['pet.xp'] = increment(amount);
      if (newLevel !== petData.level) updates['pet.level'] = newLevel;
      if (newStage !== petData.stage) updates['pet.stage'] = newStage;
    }
    // Must use update (not set+merge) so dot-notation paths resolve to nested fields
    if (snap.exists()) {
      tx.update(userRef, updates);
    } else {
      // New user doc: no pet yet, updates only contains { coins } — set+merge is safe here
      tx.set(userRef, updates, { merge: true });
    }
  });

  logTx(userId, amount, reason, note);
}

// ─── Hatch Egg ───────────────────────────────────────────────────
// Single transaction: check balance + write pet atomically.
// No window between coin deduction and pet creation.
export async function hatchEgg(user: FirebaseUser, rarity: PetRarity): Promise<Pet | null> {
  const cost = getEggPrice(rarity);
  const pool = PETS_BY_RARITY[rarity];
  const typeId = pool[Math.floor(Math.random() * pool.length)] as Pet['typeId'];
  const pet: Pet = {
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
  const success = await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    const current = snap.data()?.coins ?? 0;
    if (current < cost) return false;
    tx.set(userRef, { coins: increment(-cost), pet }, { merge: true });
    return true;
  });

  if (!success) return null;
  logTx(user.uid, -cost, `hatch_${rarity}_egg`);
  return pet;
}

// ─── Feed Pet ────────────────────────────────────────────────────
// Single transaction: check balance + update lastFed atomically.
export async function feedPet(user: FirebaseUser): Promise<boolean> {
  const userRef = doc(db, 'users', user.uid);
  const success = await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    const current = snap.data()?.coins ?? 0;
    if (current < FEED_COST) return false;
    tx.update(userRef, { coins: increment(-FEED_COST), 'pet.lastFed': Date.now() });
    return true;
  });
  if (success) logTx(user.uid, -FEED_COST, 'feed_pet');
  return success;
}

// ─── Abandon Pet ─────────────────────────────────────────────────
export async function abandonPet(userId: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, { pet: null }, { merge: true });
}

// ─── Name Pet ────────────────────────────────────────────────────
export async function namePet(userId: string, name: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { 'pet.name': name.trim() });
}

// ─── One-time Launch Bonus ───────────────────────────────────────
export async function applyLaunchBonus(userId: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  if (snap.data()?.launchBonusApplied) return;
  await setDoc(userRef, { coins: increment(800), launchBonusApplied: true }, { merge: true });
}

// ─── History Retroactive Scan ────────────────────────────────────
export async function awardHistoryCoins(user: FirebaseUser): Promise<number> {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  if (snap.data()?.historyCoinAwarded) return 0;

  const [reportsSnap, qaSnap, releasesSnap] = await Promise.all([
    getDocs(query(collection(db, 'daily_reports'), where('userId', '==', user.uid))),
    getDocs(query(collection(db, 'qa_items'), where('authorUID', '==', user.uid))),
    getDocs(query(collection(db, 'releases'), where('createdBy', '==', user.uid), where('status', '==', RELEASE_STATUS.RELEASED))),
  ]);

  const total =
    reportsSnap.size * COIN_REWARDS.daily_report * 2 +
    qaSnap.size * COIN_REWARDS.file_bug * 2 +
    releasesSnap.size * COIN_REWARDS.release_publish * 2;

  await setDoc(userRef, { coins: increment(total), historyCoinAwarded: true }, { merge: true });
  if (total > 0) {
    logTx(user.uid, total, 'history_retroactive',
      `歷史回溯：${reportsSnap.size} 篇日報 + ${qaSnap.size} 個 Bug + ${releasesSnap.size} 次版更 (2x)`);
  }

  return total;
}
