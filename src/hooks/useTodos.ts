import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, where, orderBy, addDoc } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { toast } from 'sonner';
import { TodoItem } from '../types';
import { toDateStr } from '../utils/qaUtils';

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
      setIsLoading(false);
    }, (error) => {
      console.error('Failed to fetch todos:', error);
      // If index not ready, show helpful message
      if (error.message?.includes('index')) {
        toast.error('Firestore 索引尚未建立，請點擊 Console 中的連結建立索引');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, date, dateMode]);

  const addTodo = async (text: string, assignee: string, todoDate: string, priority?: TodoItem['priority'], linkedQAItemId?: string) => {
    if (!user || !text.trim()) return;
    try {
      await addDoc(collection(db, 'todos'), {
        creatorId: user.uid,
        creatorName: user.displayName || '匿名',
        assignee,
        text: text.trim(),
        completed: false,
        date: todoDate,
        priority: priority || null,
        linkedQAItemId: linkedQAItemId || null,
        createdAt: Date.now(),
      });
    } catch (error) {
      toast.error('新增待辦失敗');
      console.error(error);
    }
  };

  const toggleTodo = async (todoId: string, completed: boolean) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'todos', todoId), {
        completed,
        completedAt: completed ? Date.now() : null,
      }, { merge: true });
    } catch (error) {
      toast.error('更新失敗');
      console.error(error);
    }
  };

  const updateTodo = async (todoId: string, updates: Partial<TodoItem>) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'todos', todoId), updates, { merge: true });
    } catch (error) {
      toast.error('更新失敗');
      console.error(error);
    }
  };

  const deleteTodo = async (todoId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'todos', todoId));
    } catch (error) {
      toast.error('刪除失敗');
      console.error(error);
    }
  };

  return { todos, isLoading, addTodo, toggleTodo, updateTodo, deleteTodo };
}
