import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { toast } from 'sonner';
import { EGG_DEFS, PETS_BY_RARITY, PET_DEFS, RARITY_LABEL, RARITY_COLOR } from '../constants/petConstants';
import { COSMETICS_BY_TYPE, CosmeticType, CosmeticDef } from '../constants/cosmeticsConstants';
import { PetGuide } from './PetGuide';
import type { Pet, PetRarity } from '../types';

interface ShopDrawerProps {
  user: FirebaseUser;
  coins: number;
  pet: Pet | null;
  onHatch: (rarity: PetRarity) => Promise<Pet | null>;
  onPurchaseCosmetic: (cosmeticId: string, price: number, type: CosmeticType) => Promise<boolean>;
  onClose: () => void;
}

export const ShopDrawer: React.FC<ShopDrawerProps> = ({ coins, pet, onHatch, onPurchaseCosmetic, onClose }) => {
  const [hatchingRarity, setHatchingRarity] = useState<PetRarity | null>(null);
  const [revealed, setRevealed] = useState<{ emoji: string; name: string; rarity: PetRarity } | null>(null);

  const handleBuyEgg = async (rarity: PetRarity) => {
    if (pet) { toast.error('你已有寵物，請先棄養後再孵蛋'); return; }
    setHatchingRarity(rarity);
    setRevealed(null);
    try {
      const newPet = await onHatch(rarity);
      if (newPet) {
        const def = PET_DEFS[newPet.typeId];
        setRevealed({ emoji: def.emoji, name: def.name, rarity });
      }
    } catch {
      toast.error('孵化失敗，請重試');
    } finally {
      setHatchingRarity(null);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-800">🛍 寵物商店</h2>
            <p className="text-xs text-yellow-600 font-semibold mt-0.5">🪙 {coins.toLocaleString()} 可用</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="關閉商店"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Egg cards */}
          <section>
            <h3 className="text-sm font-bold text-gray-700 mb-3">選購寵物蛋</h3>
            <div className="space-y-3">
              {EGG_DEFS.map(egg => {
                const canAfford = coins >= egg.price;
                const pool = PETS_BY_RARITY[egg.rarity];
                const isHatching = hatchingRarity === egg.rarity;
                const isWaiting = hatchingRarity !== null && !isHatching;
                const btnLabel = isHatching ? '孵化中…'
                  : isWaiting ? '等待中'
                  : pet ? '已有寵物'
                  : canAfford ? '購買' : '不足';
                return (
                  <div key={egg.rarity} className={`rounded-2xl border-2 p-4 ${egg.color}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl shrink-0">{egg.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm">{egg.name}</p>
                          <span className="text-xs opacity-60">{pool.length} 種</span>
                        </div>
                        <div className="flex gap-0.5 mt-1">
                          {pool.map(id => (
                            <span key={id} title={PET_DEFS[id].name} className="text-sm">{PET_DEFS[id].emoji}</span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-black text-base">🪙 {egg.price}</p>
                        <button
                          onClick={() => handleBuyEgg(egg.rarity)}
                          disabled={!canAfford || !!pet || hatchingRarity !== null}
                          className={`mt-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            canAfford && !pet && hatchingRarity === null
                              ? 'bg-gray-800 text-white hover:bg-gray-700 active:scale-95'
                              : 'bg-white/60 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {btnLabel}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {pet && (
              <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                ⚠️ 你已有寵物 {PET_DEFS[pet.typeId]?.emoji}，棄養後才能孵化新蛋
              </p>
            )}
          </section>

          {/* Cosmetics */}
          {pet && (
            <>
              <CosmeticSection
                title="卡片背景"
                type="background"
                items={COSMETICS_BY_TYPE.background}
                owned={pet.cosmeticsOwned ?? []}
                coins={coins}
                onPurchase={onPurchaseCosmetic}
              />
              <CosmeticSection
                title="頭像外框"
                type="frame"
                items={COSMETICS_BY_TYPE.frame}
                owned={pet.cosmeticsOwned ?? []}
                coins={coins}
                onPurchase={onPurchaseCosmetic}
              />
            </>
          )}

          {/* Guide */}
          <PetGuide />
        </div>

        {/* Hatching overlay (inside drawer) */}
        {hatchingRarity !== null && (
          <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center gap-4 z-10">
            <span className="text-7xl animate-bounce">
              {EGG_DEFS.find(e => e.rarity === hatchingRarity)?.emoji ?? '🥚'}
            </span>
            <p className="text-lg font-bold text-gray-700">孵化中…</p>
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}

        {/* Reveal overlay (inside drawer) */}
        {revealed && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 p-6">
            <div className="bg-white rounded-3xl p-8 flex flex-col items-center gap-4 w-full shadow-2xl">
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">孵化成功！</p>
              <span className="text-8xl">{revealed.emoji}</span>
              <div className="text-center">
                <p className="text-2xl font-black text-gray-800">{revealed.name}</p>
                <span className={`inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-full border ${RARITY_COLOR[revealed.rarity]}`}>
                  {RARITY_LABEL[revealed.rarity]}
                </span>
              </div>
              <p className="text-xs text-gray-500 text-center">關閉後記得幫牠取個名字！</p>
              <button
                onClick={() => { setRevealed(null); onClose(); }}
                className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 transition-colors"
              >
                去看我的寵物
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// ─── Cosmetic Section ────────────────────────────────────────────
interface CosmeticSectionProps {
  title: string;
  type: CosmeticType;
  items: CosmeticDef[];
  owned: string[];
  coins: number;
  onPurchase: (cosmeticId: string, price: number, type: CosmeticType) => Promise<boolean>;
}

const CosmeticSection: React.FC<CosmeticSectionProps> = ({ title, type, items, owned, coins, onPurchase }) => {
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const handleBuy = async (item: CosmeticDef) => {
    if (buyingId) return;
    setBuyingId(item.id);
    try {
      await onPurchase(item.id, item.price, type);
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <section>
      <h3 className="text-sm font-bold text-gray-700 mb-3">{title}</h3>
      <div className="grid grid-cols-2 gap-2.5">
        {items.map(item => {
          const isOwned = owned.includes(item.id);
          const canAfford = coins >= item.price;
          const isBuying = buyingId === item.id;
          return (
            <div key={item.id} className="rounded-xl border border-gray-200 p-2.5 flex flex-col gap-2">
              <div className={`h-12 rounded-lg ${item.swatch}`} />
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs font-semibold text-gray-700 truncate">{item.name}</p>
                {!isOwned && <p className="text-xs font-bold text-yellow-600 shrink-0">🪙{item.price}</p>}
              </div>
              {isOwned ? (
                <span className="text-xs font-bold text-green-600 bg-green-50 border border-green-200 rounded-lg px-2 py-1 flex items-center justify-center gap-1">
                  <Check size={12} /> 已擁有
                </span>
              ) : (
                <button
                  onClick={() => handleBuy(item)}
                  disabled={!canAfford || isBuying}
                  className={`text-xs font-bold px-2 py-1 rounded-lg transition-all ${
                    canAfford && !isBuying
                      ? 'bg-gray-800 text-white hover:bg-gray-700 active:scale-95'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isBuying ? '購買中…' : canAfford ? '購買' : '不足'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
