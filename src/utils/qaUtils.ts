// ─── 時間工具（統一使用 Asia/Taipei 時區）───────────────────
const TZ = 'Asia/Taipei';

/** 取得台北時區的今天日期字串 YYYY-MM-DD */
export const getTodayStr = (): string => {
  return new Date().toLocaleDateString('sv-SE', { timeZone: TZ });
};

/** 將 Date 物件轉成台北時區的 YYYY-MM-DD */
export const toDateStr = (d: Date): string => {
  return d.toLocaleDateString('sv-SE', { timeZone: TZ });
};

/** 將 timestamp 轉成台北時區的可讀時間字串 */
export const formatTimestamp = (ts: number): string => {
  return new Date(ts).toLocaleString('zh-TW', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const AVATAR_COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500',
  'bg-teal-500', 'bg-cyan-500', 'bg-blue-500', 'bg-indigo-500',
  'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
];

export const getAvatarColor = (name: string): string => {
  if (!name || name === 'Unassigned') return 'bg-gray-400';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export const getDirectImageUrl = (url: string) => {
  if (!url) return '';
  
  if (url.includes('drive.google.com')) {
    const fileId = url.match(/\/d\/([^/?#]+)/)?.[1] || url.match(/[?&]id=([^&#]+)/)?.[1];
    if (fileId) {
      return `https://lh3.googleusercontent.com/u/0/d/${fileId}`;
    }
  }
  
  if (url.includes('imgur.com') && !url.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
    const imgId = url.split('/').pop();
    if (imgId) {
      return `https://i.imgur.com/${imgId}.png`;
    }
  }
  
  return url;
};

export const getVideoEmbedUrl = (url: string) => {
  if (!url) return '';
  
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/');
  }
  
  if (url.includes('drive.google.com')) {
    const fileId = url.match(/\/d\/([^/?#]+)/)?.[1] || url.match(/[?&]id=([^&#]+)/)?.[1];
    if (fileId) {
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
  }
  
  return '';
};

export const isDirectVideo = (url: string) => {
  if (!url) return false;
  return url.match(/\.(mp4|webm|ogg)$/i) !== null;
};

export const normalizeDate = (dateStr: string): string => {
  if (!dateStr) return '';

  // If already in YYYY-MM-DD format, return as is
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr;
  }

  // Handle YYYY/M/D or YYYY/MM/DD format
  const fullMatch = dateStr.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (fullMatch) {
    const month = fullMatch[2].padStart(2, '0');
    const day = fullMatch[3].padStart(2, '0');
    return `${fullMatch[1]}-${month}-${day}`;
  }

  // Handle M/D or MM/DD format — use current year as default
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (match) {
    const month = match[1].padStart(2, '0');
    const day = match[2].padStart(2, '0');
    const year = new Date().getFullYear();
    return `${year}-${month}-${day}`;
  }

  return dateStr;
};

import { QAItem } from '../data';
import { AugmentedQAItem } from '../types';

export const augmentQAItems = (data: QAItem[]): AugmentedQAItem[] => {
  return data.map(item => {
    const desc = item.description || '';
    let priority = item.priority;
    let category = '';
    let cleanDesc = desc;

    const priorityMatch = desc.match(/【(P\d+)(?:-([^】]+))?】/);
    if (priorityMatch) {
      if (!priority || priority === '-') priority = priorityMatch[1];
      category = priorityMatch[2] || '';
      cleanDesc = desc.replace(priorityMatch[0], '').trim();
    } else {
      const generalMatch = desc.match(/【([^】]+)】/);
      if (generalMatch) {
        category = generalMatch[1];
        cleanDesc = desc.replace(generalMatch[0], '').trim();
      }
    }

    if (!priority) priority = '-';
    const displayTitle = item.title || (cleanDesc.split('\n')[0].length > 30 ? cleanDesc.split('\n')[0].substring(0, 30) + '...' : cleanDesc.split('\n')[0]) || '未命名問題';

    return { ...item, priority, category, cleanDesc, displayTitle, date: normalizeDate(item.date), comments: item.comments || [] };
  });
};
