<script lang="ts">
  import { onMount } from 'svelte';
  import { createElement } from 'react';
  import { createRoot, type Root } from 'react-dom/client';
  import { FloatingToolsCore } from '../react/components/FloatingToolsCore';
  let { mode }: { mode: 'main' | 'reopen' } = $props();
  let host: HTMLSpanElement;
  let root: Root | undefined;
  function render() { root?.render(createElement(FloatingToolsCore, { mode })); }
  $effect(render);
  onMount(() => { root = createRoot(host); render(); return () => root?.unmount(); });
</script>
<span class="react-floating-tools-host" bind:this={host}></span>
<style>.react-floating-tools-host { display: contents; }</style>
