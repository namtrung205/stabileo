<script lang="ts">
  import { onMount } from 'svelte';
  import { createElement } from 'react';
  import { createRoot } from 'react-dom/client';
  import { ToolOptionsBarCore } from '../react/components/ToolOptionsBarCore';
  let host: HTMLSpanElement;
  onMount(() => { const root = createRoot(host); root.render(createElement(ToolOptionsBarCore)); return () => root.unmount(); });
</script>
<span class="react-tool-options-host" bind:this={host}></span>
<style>.react-tool-options-host { display: contents; }</style>
