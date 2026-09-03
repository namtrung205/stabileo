import { useSyncExternalStore } from 'react';
import type { ReactExternalStore } from '../../lib/store/react-external-store';

/** Re-render a React surface whenever its transitional store facade changes. */
export function useStoreRevision(store: ReactExternalStore): number {
  return useSyncExternalStore(store.reactSubscribe, store.reactSnapshot, store.reactSnapshot);
}
