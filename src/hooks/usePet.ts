import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { Pet } from '../types';
import { getHappiness } from '../constants/petConstants';
import { feedPet, hatchEgg, abandonPet, namePet } from '../services/coinService';
import { toast } from 'sonner';

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
    await namePet(user.uid, name);
  };

  return { pet, isLoading, happiness, isHappy, handleFeed, handleHatch, handleAbandon, handleName };
}
