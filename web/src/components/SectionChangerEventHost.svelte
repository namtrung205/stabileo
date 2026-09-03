<script lang="ts">
  import SectionChanger from './SectionChanger.svelte';
  import type { SteelProfile } from '../lib/data/steel-profiles';
  import type { SectionProperties } from '../lib/data/section-shapes';

  type Request = {
    is3D?: boolean;
    onprofileselect?: (profile: SteelProfile, section: { a: number; iy: number; iz: number; b: number; h: number }, region?: string | null) => void;
    onshapeselect?: (name: string, props: SectionProperties) => void;
    onamorphousselect?: (data: { name: string; a: number; iy: number; iz: number; j?: number }) => void;
    onclose?: () => void;
  };
  let request = $state<Request | null>(null);
  $effect(() => {
    const open = (event: Event) => { request = (event as CustomEvent<Request>).detail; };
    window.addEventListener('stabileo-open-section-changer', open);
    return () => window.removeEventListener('stabileo-open-section-changer', open);
  });
  function close() { request?.onclose?.(); request = null; }
</script>

<SectionChanger
  open={request !== null}
  onprofileselect={(profile, section, region) => { request?.onprofileselect?.(profile, section, region); close(); }}
  onshapeselect={(name, props) => { request?.onshapeselect?.(name, props); close(); }}
  onamorphousselect={(data) => { request?.onamorphousselect?.(data); close(); }}
  onclose={close}
  is3D={request?.is3D ?? false}
/>
