import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { Pet } from '../types';
import { getHappiness } from '../constants/petConstants';
import { feedPet, hatchEgg, abandonPet, namePet, purchaseCosmetic, equipCosmetic } from '../services/coinService';
import { toast } from 'sonner';
import type { CosmeticType } from '../constants/cosmeticsConstants';

export function usePet(user: FirebaseUser | null) {
  const [pet, setPet] = useState<Pet | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      const data = snap.data()?.pet ?? null;
      setPet(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const happiness = pet ? getHappiness(pet.lastFed) : 0;
  const isHappy = happiness > 60;

  const handleFeed = async () => {
    if (!user) return;
    const ok = await feedPet(user);
    if (ok) toast.success('🍖 餵食成功！寵物很開心！');
    else toast.error('金幣不足，需要 20 coins');
  };

  const handleHatch = async (rarity: 'common' | 'rare' | 'legendary') => {
    if (!user) return null;
    const newPet = await hatchEgg(user, rarity);
    if (!newPet) toast.error('金幣不足');
    return newPet;
  };

  const handleAbandon = async () => {
    if (!user) return;
    await abandonPet(user.uid);
    toast.success('已棄養寵物');
  };

  const handleName = async (name: string) => {
    if (!user || !name.trim()) return;
    try {
      await namePet(user.uid, name);
      toast.success('取名成功！');
    } catch {
      toast.error('取名失敗，請重試');
    }
  };

  const handlePurchaseCosmetic = async (cosmeticId: string, price: number, type: CosmeticType): Promise<boolean> => {
    if (!user) return false;
    const ok = await purchaseCosmetic(user, cosmeticId, price, type);
    if (ok) toast.success('購買成功！已自動裝備');
    else toast.error('購買失敗（金幣不足或已擁有）');
    return ok;
  };

  const handleEquipCosmetic = async (cosmeticId: string | null, type: CosmeticType) => {
    if (!user) return;
    await equipCosmetic(user.uid, cosmeticId, type);
  };

  return { pet, isLoading, happiness, isHappy, handleFeed, handleHatch, handleAbandon, handleName, handlePurchaseCosmetic, handleEquipCosmetic };
}
