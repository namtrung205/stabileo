<script lang="ts">
  import { modelStore, uiStore } from '../lib/store';
  import FloatingToolsCoreHost from './FloatingToolsCoreHost.svelte';
  import SelectedEntityPanel from './floating-tools/SelectedEntityPanel.svelte';

  $effect(() => {
    if (!modelStore.loadCases.find((loadCase) => loadCase.id === uiStore.activeLoadCaseId)) {
      uiStore.activeLoadCaseId = modelStore.loadCases[0]?.id ?? 1;
    }
  });

  const hasOptions = $derived(['select', 'node', 'element', 'support', 'load', 'influenceLine'].includes(uiStore.currentTool));
  const hasSelectedEntity = $derived(uiStore.selectedLoads.size > 0 || uiStore.selectedSupports.size > 0);

  $effect(() => {
    if (!uiStore.showFloatingTools) {
      uiStore.floatingToolsRows = 0;
      return;
    }
    uiStore.floatingToolsRows = 1 + (hasOptions ? 1 : 0) + (hasSelectedEntity ? 1 : 0);
  });
</script>

{#if uiStore.showFloatingTools}
  <div class="floating-tools" data-tour="floating-tools">
    <FloatingToolsCoreHost mode="main" />
    <SelectedEntityPanel />
  </div>
{:else}
  <FloatingToolsCoreHost mode="reopen" />
{/if}
