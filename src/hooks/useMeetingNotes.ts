import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, addDoc, query, orderBy } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { toast } from 'sonner';
import { MeetingNote, MeetingActionItem, OperationType } from '../types';
import { handleFirestoreError } from '../utils/firestoreUtils';
import { getTodayStr } from '../utils/qaUtils';
import { awardCoins } from '../services/coinService';

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function useMeetingNotes(user: FirebaseUser | null) {
  const [meetings, setMeetings] = useState<MeetingNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }
    const q = query(
      collection(db, 'meeting_notes'),
      orderBy('date', 'desc'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() } as MeetingNote)));
      setIsLoading(false);
    }, () => {
      toast.error('會議紀錄載入失敗');
      setIsLoading(false);
    });
    return () => unsub();
  }, [user]);

  const addMeeting = async (): Promise<string | null> => {
    if (!user) return null;
    try {
      const ref = await addDoc(collection(db, 'meeting_notes'), {
        title: '新會議',
        date: getTodayStr(),
        type: 'internal',
        attendees: [],
        notes: '',
        actionItems: [],
        createdBy: user.uid,
        createdByName: user.displayName || '匿名',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      awardCoins(user.uid, 'create_meeting').catch(console.error);
      return ref.id;
    } catch (error) {
      toast.error('建立失敗');
      handleFirestoreError(error, OperationType.WRITE, 'meeting_notes');
      return null;
    }
  };

  const updateMeeting = async (meetingId: string, updates: Partial<MeetingNote>) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'meeting_notes', meetingId), { ...updates, updatedAt: Date.now() }, { merge: true });
    } catch (error) {
      toast.error('儲存失敗');
      handleFirestoreError(error, OperationType.WRITE, `meeting_notes/${meetingId}`);
    }
  };

  const deleteMeeting = async (meetingId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'meeting_notes', meetingId));
      toast.success('已刪除');
    } catch (error) {
      toast.error('刪除失敗');
      handleFirestoreError(error, OperationType.DELETE, `meeting_notes/${meetingId}`);
    }
  };

  const addActionItem = async (meetingId: string, text: string, assignee: string) => {
    const meeting = meetings.find(m => m.id === meetingId);
    if (!meeting || !text.trim()) return;
    const newItem: MeetingActionItem = { id: genId(), text: text.trim(), assignee, done: false };
    await updateMeeting(meetingId, { actionItems: [...meeting.actionItems, newItem] });
  };

  const toggleActionItem = async (meetingId: string, itemId: string) => {
    const meeting = meetings.find(m => m.id === meetingId);
    if (!meeting) return;
    const togglingOn = !meeting.actionItems.find(ai => ai.id === itemId)?.done;
    const updated = meeting.actionItems.map(ai =>
      ai.id === itemId ? { ...ai, done: !ai.done } : ai
    );
    await updateMeeting(meetingId, { actionItems: updated });
    if (user && togglingOn && updated.length > 0 && updated.every(ai => ai.done)) {
      awardCoins(user.uid, 'meeting_action_done').catch(console.error);
    }
  };

  const convertToTodo = async (meetingId: string, itemId: string, onSuccess?: () => void) => {
    if (!user) return;
    const meeting = meetings.find(m => m.id === meetingId);
    if (!meeting) return;
    const item = meeting.actionItems.find(ai => ai.id === itemId);
    if (!item || item.linkedTodoId) return;
    try {
      const ref = await addDoc(collection(db, 'todos'), {
        creatorId: user.uid,
        creatorName: user.displayName || '匿名',
        assignee: item.assignee || user.displayName || '匿名',
        text: item.text,
        completed: false,
        date: getTodayStr(),
        priority: null,
        linkedQAItemId: null,
        createdAt: Date.now(),
      });
      const updated = meeting.actionItems.map(ai =>
        ai.id === itemId ? { ...ai, linkedTodoId: ref.id } : ai
      );
      await updateMeeting(meetingId, { actionItems: updated });
      if (onSuccess) {
        onSuccess();
      } else {
        toast.success('已建立待辦');
      }
    } catch {
      toast.error('建立待辦失敗');
    }
  };

  return { meetings, isLoading, addMeeting, updateMeeting, deleteMeeting, addActionItem, toggleActionItem, convertToTodo };
}
