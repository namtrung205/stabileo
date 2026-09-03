import { useEffect, useRef } from 'react';
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
