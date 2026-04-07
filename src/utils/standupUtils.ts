import { TodoItem, AugmentedQAItem } from '../types';
import { getTodayStr, toDateStr } from './qaUtils';

export interface StandupSummary {
  userName: string;
  date: string;
  todayTodos: { text: string; completed: boolean }[];
  qaInProgress: { id: string; title: string }[];
  qaReadyForTest: { id: string; title: string }[];
}

export function generateStandupSummary(
  todos: TodoItem[],
  qaItems: AugmentedQAItem[],
  userName: string
): StandupSummary {
  const today = getTodayStr();

  const todayTodos = todos
    .filter(t => t.assignee === userName && t.date === today)
    .map(t => ({ text: t.text, completed: t.completed }));

  const qaInProgress = qaItems
    .filter(i => i.assignee === userName && i.currentFlow === '開發中')
    .map(i => ({ id: i.id, title: i.displayTitle }));

  const qaReadyForTest = qaItems
    .filter(i => i.tester === userName && i.currentFlow === '已修正待測試')
    .map(i => ({ id: i.id, title: i.displayTitle }));

  return { userName, date: today, todayTodos, qaInProgress, qaReadyForTest };
}

export function formatStandupText(summary: StandupSummary): string {
  const lines: string[] = [
    `📋 ${summary.userName} — ${summary.date}`,
    '',
  ];

  if (summary.todayTodos.length > 0) {
    lines.push('【今日待辦】');
    summary.todayTodos.forEach(t => {
      lines.push(`${t.completed ? '✅' : '⬜'} ${t.text}`);
    });
    lines.push('');
  }

  if (summary.qaInProgress.length > 0) {
    lines.push('【開發中 QA】');
    summary.qaInProgress.forEach(q => {
      lines.push(`🔧 ${q.id} ${q.title}`);
    });
    lines.push('');
  }

  if (summary.qaReadyForTest.length > 0) {
    lines.push('【待測試 QA】');
    summary.qaReadyForTest.forEach(q => {
      lines.push(`🧪 ${q.id} ${q.title}`);
    });
  }

  if (summary.todayTodos.length === 0 && summary.qaInProgress.length === 0 && summary.qaReadyForTest.length === 0) {
    lines.push('今天沒有排程項目');
  }

  return lines.join('\n');
}
