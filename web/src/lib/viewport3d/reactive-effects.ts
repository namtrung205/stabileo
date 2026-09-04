import {
  trackReactStoreReads,
  type ReactExternalStore,
} from '../store/react-external-store';

type StoreEffect = {
  run(): void;
  dependencies: Map<ReactExternalStore, Set<PropertyKey>>;
  initialized: boolean;
};

type InitialEffectScheduler = {
  deferInitial?: boolean;
  initialBatchSize?: number;
  scheduleInitial?: (run: () => void) => ReturnType<typeof setTimeout>;
  cancelInitial?: (handle: ReturnType<typeof setTimeout>) => void;
};

/**
 * Framework-neutral replacement for the fine-grained store reads formerly
 * supplied by Svelte `$effect`. Store changes are batched into one microtask,
 * and only effects that read the changed property are rerun.
 */
export function createStoreEffectScope(stores: readonly ReactExternalStore[]) {
  const effects: StoreEffect[] = [];
  const pending = new Set<StoreEffect>();
  let unsubscribers: Array<() => void> = [];
  let scheduled = false;
  let active = false;
  let initialHandle: ReturnType<typeof setTimeout> | null = null;
  let initialIndex = 0;
  let cancelInitial: (handle: ReturnType<typeof setTimeout>) => void = clearTimeout;

  const execute = (effect: StoreEffect) => {
    const dependencies = new Map<ReactExternalStore, Set<PropertyKey>>();
    trackReactStoreReads((store, property) => {
      let properties = dependencies.get(store);
      if (!properties) dependencies.set(store, properties = new Set());
      properties.add(property);
    }, effect.run);
    effect.dependencies = dependencies;
    effect.initialized = true;
  };

  const flush = () => {
    scheduled = false;
    if (!active) { pending.clear(); return; }
    const batch = [...pending];
    pending.clear();
    for (const effect of batch) execute(effect);
    if (pending.size > 0 && !scheduled) {
      scheduled = true;
      queueMicrotask(flush);
    }
  };

  const enqueue = (effect: StoreEffect) => {
    pending.add(effect);
    if (!scheduled) {
      scheduled = true;
      queueMicrotask(flush);
    }
  };

  return {
    effect(run: () => void) {
      effects.push({ run, dependencies: new Map(), initialized: false });
    },
    start(options: InitialEffectScheduler = {}) {
      if (active) return;
      active = true;
      unsubscribers = stores.map((store) => store.reactSubscribe((property) => {
        for (const effect of effects) {
          // A deferred initial run always observes the latest store state. Do
          // not pull not-yet-initialized effects back into a synchronous
          // microtask flush when a store changes during viewport startup.
          if (!effect.initialized) continue;
          const properties = effect.dependencies.get(store);
          if (property === undefined || properties?.has(property)) enqueue(effect);
        }
      }));
      if (!options.deferInitial) {
        for (const effect of effects) execute(effect);
        return;
      }

      const batchSize = Math.max(1, Math.floor(options.initialBatchSize ?? 1));
      const scheduleInitial = options.scheduleInitial ?? ((run) => setTimeout(run, 0));
      cancelInitial = options.cancelInitial ?? clearTimeout;
      initialIndex = 0;
      for (const effect of effects) effect.initialized = false;
      const runBatch = () => {
        initialHandle = null;
        if (!active) return;
        const end = Math.min(initialIndex + batchSize, effects.length);
        while (initialIndex < end) execute(effects[initialIndex++]);
        if (initialIndex < effects.length) initialHandle = scheduleInitial(runBatch);
      };
      initialHandle = scheduleInitial(runBatch);
    },
    dispose() {
      active = false;
      pending.clear();
      if (initialHandle !== null) {
        cancelInitial(initialHandle);
        initialHandle = null;
      }
      for (const unsubscribe of unsubscribers) unsubscribe();
      unsubscribers = [];
    },
  };
}
