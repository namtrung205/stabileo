import { useEffect, useLayoutEffect, useRef } from 'react';
import { mount, unmount } from 'svelte';

/** Temporary leaf bridge: React owns layout/lifecycle while an unmigrated report remains Svelte. */
export function LegacySvelteSurface({ component, props = {} }: { component: unknown; props?: Record<string, unknown> }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    const instance = mount(component as never, { target: host.current, props });
    return () => { void unmount(instance); };
  }, [component]);
  return <div ref={host} style={{ display: 'contents' }} />;
}

/**
 * Transitional bridge for a stateful leaf that must receive live React props.
 * The Svelte adapter exposes `updateProps`; keeping one mounted instance avoids
 * destroying pointer capture or local overlay state during slider movement.
 */
export function UpdatingSvelteSurface({ component, props }: { component: unknown; props: Record<string, unknown> }) {
  const host = useRef<HTMLDivElement>(null);
  const instance = useRef<Record<string, unknown> | null>(null);
  useLayoutEffect(() => {
    if (!host.current) return;
    instance.current = mount(component as never, { target: host.current, props }) as Record<string, unknown>;
    return () => { if (instance.current) void unmount(instance.current); instance.current = null; };
  }, [component]);
  useLayoutEffect(() => {
    const update = instance.current?.updateProps;
    if (typeof update === 'function') update(props.initial ?? props);
  }, [props]);
  return <div ref={host} style={{ display: 'contents' }} />;
}
