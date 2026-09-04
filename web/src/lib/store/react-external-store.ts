/**
 * Minimal React subscription surface for the existing framework-neutral store
 * API. The proxy observes property assignments; method-based mutations can use
 * `runReactStoreAction` until each domain store owns its notifications.
 */
export type ReactExternalStore = {
  reactSubscribe(listener: (property?: PropertyKey) => void): () => void;
  reactSnapshot(): number;
  reactNotify(): void;
};

export type ReactStoreReadTracker = (store: ReactExternalStore, property: PropertyKey) => void;
let activeReadTracker: ReactStoreReadTracker | null = null;

/** Capture observable store properties read while `run` executes. */
export function trackReactStoreReads<T>(tracker: ReactStoreReadTracker, run: () => T): T {
  const previous = activeReadTracker;
  activeReadTracker = tracker;
  try { return run(); } finally { activeReadTracker = previous; }
}

export type ReactObservable<T extends object> = T & ReactExternalStore;

export function makeReactObservable<T extends object>(
  target: T,
  mutatingMethods: readonly PropertyKey[] = [],
): ReactObservable<T> {
  let revision = 0;
  const listeners = new Set<(property?: PropertyKey) => void>();
  const notify = (property?: PropertyKey) => {
    revision += 1;
    for (const listener of listeners) listener(property);
  };
  const subscribe = (listener: (property?: PropertyKey) => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const snapshot = () => revision;
  const mutators = new Set(mutatingMethods);
  const methodCache = new Map<PropertyKey, { source: Function; wrapped: Function }>();

  return new Proxy(target as ReactObservable<T>, {
    get(inner, property, receiver) {
      if (property === 'reactSubscribe') return subscribe;
      if (property === 'reactSnapshot') return snapshot;
      if (property === 'reactNotify') return notify;
      activeReadTracker?.(receiver as ReactExternalStore, property);
      const value = Reflect.get(inner, property, receiver);
      if (typeof value !== 'function' || !mutators.has(property)) return value;
      const cached = methodCache.get(property);
      if (cached?.source === value) return cached.wrapped;
      const wrapped = (...args: unknown[]) => {
        try {
          const result = Reflect.apply(value, receiver, args);
          notify();
          if (result && typeof (result as unknown as PromiseLike<unknown>).then === 'function') {
            void Promise.resolve(result).finally(notify);
          }
          return result;
        } catch (error) {
          notify();
          throw error;
        }
      };
      methodCache.set(property, { source: value, wrapped });
      return wrapped;
    },
    set(inner, property, value, receiver) {
      const before = Reflect.get(inner, property, receiver);
      const changed = Reflect.set(inner, property, value, receiver);
      if (changed && !Object.is(before, Reflect.get(inner, property, receiver))) notify(property);
      return changed;
    },
  });
}

export function runReactStoreAction<T>(store: ReactExternalStore, action: () => T): T {
  try {
    const result = action();
    if (result && typeof (result as unknown as PromiseLike<unknown>).then === 'function') {
      void Promise.resolve(result).finally(store.reactNotify);
    } else {
      store.reactNotify();
    }
    return result;
  } catch (error) {
    store.reactNotify();
    throw error;
  }
}
