import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, where, orderBy, addDoc } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { toast } from 'sonner';
import { TodoItem, OperationType } from '../types';
import { toDateStr } from '../utils/qaUtils';
import { handleFirestoreError } from '../utils/firestoreUtils';
import { awardCoins } from '../services/coinService';
import { EMAIL_TO_MEMBER, DEFAULT_DISPLAY_NAME } from '../constants';

export type DateMode = 'day' | 'week';

function getWeekRange(dateStr: string): { start: string; end: string } {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMon);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: toDateStr(monday),
    end: toDateStr(sunday),
  };
}

export function useTodos(user: FirebaseUser | null, date: string, dateMode: DateMode) {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    let q;
    if (dateMode === 'week') {
      const { start, end } = getWeekRange(date);
      q = query(
        collection(db, 'todos'),
        where('date', '>=', start),
        where('date', '<=', end),
        orderBy('date', 'asc'),
        orderBy('createdAt', 'asc')
      );
    } else {
      q = query(
        collection(db, 'todos'),
        where('date', '==', date),
        orderBy('createdAt', 'asc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: TodoItem[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as TodoItem);
      });
      setTodos(items);
      setError(null);
      setIsLoading(false);
    }, (err) => {
      if (err.message?.includes('index')) {
        toast.error('Firestore 索引尚未建立，請點擊 Console 中的連結建立索引');
      }
      setError('待辦清單載入失敗');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, date, dateMode]);

  const addTodo = async (
    text: string,
    assignee: string,
    todoDate: string,
    priority?: TodoItem['priority'],
    linkedQAItemId?: string,
    taskFields?: Pick<TodoItem, 'type' | 'instruction' | 'deliverable' | 'dueTime'>,
  ) => {
    if (!user || !text.trim()) return;
    try {
      await addDoc(collection(db, 'todos'), {
        creatorId: user.uid,
        creatorName: user.displayName || DEFAULT_DISPLAY_NAME,
        assignee,
        text: text.trim(),
        completed: false,
        date: todoDate,
        priority: priority || null,
        linkedQAItemId: linkedQAItemId || null,
        createdAt: Date.now(),
        type: taskFields?.type || 'todo',
        instruction: taskFields?.instruction || null,
        deliverable: taskFields?.deliverable || null,
        dueTime: taskFields?.dueTime || null,
      });
      awardCoins(user.uid, 'create_todo', text.trim().substring(0, 30)).catch(console.error);
    } catch (error) {
      toast.error('新增待辦失敗');
      handleFirestoreError(error, OperationType.WRITE, 'todos');
    }
  };

  const toggleTodo = async (todoId: string, completed: boolean) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'todos', todoId), {
        completed,
        completedAt: completed ? Date.now() : null,
      }, { merge: true });
      // Award todo_clear if ALL of current user's todos are now done
      if (completed) {
        const myName = (user.email && EMAIL_TO_MEMBER[user.email]) || user.displayName || '';
        const myTodos = todos.filter(t => t.assignee === myName);
        const allDoneAfter = myTodos.every(t => t.id === todoId || t.completed);
        if (allDoneAfter && myTodos.length > 0) {
          awardCoins(user.uid, 'todo_clear').catch(console.error);
        }
      }
    } catch (error) {
      toast.error('更新失敗');
      handleFirestoreError(error, OperationType.WRITE, `todos/${todoId}`);
    }
  };

  const updateTodo = async (todoId: string, updates: Partial<TodoItem>) => {
    if (!user) return;
    const sanitized: Record<string, unknown> = {};
    Object.entries(updates).forEach(([key, val]) => {
      // Never overwrite 'date' with an empty string — it would break the date query and hide the item
      if (key === 'date' && !val) return;
      sanitized[key] = val === undefined ? null : val;
    });
    try {
      await setDoc(doc(db, 'todos', todoId), sanitized, { merge: true });
      toast.success('更新成功');
    } catch (error) {
      toast.error('更新失敗');
      handleFirestoreError(error, OperationType.WRITE, `todos/${todoId}`);
    }
  };

  const deleteTodo = async (todoId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'todos', todoId));
    } catch (error) {
      toast.error('刪除失敗');
      handleFirestoreError(error, OperationType.DELETE, `todos/${todoId}`);
    }
  };

  return { todos, isLoading, error, addTodo, toggleTodo, updateTodo, deleteTodo };
}
