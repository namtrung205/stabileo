/**
 * Plain TypeScript state helpers used by the React-owned stores.
 *
 * Store APIs publish their own React revision notifications through
 * `makeReactObservable`; these helpers only initialise closure-backed values
 * and create serialisable snapshots without depending on a UI framework.
 */
export function stateValue<T>(initial: T): T {
  return initial;
}

export function snapshotState<T>(value: T): T {
  return structuredClone(value);
}

/** Compatibility for dormant framework-neutral stores retained as domain code. */
export function derivedValue<T>(value: T): T {
  return value;
}
