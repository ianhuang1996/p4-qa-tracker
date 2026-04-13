import { useMemo } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { useQAItems } from './useQAItems';
import { augmentQAItems } from '../utils/qaUtils';

export function useAugmentedQAItems(user: FirebaseUser | null, isAuthReady: boolean) {
  const result = useQAItems(user, isAuthReady);
  const augmentedData = useMemo(() => augmentQAItems(result.data), [result.data]);
  return { ...result, augmentedData };
}
