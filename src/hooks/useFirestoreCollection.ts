import { useState, useEffect } from 'react';
import { Query, onSnapshot, QueryDocumentSnapshot } from 'firebase/firestore';
import { OperationType } from '../types';
import { handleFirestoreError } from '../utils/firestoreUtils';

/**
 * Generic real-time Firestore collection subscription.
 *
 * Pass a stable (memoized) `Query` to subscribe; pass `null` to skip.
 * Each doc is mapped through `parseDoc` — return `null` to silently drop
 * documents that fail validation.
 *
 * Example:
 *   const q = useMemo(
 *     () => user ? query(collection(db, 'wiki_pages'), orderBy('updatedAt', 'desc')) : null,
 *     [user]
 *   );
 *   const { data, isLoading, error } = useFirestoreCollection(q, d => ({ id: d.id, ...d.data() } as WikiPage));
 */
export function useFirestoreCollection<T>(
  q: Query | null,
  parseDoc: (snap: QueryDocumentSnapshot) => T | null,
  collectionPath: string,
): { data: T[]; isLoading: boolean; error: string | null } {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!q) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: T[] = [];
        snapshot.forEach((doc) => {
          const parsed = parseDoc(doc);
          if (parsed !== null) items.push(parsed);
        });
        setData(items);
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, collectionPath);
        setError(`${collectionPath} 載入失敗`);
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return { data, isLoading, error };
}
