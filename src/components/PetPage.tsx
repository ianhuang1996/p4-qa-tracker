import React, { useState } from 'react';
import { Heart, Star, Zap, AlertCircle, Pencil } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { usePet } from '../hooks/usePet';
import { useCoins } from '../hooks/useCoins';
import {
  PET_DEFS, STAGE_LABEL, RARITY_LABEL, RARITY_COLOR, FEED_COST,
  getXpToNextLevel, ENCOURAGEMENTS,
} from '../constants/petConstants';

interface PetPageProps {
  user: FirebaseUser;
  onNavigateToShop: () => void;
}

export const PetPage: React.FC<PetPageProps> = ({ user, onNavigateToShop }) => {
  const { pet, isLoading, happiness, isHappy, handleFeed, handleAbandon, handleName } = usePet(user);
  const { coins } = useCoins(user);
  const [nameInput, setNameInput] = useState('');
  const [namingMode, setNamingMode] = useState(false);
  const [confirmAbandon, setConfirmAbandon] = useState(false);

  if (isLoading) {
    return <div className="flex items-center justify-center py-32 text-gray-400">載入中…</div>;
  }

  // ── No pet ────────────────────────────────────────────────────────
  if (!pet) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
        <span className="text-7xl">🥚</span>
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">你還沒有寵物</h2>
          <p className="text-gray-500 text-sm">前往商店購買蛋，孵化你的第一隻寵物吧！</p>
        </div>
        <button
          onClick={onNavigateToShop}
          className="bg-blue-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors"
        >
          前往商店
        </button>
      </div>
    );
  }

  const def = PET_DEFS[pet.typeId];
  if (!def) return null;

  const { current: xpCurrent, needed: xpNeeded, level } = getXpToNextLevel(pet.xp);
  const xpPercent = xpNeeded > 0 ? Math.round((xpCurrent / xpNeeded) * 100) : 100;
  const stageLabel = STAGE_LABEL[pet.stage];
  const todayEncouragement = ENCOURAGEMENTS[new Date().getDay() % ENCOURAGEMENTS.length];

  const happinessColor =
    happiness >= 70 ? 'text-green-500' :
    happiness >= 40 ? 'text-yellow-500' : 'text-red-500';

  const happinessBarColor =
    happiness >= 70 ? 'bg-green-400' :
    happiness >= 40 ? 'bg-yellow-400' : 'bg-red-400';

  // ── Has pet ───────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Pet card */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col items-center gap-4">
        {/* Emoji + stage badge */}
        <div className="relative">
          <span className="text-8xl leading-none select-none">{def.emoji}</span>
          <span className={`absolute -bottom-1 -right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${RARITY_COLOR[pet.eggRarity]}`}>
            {stageLabel}
          </span>
        </div>

        {/* Name */}
        {namingMode ? (
          <div className="flex gap-2 w-full">
            <input
              autoFocus
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleName(nameInput);
                  setNamingMode(false);
                }
                if (e.key === 'Escape') setNamingMode(false);
              }}
              placeholder="輸入名字…"
              className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={() => { handleName(nameInput); setNamingMode(false); }}
              className="bg-blue-600 text-white font-bold px-4 rounded-xl text-sm hover:bg-blue-700"
            >
              確定
            </button>
          </div>
        ) : (
          <div className="text-center">
            <button
              onClick={() => { setNameInput(pet.name || ''); setNamingMode(true); }}
              className="group flex items-center justify-center gap-1.5"
            >
              <h2 className="text-xl font-black text-gray-800 group-hover:text-blue-600 transition-colors">
                {pet.name || <span className="text-base font-medium text-blue-400 underline underline-offset-2 decoration-dashed">點擊取名</span>}
              </h2>
              <Pencil size={13} className={`transition-colors ${pet.name ? 'text-gray-300 group-hover:text-blue-400' : 'text-blue-400'}`} />
            </button>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${RARITY_COLOR[pet.eggRarity]}`}>
                {RARITY_LABEL[pet.eggRarity]}
              </span>
              <span className="text-xs text-gray-500">{def.name}</span>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="w-full space-y-3">
          {/* Happiness */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                <Heart size={12} /> 開心度
              </span>
              <span className={`text-xs font-bold ${happinessColor}`}>{happiness}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${happinessBarColor}`} style={{ width: `${happiness}%` }} />
            </div>
          </div>

          {/* XP / Level */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                <Star size={12} /> Lv.{level} {stageLabel}
              </span>
              <span className="text-xs text-gray-400">
                {xpNeeded > 0 ? `${xpCurrent} / ${xpNeeded} XP` : 'MAX'}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${xpPercent}%` }} />
            </div>
          </div>
        </div>

        {/* Buff description */}
        <div className="w-full bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
          <Zap size={14} className="text-blue-500 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700 font-medium">{def.buffDesc}</p>
        </div>

        {/* Action buttons */}
        <div className="w-full flex gap-3">
          <button
            onClick={handleFeed}
            disabled={coins < FEED_COST}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
              coins >= FEED_COST
                ? 'bg-green-500 text-white hover:bg-green-600 active:scale-95'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {coins >= FEED_COST ? `🍖 餵食 (${FEED_COST}🪙)` : '金幣不足，無法餵食'}
          </button>
          <button
            onClick={() => setConfirmAbandon(true)}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 transition-colors"
          >
            棄養
          </button>
        </div>

        {!isHappy && (
          <div className="w-full flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <AlertCircle size={14} className="text-red-400 shrink-0" />
            <p className="text-xs text-red-600">寵物不太開心，記得定時餵食！</p>
          </div>
        )}
      </div>

      {/* Encouragement (Bugsy buff teaser / daily message) */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100 rounded-2xl p-4 text-center">
        <p className="text-sm text-purple-700 font-medium">「{todayEncouragement}」</p>
      </div>

      {/* Abandon confirm dialog */}
      {confirmAbandon && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setConfirmAbandon(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-800">確定要棄養嗎？</h3>
            <p className="text-sm text-gray-500">
              棄養後寵物資料將永久刪除，你可以再次購買蛋來孵化新寵物。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAbandon(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={() => { handleAbandon(); setConfirmAbandon(false); }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600"
              >
                確定棄養
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
