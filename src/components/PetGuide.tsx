import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { COIN_REWARDS } from '../constants/petConstants';

const EARN_ROWS: { label: string; who: string; coins: number }[] = [
  { label: '修復 P0 Bug（標記待測試）', who: 'RD', coins: COIN_REWARDS.fix_p0 },
  { label: '修復 P1 Bug（標記待測試）', who: 'RD', coins: COIN_REWARDS.fix_p1 },
  { label: '修復 P2/P3 Bug（標記待測試）', who: 'RD', coins: COIN_REWARDS.fix_p2_p3 },
  { label: '建立 QA item（回報 Bug）', who: 'PM/QA', coins: COIN_REWARDS.file_bug },
  { label: 'Retest 通過', who: 'PM/QA', coins: COIN_REWARDS.retest_pass },
  { label: 'Retest 退回（發現問題）', who: 'PM/QA', coins: COIN_REWARDS.retest_fail },
  { label: '撰寫日報', who: '所有人', coins: COIN_REWARDS.daily_report },
  { label: '新增 Wiki 頁面', who: '所有人', coins: COIN_REWARDS.create_wiki },
  { label: '新增待辦事項', who: '所有人', coins: COIN_REWARDS.create_todo },
  { label: '完成所有今日待辦', who: '所有人', coins: COIN_REWARDS.todo_clear },
  { label: '正式發布版更', who: 'PM/RD', coins: COIN_REWARDS.release_publish },
];

const SECTIONS = [
  {
    title: '💰 如何賺金幣',
    content: null as null | React.ReactNode,
  },
  {
    title: '🥚 孵化寵物',
    content: (
      <div className="space-y-2 text-sm text-gray-600">
        <p>1. 在商店選購蛋（普通 100🪙 / 稀有 300🪙 / 傳說 800🪙）</p>
        <p>2. 點擊「購買孵化」，系統隨機從該稀有度池中抽取一種寵物</p>
        <p>3. 孵化後前往「我的寵物」為牠取名</p>
        <p className="text-amber-600">⚠️ 一次只能擁有一隻寵物；想換新的，需先棄養現有的</p>
      </div>
    ),
  },
  {
    title: '⬆️ 寵物成長與升級',
    content: (
      <div className="space-y-2 text-sm text-gray-600">
        <p>你賺到的每一枚金幣都同時給寵物 +1 XP。</p>
        <div className="bg-gray-50 rounded-lg p-3 text-xs">
          <p className="font-semibold mb-1">成長階段</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white rounded p-2 border border-gray-100">
              <p className="font-bold">幼體</p>
              <p className="text-gray-400">Lv 1–3</p>
            </div>
            <div className="bg-white rounded p-2 border border-blue-100">
              <p className="font-bold text-blue-600">成體</p>
              <p className="text-gray-400">Lv 4–6</p>
            </div>
            <div className="bg-white rounded p-2 border border-yellow-200">
              <p className="font-bold text-yellow-600">覺醒</p>
              <p className="text-gray-400">Lv 7–10</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: '🍖 餵食與開心度',
    content: (
      <div className="space-y-2 text-sm text-gray-600">
        <p>每 24 小時不餵食，開心度從 100% 降到 0%。</p>
        <p>餵一次需要 <strong>20🪙</strong>，會立刻回滿開心度。</p>
        <p>開心度低於 60% 時寵物會顯示不開心狀態，但<strong>不會死亡</strong>。</p>
      </div>
    ),
  },
  {
    title: '✨ 寵物效果（Buff）',
    content: (
      <div className="space-y-2 text-sm text-gray-600">
        <p>每種寵物有獨特效果，在 App 中顯示專屬視覺提示或功能增強。</p>
        <p>稀有度越高，效果越強大。前往商店查看各稀有度池的寵物列表。</p>
        <p className="text-purple-600 text-xs">💡 傳說寵物目前包含：龍（P0 緊急 banner）、獨角獸（版更 confetti）、鳳凰（退回重修額外 +30🪙）</p>
      </div>
    ),
  },
];

export const PetGuide: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section>
      <h2 className="text-lg font-bold text-gray-800 mb-3">📖 新手指南</h2>
      <div className="space-y-2">
        {SECTIONS.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <button
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              <span className="font-semibold text-gray-700 text-sm">{s.title}</span>
              {openIdx === i ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {openIdx === i && (
              <div className="px-4 pb-4">
                {i === 0 ? (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-100">
                        <th className="text-left py-1.5 font-medium">行為</th>
                        <th className="text-left py-1.5 font-medium">對象</th>
                        <th className="text-right py-1.5 font-medium">金幣</th>
                      </tr>
                    </thead>
                    <tbody>
                      {EARN_ROWS.map((row, j) => (
                        <tr key={j} className="border-b border-gray-50 last:border-0">
                          <td className="py-1.5 text-gray-600">{row.label}</td>
                          <td className="py-1.5 text-gray-400">{row.who}</td>
                          <td className="py-1.5 text-right font-bold text-green-600">+{row.coins}🪙</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : s.content}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
