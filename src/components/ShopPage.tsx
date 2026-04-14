import React, { useState } from 'react';
import { ShoppingBag, Coins } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { toast } from 'sonner';
import { useCoins } from '../hooks/useCoins';
import { usePet } from '../hooks/usePet';
import { EGG_DEFS, PETS_BY_RARITY, PET_DEFS, RARITY_LABEL, RARITY_COLOR, REASON_LABEL } from '../constants/petConstants';
import { PetGuide } from './PetGuide';
import type { PetRarity } from '../types';

interface ShopPageProps {
  user: FirebaseUser;
  onNavigateToPet: () => void;
}

export const ShopPage: React.FC<ShopPageProps> = ({ user, onNavigateToPet }) => {
  const { coins, transactions } = useCoins(user);
  const { pet, handleHatch } = usePet(user);
  const [hatchingRarity, setHatchingRarity] = useState<PetRarity | null>(null);
  const [revealed, setRevealed] = useState<{ emoji: string; name: string; rarity: PetRarity } | null>(null);

  const handleBuyEgg = async (rarity: PetRarity) => {
    if (pet) {
      alert('你已經有一隻寵物了！請先棄養後再孵蛋。');
      return;
    }
    setHatchingRarity(rarity);
    setRevealed(null);
    try {
      const newPet = await handleHatch(rarity);
      if (newPet) {
        const def = PET_DEFS[newPet.typeId];
        setRevealed({ emoji: def.emoji, name: def.name, rarity });
      }
    } catch (err) {
      console.error('Hatch failed:', err);
      toast.error('孵化失敗，請重試');
    } finally {
      setHatchingRarity(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Coin balance */}
      <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-2xl p-4 w-fit">
        <span className="text-2xl">🪙</span>
        <div>
          <p className="text-xs text-yellow-700 font-medium">我的金幣</p>
          <p className="text-2xl font-black text-yellow-800">{coins.toLocaleString()}</p>
        </div>
      </div>

      {/* Egg shop */}
      <section>
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <ShoppingBag size={20} className="text-blue-500" />
          寵物蛋商店
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {EGG_DEFS.map(egg => {
            const canAfford = coins >= egg.price;
            const pool = PETS_BY_RARITY[egg.rarity];
            return (
              <div key={egg.rarity} className={`rounded-2xl border-2 p-5 flex flex-col items-center gap-3 ${egg.color}`}>
                <span className="text-5xl">{egg.emoji}</span>
                <div className="text-center">
                  <p className="font-bold text-lg">{egg.name}</p>
                  <p className="text-xs opacity-70 mt-0.5">可能孵出 {pool.length} 種寵物</p>
                </div>
                <div className="flex flex-wrap gap-1 justify-center">
                  {pool.map(id => (
                    <span key={id} className="text-base" title={PET_DEFS[id].name}>{PET_DEFS[id].emoji}</span>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 font-black text-lg">
                  <span>🪙</span>
                  <span>{egg.price}</span>
                </div>
                <button
                  onClick={() => handleBuyEgg(egg.rarity)}
                  disabled={!canAfford || hatchingRarity !== null}
                  className={`w-full py-2 rounded-xl font-bold text-sm transition-all ${
                    canAfford && hatchingRarity === null
                      ? 'bg-gray-800 text-white hover:bg-gray-700 active:scale-95'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {hatchingRarity !== null
                    ? (hatchingRarity === egg.rarity ? '孵化中…' : '請等待孵化完成')
                    : (canAfford ? '購買孵化' : '金幣不足')}
                </button>
              </div>
            );
          })}
        </div>
        {pet && (
          <p className="mt-3 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            你目前已有寵物 {PET_DEFS[pet.typeId]?.emoji}，請先至寵物頁棄養後才能購買新蛋。
          </p>
        )}
      </section>

      {/* Hatching loading overlay */}
      {hatchingRarity !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 flex flex-col items-center gap-4 max-w-xs w-full shadow-2xl">
            <span className="text-7xl animate-bounce">
              {EGG_DEFS.find(e => e.rarity === hatchingRarity)?.emoji ?? '🥚'}
            </span>
            <p className="text-lg font-bold text-gray-700">孵化中…</p>
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hatch reveal overlay */}
      {revealed && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setRevealed(null)}
        >
          <div className="bg-white rounded-3xl p-8 flex flex-col items-center gap-4 max-w-xs w-full shadow-2xl animate-bounce-in" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">孵化成功！</p>
            <span className="text-8xl">{revealed.emoji}</span>
            <div className="text-center">
              <p className="text-2xl font-black text-gray-800">{revealed.name}</p>
              <span className={`inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-full border ${RARITY_COLOR[revealed.rarity]}`}>
                {RARITY_LABEL[revealed.rarity]}
              </span>
            </div>
            <p className="text-xs text-gray-500 text-center">點擊任意處關閉，然後前往寵物頁為牠取名吧！</p>
            <button
              onClick={() => { setRevealed(null); onNavigateToPet(); }}
              className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 transition-colors"
            >
              去看我的寵物
            </button>
          </div>
        </div>
      )}

      {/* Tutorial */}
      <PetGuide />

      {/* Recent transactions */}
      <section>
        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Coins size={20} className="text-yellow-500" />
          最近交易紀錄
        </h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-gray-400">尚無交易紀錄</p>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">{tx.note || REASON_LABEL[tx.reason] || tx.reason}</p>
                  <p className="text-xs text-gray-400">{new Date(tx.timestamp).toLocaleString('zh-TW', { dateStyle: 'short', timeStyle: 'short' })}</p>
                </div>
                <span className={`text-sm font-bold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {tx.amount >= 0 ? '+' : ''}{tx.amount} 🪙
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
