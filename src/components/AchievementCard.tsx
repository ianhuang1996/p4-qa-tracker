import React, { useState } from 'react';
import { Trophy, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { AchievementDef } from '../types';
import { ACHIEVEMENT_TIER_STYLES } from '../constants';

interface AchievementCardProps {
  unlocked: AchievementDef[];
  locked: AchievementDef[];
  progress: Record<string, number>;
}

const CATEGORY_LABELS: Record<string, string> = {
  bugfix: 'Bug 修復',
  speed: '速度',
  consistency: '持續力',
  todo: '待辦效率',
  wiki: '知識貢獻',
  communication: '溝通',
  release: '版更',
  qa: '品質管理',
  special: '特殊',
};

export const AchievementCard: React.FC<AchievementCardProps> = ({ unlocked, locked, progress }) => {
  const [expanded, setExpanded] = useState(false);

  // Group by category
  const categories = Object.keys(CATEGORY_LABELS);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Trophy size={16} className="text-yellow-500" />
          我的成就
          <span className="text-xs font-normal text-gray-400">
            {unlocked.length} / {unlocked.length + locked.length}
          </span>
        </h3>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
        >
          {expanded ? '收起' : '查看全部'}
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Unlocked badges row */}
      <div className="p-4 pt-6">
        {unlocked.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">還沒有解鎖任何成就，繼續加油！</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {unlocked.map(ach => (
              <div
                key={ach.id}
                className="group relative flex flex-col items-center w-16"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-md ring-2 ring-white"
                  style={ACHIEVEMENT_TIER_STYLES[ach.tier]}
                >
                  {ach.icon}
                </div>
                <span className="text-[10px] font-bold text-gray-700 mt-1 text-center leading-tight">{ach.name}</span>
                {/* Tooltip — positioned above, clamped to not overflow */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                  {ach.description}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expanded: all achievements grouped by category */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {categories.map(cat => {
            const catUnlocked = unlocked.filter(a => a.category === cat);
            const catLocked = locked.filter(a => a.category === cat);
            if (catUnlocked.length === 0 && catLocked.length === 0) return null;

            return (
              <div key={cat}>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  {CATEGORY_LABELS[cat]}
                </h4>
                <div className="space-y-2">
                  {[...catUnlocked, ...catLocked].map(ach => {
                    const isUnlocked = catUnlocked.some(u => u.id === ach.id);
                    const pct = progress[ach.id] || 0;

                    return (
                      <div key={ach.id} className={`flex items-center gap-3 p-2 rounded-lg ${isUnlocked ? 'bg-yellow-50' : 'bg-gray-50'}`}>
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0"
                          style={isUnlocked ? { ...ACHIEVEMENT_TIER_STYLES[ach.tier], boxShadow: '0 1px 2px rgba(0,0,0,0.1)' } : { background: '#e5e7eb' }}
                        >
                          {isUnlocked ? ach.icon : <Lock size={12} className="text-gray-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${isUnlocked ? 'text-gray-900' : 'text-gray-400'}`}>
                              {ach.name}
                            </span>
                            <span className="text-[10px] text-gray-400">{ach.description}</span>
                          </div>
                          {!isUnlocked && (
                            <div className="mt-1 flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-400 rounded-full transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-gray-400 shrink-0">{pct}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
