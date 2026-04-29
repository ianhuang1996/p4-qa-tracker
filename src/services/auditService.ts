import { addDoc, collection } from 'firebase/firestore';
import { db, auth } from '../firebase';

/**
 * Append an entry to /audit_logs. Fire-and-forget: failures are logged but never
 * block the caller. Firestore rules pin userId == auth.uid so entries are
 * tamper-evident (you can't fake another user's action).
 *
 * Use for irreversible / sensitive actions: delete wiki, delete decision,
 * delete QA item, role change, supersede a decision, etc.
 */
export type AuditAction =
  | 'delete_qa_item'
  | 'delete_wiki_page'
  | 'delete_release'
  | 'delete_meeting_note'
  | 'delete_decision'
  | 'delete_roadmap_item'
  | 'delete_todo'
  | 'mark_duplicate'
  | 'supersede_decision'
  | 'execute_release';

interface AuditEntry {
  action: AuditAction;
  /** What was acted on — e.g. wiki page id, qa item id, release version. */
  target?: string;
  /** Optional human-readable label of the target. */
  targetLabel?: string;
  /** Free-form extra context. Keep small. */
  details?: string;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  try {
    await addDoc(collection(db, 'audit_logs'), {
      userId: user.uid,
      userEmail: user.email ?? null,
      userName: user.displayName ?? null,
      action: entry.action,
      target: entry.target ?? null,
      targetLabel: entry.targetLabel ?? null,
      details: entry.details ?? null,
      createdAt: Date.now(),
    });
  } catch (err) {
    console.warn('audit log failed:', entry.action, err);
  }
}
