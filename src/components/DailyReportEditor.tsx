import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Sparkles, Copy, Save, Loader2, ChevronDown, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { User as FirebaseUser } from 'firebase/auth';
import { useDailyReport } from '../hooks/useDailyReport';
import { useTodos } from '../hooks/useTodos';
import { useQAItems } from '../hooks/useQAItems';
import { useReleases } from '../hooks/useReleases';
import { useAppContext } from '../contexts/AppContext';
import { getTodayStr, toDateStr, formatTimestamp } from '../utils/qaUtils';
import { STATUS, isResolved, isActiveRelease } from '../constants';
import { generateDailyReport } from '../services/geminiService';
import { ConfirmDialog } from './ConfirmDialog';
import { useConfirm } from '../hooks/useConfirm';

export const DailyReportEditor: React.FC = () => {
  const { user, isAuthReady } = useAppContext();
  const { confirm, dialogProps } = useConfirm();
  const today = getTodayStr();
  const { report, recentReports, isLoading: reportLoading, saveReport } = useDailyReport(user, today);
  const { todos } = useTodos(user, today, 'day');
  const { data: qaData } = useQAItems(user, isAuthReady);
  const { releases } = useReleases(user);

  const [completed, setCompleted] = useState(report?.completed || '');
  const [inProgress, setInProgress] = useState(report?.inProgress || '');
  const [risks, setRisks] = useState(report?.risks || '');
  const [manualNotes, setManualNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Sync from saved report when it loads
  React.useEffect(() => {
    if (report) {
      setCompleted(report.completed);
      setInProgress(report.inProgress);
      setRisks(report.risks);
    }
  }, [report]);

  // Auto-save after 2 seconds of inactivity
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hasContent = completed.trim() || inProgress.trim() || risks.trim();
  useEffect(() => {
    if (!hasContent || reportLoading) return;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveReport(completed, inProgress, risks);
    }, 2000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [completed, inProgress, risks]);

  const activeRelease = releases.find(r => isActiveRelease(r.status));

  const handleGenerate = async () => {
    if (!user) return;
    const hasExisting = completed.trim() || inProgress.trim() || risks.trim();
    if (hasExisting) {
      const ok = await confirm('目前已有內容，AI 生成將覆蓋現有內容。確定要繼續嗎？', { title: 'AI 生成', variant: 'warning', confirmLabel: '覆蓋並生成' });
      if (!ok) return;
    }
    setIsGenerating(true);
    try {
      const completedTodos = todos.filter(t => t.completed).map(t => t.text);
      const pendingTodos = todos.filter(t => !t.completed).map(t => t.text);

      const completedQAItems = qaData
        .filter(i => isResolved(i.currentFlow) && i.fixedAt && toDateStr(new Date(i.fixedAt)) === today)
        .map(i => ({ id: i.id, title: i.title || i.description.substring(0, 40), module: i.module }));

      const inProgressQAItems = qaData
        .filter(i => i.currentFlow === STATUS.inProgress || i.currentFlow === STATUS.readyToTest)
        .map(i => ({ id: i.id, title: i.title || i.description.substring(0, 40), module: i.module, assignee: i.assignee }));

      const riskItems = qaData
        .filter(i => {
          if (isResolved(i.currentFlow)) return false;
          if (i.priority === 'P0') return true;
          if (i.currentFlow === '退回重修') return true;
          return false;
        })
        .map(i => ({
          id: i.id,
          title: i.title || i.description.substring(0, 40),
          reason: i.priority === 'P0' ? 'P0 緊急' : '退回重修',
        }));

      const result = await generateDailyReport({
        date: today,
        completedTodos,
        completedQAItems,
        inProgressQAItems,
        pendingTodos,
        riskItems,
        activeRelease: activeRelease ? {
          version: activeRelease.version,
          scheduledDate: activeRelease.scheduledDate,
          itemCount: activeRelease.linkedItemIds.length,
        } : undefined,
        manualNotes: manualNotes || undefined,
      });

      setCompleted(result.completed);
      setInProgress(result.inProgress);
      setRisks(result.risks);
    } catch (error) {
      toast.error('AI 生成失敗');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    // Strip duplicate section titles that AI may have generated
    const clean = (s: string) => s
      .replace(/^(今日完成[：:]?\s*)/i, '')
      .replace(/^(進行中\s*\/?\s*明日重點[：:]?\s*)/i, '')
      .replace(/^(風險\s*\/?\s*需協助[：:]?\s*)/i, '')
      .trim();
    const text = [
      `【OVideo 每日進度｜${today.replace(/^\d{4}-/, '').replace('-', '/')}】`,
      '',
      '🟢 今日完成',
      clean(completed),
      '',
      '🟡 進行中 / 明日重點',
      clean(inProgress),
      '',
      '🔴 風險 / 需協助',
      clean(risks),
    ].join('\n');
    navigator.clipboard.writeText(text);
    toast.success('已複製到剪貼簿');
  };

  const handleSave = () => {
    saveReport(completed, inProgress, risks);
  };

  if (!user) return null;

  return (
    <><ConfirmDialog {...dialogProps} />
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">
            每日進度報告
          </h3>
          <div className="flex items-center gap-2">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            AI 生成
          </button>
          <button onClick={handleSave} className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
            <Save size={12} /> 儲存
          </button>
          <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs font-bold text-green-600 hover:text-green-700 bg-green-50 px-3 py-1.5 rounded-lg transition-colors">
            <Copy size={12} /> 複製
          </button>
          </div>
        </div>
        {/* Manual notes input — full width on mobile */}
        <input
          type="text"
          value={manualNotes}
          onChange={(e) => setManualNotes(e.target.value)}
          placeholder="補充給 AI 的備註（選填，AI 生成前填寫）..."
          className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500 bg-white"
        />
      </div>

      {/* Editor */}
      {reportLoading ? (
        <div className="p-5 space-y-4 animate-pulse">
          {[1,2,3].map(i => (
            <div key={i}>
              <div className="h-3 w-20 bg-gray-200 rounded mb-2" />
              <div className="h-20 bg-gray-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
      <div className="p-5 space-y-4">
        {/* 🟢 今日完成 */}
        <div>
          <label className="text-xs font-bold text-green-600 flex items-center gap-1 mb-2">🟢 今日完成</label>
          <textarea
            value={completed}
            onChange={(e) => setCompleted(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 min-h-[80px] resize-y"
            placeholder="今天完成了什麼..."
          />
        </div>

        {/* 🟡 進行中 */}
        <div>
          <label className="text-xs font-bold text-yellow-600 flex items-center gap-1 mb-2">🟡 進行中 / 明日重點</label>
          <textarea
            value={inProgress}
            onChange={(e) => setInProgress(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-yellow-500 min-h-[80px] resize-y"
            placeholder="目前進行中或明天要做的..."
          />
        </div>

        {/* 🔴 風險 */}
        <div>
          <label className="text-xs font-bold text-red-600 flex items-center gap-1 mb-2">🔴 風險 / 需協助</label>
          <textarea
            value={risks}
            onChange={(e) => setRisks(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500 min-h-[60px] resize-y"
            placeholder="有什麼風險或需要協助的..."
          />
        </div>
      </div>
      )}

      {/* History */}
      {recentReports.length > 0 && (
        <div className="border-t border-gray-100">
          <button
            onClick={() => setShowHistory(prev => !prev)}
            className="w-full flex items-center justify-between px-5 py-3 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-1.5 font-bold">
              <Clock size={12} /> 歷史紀錄（近 7 天）
            </span>
            <ChevronDown size={14} className={`transition-transform ${showHistory ? 'rotate-180' : ''}`} />
          </button>
          {showHistory && (
            <div className="px-5 pb-4 space-y-2">
              {recentReports.filter(r => r.date !== today).map(r => (
                <button
                  key={r.id}
                  onClick={() => {
                    setCompleted(r.completed);
                    setInProgress(r.inProgress);
                    setRisks(r.risks);
                    toast.success(`已載入 ${r.date} 的報告`);
                  }}
                  className="w-full text-left p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-gray-700">{r.date}</span>
                    <span className="text-[10px] text-gray-400">{formatTimestamp(r.updatedAt)}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 line-clamp-2">{r.completed.substring(0, 80)}...</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
};
