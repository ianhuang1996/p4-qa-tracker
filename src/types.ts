import { QAItem, QAComment } from './data';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export interface AugmentedQAItem extends QAItem {
  priority: string;
  category: string;
  cleanDesc: string;
  displayTitle: string;
  comments: QAComment[];
  version?: string;
}

export type ViewMode = 'table' | 'kanban';
export type QuickFilter = 'all' | 'my_tasks' | 'ready_for_test';
export type AppPage = 'overview' | 'todo' | 'qa';

export interface HistoryEntry {
  id: string;
  userId: string;
  userName: string;
  timestamp: number;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

export interface Notification {
  id: string;
  userId: string; // Recipient
  fromUserId: string;
  fromUserName: string;
  itemId: string;
  itemTitle: string;
  type: 'status_change' | 'assignment' | 'comment';
  oldValue?: string;
  newValue?: string;
  isRead: boolean;
  createdAt: number;
}

export interface TodoItem {
  id: string;
  creatorId: string;       // 建立者 UID
  creatorName: string;     // 建立者名稱
  assignee: string;        // 負責人名稱 (e.g. 'Neo', 'Ian')
  text: string;
  completed: boolean;
  date: string;            // 'YYYY-MM-DD'
  priority?: 'high' | 'medium' | 'low';
  linkedQAItemId?: string;
  createdAt: number;
  completedAt?: number;
}
