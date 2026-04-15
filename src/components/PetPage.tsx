import React, { useState } from 'react';
import { Heart, Star, Zap, AlertCircle, Pencil, ShoppingBag } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { usePet } from '../hooks/usePet';
import { useCoins } from '../hooks/useCoins';
import {
  PET_DEFS, STAGE_LABEL, RARITY_LABEL, RARITY_COLOR, FEED_COST,
  getXpToNextLevel, ENCOURAGEMENTS, REASON_LABEL,
} from '../constants/petConstants';
import { ShopDrawer } from './ShopDrawer';

interface PetPageProps {
  user: FirebaseUser;
}

export const PetPage: React.FC<PetPageProps> = ({ user }) => {
  const { pet, isLoading, happiness, isHappy, handleFeed, handleAbandon, handleName, handleHatch } = usePet(user);
  const { coins, transactions } = useCoins(user);
  const [nameInput, setNameInput] = useState('');
  const [namingMode, setNamingMode] = useState(false);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showAllTx, setShowAllTx] = useState(false);

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto space-y-5 animate-pulse">
        <div className="h-16 bg-gray-100 rounded-2xl" />
        <div className="h-72 bg-gray-100 rounded-3xl" />
        <div className="h-36 bg-gray-100 rounded-2xl" />
        <div className="h-28 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  const def = pet ? PET_DEFS[pet.typeId] : null;
  const xpInfo = pet ? getXpToNextLevel(pet.xp) : null;
  const xpPercent = xpInfo && xpInfo.needed > 0 ? Math.round((xpInfo.current / xpInfo.needed) * 100) : 100;
  const stageLabel = pet ? STAGE_LABEL[pet.stage] : '';
  const happinessColor = happiness >= 70 ? 'text-green-500' : happiness >= 40 ? 'text-yellow-500' : 'text-red-500';
  const happinessBarColor = happiness >= 70 ? 'bg-green-400' : happiness >= 40 ? 'bg-yellow-400' : 'bg-red-400';
  const todayEncouragement = ENCOURAGEMENTS[new Date().getDay() % ENCOURAGEMENTS.length];
  const visibleTx = showAllTx ? transactions : transactions.slice(0, 3);

  return (
    <div className="max-w-lg mx-auto space-y-5">

      {/* Coin bar + shop button */}
      <div className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🪙</span>
          <div>
            <p className="text-[10px] text-yellow-700 font-medium">我的金幣</p>
            <p className="text-xl font-black text-yellow-800">{coins.toLocaleString()}</p>
          </div>
        </div>
        <button
          onClick={() => setShowShop(true)}
          className="flex items-center gap-1.5 bg-gray-800 text-white text-sm font-bold px-3 py-2 rounded-xl hover:bg-gray-700 active:scale-95 transition-all"
        >
          <ShoppingBag size={15} />
          商店
        </button>
      </div>

      {/* No pet state */}
      {!pet && (
        <div className="flex flex-col items-center justify-center py-16 gap-5 text-center bg-white rounded-3xl border border-gray-100 shadow-sm">
          <span className="text-7xl">🥚</span>
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">你還沒有寵物</h2>
            <p className="text-gray-500 text-sm">前往商店購買蛋，孵化你的第一隻夥伴！</p>
          </div>
          <button
            onClick={() => setShowShop(true)}
            className="bg-blue-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors"
          >
            前往商店
          </button>
        </div>
      )}

      {/* Pet card */}
      {pet && def && (
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
                  if (e.key === 'Enter') { handleName(nameInput); setNamingMode(false); }
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
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                  <Star size={12} /> Lv.{xpInfo?.level} {stageLabel}
                </span>
                <span className="text-xs text-gray-400">
                  {xpInfo && xpInfo.needed > 0 ? `${xpInfo.current} / ${xpInfo.needed} XP` : 'MAX'}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${xpPercent}%` }} />
              </div>
            </div>
          </div>

          {/* Buff */}
          <div className="w-full bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
            <Zap size={14} className="text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700 font-medium">{def.buffDesc}</p>
          </div>

          {/* Actions */}
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
      )}

      {/* Encouragement */}
      {pet && (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100 rounded-2xl p-4 text-center">
          <p className="text-sm text-purple-700 font-medium">「{todayEncouragement}」</p>
        </div>
      )}

      {/* Transaction mini-log */}
      {transactions.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600">🪙 最近交易</h3>
            {transactions.length > 3 && (
              <button
                onClick={() => setShowAllTx(!showAllTx)}
                className="text-xs text-blue-500 hover:text-blue-700"
              >
                {showAllTx ? '收起' : `查看全部（${transactions.length}）`}
              </button>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
            {visibleTx.map(tx => (
              <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">{tx.note || REASON_LABEL[tx.reason] || tx.reason}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(tx.timestamp).toLocaleString('zh-TW', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                </div>
                <span className={`text-sm font-bold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {tx.amount >= 0 ? '+' : ''}{tx.amount}🪙
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Shop drawer */}
      {showShop && (
        <ShopDrawer
          user={user}
          coins={coins}
          pet={pet}
          onHatch={handleHatch}
          onClose={() => setShowShop(false)}
        />
      )}

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
