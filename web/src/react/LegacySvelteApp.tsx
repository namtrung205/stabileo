import { useLayoutEffect, useRef } from 'react';
import { mount, unmount } from 'svelte';
import LegacyApp from '../App.svelte';

/**
 * The single compatibility seam used while screens move to React.
 *
 * React already owns #app and the application lifecycle. Until a screen has a
 * React equivalent this component mounts the current Svelte tree verbatim, so
 * layout, keyboard behavior, canvas ownership and Three.js disposal semantics
 * do not change merely because the migration has started.
 *
 * This file is deliberately tiny. New React code must not import individual
 * Svelte components; converted screens are selected above this boundary and
 * this component disappears when the final screen is ported.
 */
export function LegacySvelteApp() {
  const hostRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const app = mount(LegacyApp, { target: host });
    return () => {
      void unmount(app);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="legacy-svelte-root"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
