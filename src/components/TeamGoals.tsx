import React from 'react';
import { Target, Check } from 'lucide-react';
import { TeamGoalProgress } from '../types';
import { TEAM_GOAL_DEFS } from '../constants';

interface TeamGoalsProps {
  goals: TeamGoalProgress[];
}

export const TeamGoals: React.FC<TeamGoalsProps> = ({ goals }) => {
  const achievedCount = goals.filter(g => g.achieved).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Target size={16} className="text-purple-500" />
          團隊目標
          <span className="text-xs font-normal text-gray-400">
            {achievedCount} / {goals.length} 達成
          </span>
        </h3>
      </div>

      <div className="p-4 space-y-3">
        {goals.map(goal => {
          const def = TEAM_GOAL_DEFS.find(d => d.id === goal.goalId);
          if (!def) return null;

          // For 'zero_p0', lower is better (target is 0)
          const isInverse = def.id === 'zero_p0';
          const pct = isInverse
            ? (goal.current === 0 ? 100 : Math.max(0, 100 - goal.current * 25))
            : goal.target > 0
              ? Math.round((goal.current / goal.target) * 100)
              : 0;

          const progressColor = goal.achieved
            ? 'bg-green-500'
            : pct >= 60
              ? 'bg-blue-500'
              : 'bg-orange-400';

          return (
            <div
              key={goal.goalId}
              className={`p-3 rounded-xl border transition-all ${
                goal.achieved
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{def.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900">{def.name}</span>
                    {goal.achieved && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">
                        <Check size={10} /> 達成
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">{def.description}</p>
                </div>
                <span className="text-xs font-bold text-gray-500 shrink-0">
                  {isInverse ? (
                    goal.current === 0 ? '✓' : `剩 ${goal.current}`
                  ) : (
                    `${goal.current}/${goal.target}`
                  )}
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </div>
          );
        })}

        {goals.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">目前沒有進行中的版更目標</p>
        )}
      </div>
    </div>
  );
};
