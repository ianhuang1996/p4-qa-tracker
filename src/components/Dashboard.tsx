import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { AugmentedQAItem } from '../types';
import { COLORS, SEVERITY_COLORS } from '../constants';

interface DashboardProps {
  items: AugmentedQAItem[];
}

export const Dashboard: React.FC<DashboardProps> = ({ items }) => {
  const assigneeStats = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach(item => {
      counts[item.assignee] = (counts[item.assignee] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [items]);

  const moduleStats = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach(item => {
      counts[item.module] = (counts[item.module] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [items]);

  const weeklyFixedStats = useMemo(() => {
    const counts: Record<string, { date: string; fixed: number; total: number }> = {};
    
    items.forEach(item => {
      const date = item.date || '未知';
      if (!counts[date]) {
        counts[date] = { date, fixed: 0, total: 0 };
      }
      counts[date].total += 1;
      if (item.currentFlow === '已修復' || item.currentFlow === '已關閉') {
        counts[date].fixed += 1;
      }
    });

    return Object.values(counts).sort((a, b) => {
      if (a.date === '未知') return 1;
      if (b.date === '未知') return -1;
      const [aM, aD] = a.date.split('/').map(Number);
      const [bM, bD] = b.date.split('/').map(Number);
      if (aM !== bM) return (aM || 0) - (bM || 0);
      return (aD || 0) - (bD || 0);
    });
  }, [items]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
          <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
          負責人分配
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={assigneeStats}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
              <Tooltip 
                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                cursor={{fill: '#f9fafb'}}
              />
              <Bar dataKey="count" name="問題數" radius={[4, 4, 0, 0]}>
                {assigneeStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
          <span className="w-1 h-6 bg-green-500 rounded-full"></span>
          模組分佈
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={moduleStats}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="count"
                nameKey="name"
                label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {moduleStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
          <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
          每日修復進度
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyFixedStats}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
              <Tooltip 
                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                cursor={{fill: '#f9fafb'}}
              />
              <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
              <Bar dataKey="total" name="總問題數" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="fixed" name="已修復" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
