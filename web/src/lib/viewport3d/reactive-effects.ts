import {
  trackReactStoreReads,
  type ReactExternalStore,
} from '../store/react-external-store';

type StoreEffect = {
  run(): void;
  dependencies: Map<ReactExternalStore, Set<PropertyKey>>;
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

  const execute = (effect: StoreEffect) => {
    const dependencies = new Map<ReactExternalStore, Set<PropertyKey>>();
    trackReactStoreReads((store, property) => {
      let properties = dependencies.get(store);
      if (!properties) dependencies.set(store, properties = new Set());
      properties.add(property);
    }, effect.run);
    effect.dependencies = dependencies;
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
      effects.push({ run, dependencies: new Map() });
    },
    start() {
      if (active) return;
      active = true;
      unsubscribers = stores.map((store) => store.reactSubscribe((property) => {
        for (const effect of effects) {
          const properties = effect.dependencies.get(store);
          if (property === undefined || properties?.has(property)) enqueue(effect);
        }
      }));
      for (const effect of effects) execute(effect);
    },
    dispose() {
      active = false;
      pending.clear();
      for (const unsubscribe of unsubscribers) unsubscribe();
      unsubscribers = [];
    },
  };
}
