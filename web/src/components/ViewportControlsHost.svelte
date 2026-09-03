<script lang="ts">
  import { onMount } from 'svelte';
  import { createElement } from 'react';
  import { createRoot, type Root } from 'react-dom/client';
  import { ViewportControls } from '../react/components/ViewportControls';

  type Props = {
    mode: '2d' | '3d';
    top: number;
    onFit(): void;
    onView?: (view: 'top' | 'front' | 'side') => void;
    onToggleCamera?: () => void;
  };
  let { mode, top, onFit, onView, onToggleCamera }: Props = $props();
  let host: HTMLSpanElement;
  let root: Root | undefined;

  function render() {
    root?.render(createElement(ViewportControls, { mode, top, onFit, onView, onToggleCamera }));
  }

  $effect(render);
  onMount(() => {
    root = createRoot(host);
    render();
    return () => root?.unmount();
  });
</script>

<span class="react-viewport-controls-host" bind:this={host}></span>

<style>
  .react-viewport-controls-host { display: contents; }
</style>
