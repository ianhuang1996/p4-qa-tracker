import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, Copy } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { AugmentedQAItem } from '../types';
import { getWeekBoundaries, computeWeeklyStats, computeRDWorkload, computeTrendData } from '../utils/reportUtils';
import { getAvatarColor } from '../utils/qaUtils';
import { SEMANTIC } from '../constants';

interface WeeklyReportProps {
  items: AugmentedQAItem[];
}

export const WeeklyReport: React.FC<WeeklyReportProps> = ({ items }) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const week = getWeekBoundaries(weekOffset);
  const stats = useMemo(() => computeWeeklyStats(items, week.start, week.end), [items, week.start, week.end]);
  const rdWorkload = useMemo(() => computeRDWorkload(items), [items]);
  const trendData = useMemo(() => computeTrendData(items, 8), [items]);

  const handleCopyReport = () => {
    const lines = [
      `📊 週報 ${week.label}`,
      ``,
      `新增 Bug: ${stats.addedCount}`,
      `已修復: ${stats.fixedCount}`,
      `未結案: ${stats.remainingCount}`,
      `修復率: ${stats.fixRate}%`,
      ``,
      `── RD 工作量 ──`,
      ...rdWorkload.filter(r => r.name !== 'Unassigned').map(r =>
        `${r.name}: 待處理 ${r.assigned} / 開發中 ${r.inProgress} / 已修復 ${r.fixed}`
      ),
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    toast.success('週報已複製到剪貼簿');
  };

  return (
    <div className="space-y-6">
      {/* Week selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp size={16} className="text-blue-600" />
          本週報告
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={handleCopyReport} className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 mr-2">
            <Copy size={12} /> 複製週報
          </button>
          <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 shadow-sm p-1">
            <button onClick={() => setWeekOffset(prev => prev - 1)} className="p-1.5 hover:bg-gray-100 rounded-md"><ChevronLeft size={14} /></button>
            <button onClick={() => setWeekOffset(0)} className={`px-3 py-1 rounded-md text-xs font-bold ${weekOffset === 0 ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
              {week.label}
            </button>
            <button onClick={() => setWeekOffset(prev => prev + 1)} className="p-1.5 hover:bg-gray-100 rounded-md"><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">新增 Bug</p>
          <p className="text-xl font-black text-gray-900">{stats.addedCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">已修復</p>
          <p className="text-xl font-black text-green-600">{stats.fixedCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">未結案</p>
          <p className="text-xl font-black text-orange-600">{stats.remainingCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">修復率</p>
          <div className="flex items-center gap-2">
            <p className="text-xl font-black text-gray-900">{stats.fixRate}%</p>
            {stats.fixRate >= 80 ? <TrendingUp size={16} className="text-green-500" /> :
             stats.fixRate >= 50 ? <Minus size={16} className="text-orange-500" /> :
             <TrendingDown size={16} className="text-red-500" />}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend chart */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">趨勢（近 8 週）</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="added" stroke={SEMANTIC.danger.hex} name="新增" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="fixed" stroke={SEMANTIC.success.hex} name="修復" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="remaining" stroke={SEMANTIC.caution.hex} name="未結案" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* RD workload bar chart */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">RD 工作量</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={rdWorkload.filter(r => r.name !== 'Unassigned')} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={50} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="assigned" fill={SEMANTIC.warning.hex} name="待處理" radius={[0, 4, 4, 0]} />
              <Bar dataKey="inProgress" fill={SEMANTIC.info.hex} name="開發中" radius={[0, 4, 4, 0]} />
              <Bar dataKey="fixed" fill={SEMANTIC.success.hex} name="已修復" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
