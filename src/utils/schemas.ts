import { z } from 'zod';

// ─── QA schemas ───────────────────────────────────────────────

export const QACommentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  text: z.string(),
  createdAt: z.number(),
  updatedAt: z.number().optional(),
});

/**
 * Validates a raw Firestore document against the QAItem shape.
 * Fields with `.default()` provide backward-compatibility for documents
 * created before that field existed.
 */
export const QAItemSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  priority: z.string().optional(),
  date: z.string().default(''),
  module: z.string().default(''),
  tester: z.string().default(''),
  description: z.string().default(''),
  imageLink: z.string().default(''),
  imageLinks: z.array(z.string()).optional(),
  videoLink: z.string().optional(),
  videoLinks: z.array(z.string()).optional(),
  currentFlow: z.string().default('待處理'),
  assignee: z.string().default('Unassigned'),
  fixVersion: z.string().optional(),
  answer: z.string().default(''),
  rdFix: z.string().optional(),
  testMethod: z.string().optional(),
  comments: z.array(QACommentSchema).optional(),
  commentCount: z.number().optional(),
  fixedAt: z.number().optional(),
  version: z.string().optional(),
  authorUID: z.string().optional(),
  attachmentUrl: z.string().optional(),
  attachmentName: z.string().optional(),
  attachments: z.array(z.object({ name: z.string(), url: z.string() })).optional(),
  isNextRelease: z.boolean().optional(),
  releaseNote: z.string().optional(),
  sortOrder: z.number().optional(),
  retestResult: z.enum(['passed', 'failed']).optional(),
  retestNote: z.string().optional(),
  retestDate: z.number().optional(),
  retestBy: z.string().optional(),
});
