import { useLayoutEffect, useState } from 'react';

/** Finds a mount point created by the transitional Svelte shell and follows it
 * across shell remounts without adding a layout wrapper. */
export function useEditorPortalTarget(selector: string) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const find = () => setTarget(document.querySelector<HTMLElement>(selector));
    find();
    const observer = new MutationObserver(find);
    observer.observe(document.getElementById('app') ?? document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [selector]);

  return target;
}
