<script lang="ts">
  import SelectedEntityPanel from '../floating-tools/SelectedEntityPanel.svelte';
  import ToolOptionsBarCoreHost from '../ToolOptionsBarCoreHost.svelte';
</script>

<div class="tool-bar" data-testid="tool-options-bar">
  <ToolOptionsBarCoreHost />
  <div class="tb-selection">
    <SelectedEntityPanel />
  </div>
</div>
