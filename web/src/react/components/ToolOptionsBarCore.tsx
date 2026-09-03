import { useSyncExternalStore } from 'react';
import { t, localeExternalStore } from '../../lib/i18n/store.svelte';
import { IL_QUANTITY_GROUPS } from '../../lib/influence-line-quantities';
import { modelStore, resultsStore, uiStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';
import { ToolElementOptions, ToolLoadOptions, ToolNodeOptions, ToolSupportOptions } from './FloatingToolOptions';
import './ToolOptionsBarCore.css';

const OPTION_TOOLS = ['select', 'node', 'element', 'support', 'load', 'influenceLine'];

function currentModelState(): { key: string; tone: 'ok' | 'warn' | 'idle' } {
  if (resultsStore.results != null || resultsStore.results3D != null) return { key: 'status.resolved', tone: 'ok' };
  if (modelStore.nodes.size === 0) return { key: 'status.hintCreateNodes', tone: 'idle' };
  if (modelStore.elements.size === 0) return { key: 'status.hintConnectBars', tone: 'idle' };
  if (modelStore.supports.size === 0) return { key: 'status.hintAddSupports', tone: 'idle' };
  if (modelStore.model.loads.length === 0) return { key: 'status.hintAddLoads', tone: 'idle' };
  return { key: 'status.hintReadyToSolve', tone: 'warn' };
}

export function ToolOptionsBarCore() {
  useStoreRevision(uiStore);
  useStoreRevision(modelStore);
  useStoreRevision(resultsStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const tool = uiStore.currentTool;
  const state = currentModelState();
  const showOptions = OPTION_TOOLS.includes(tool);

  return <>
    <div className="tb-opts" data-testid="tool-options">
      {showOptions ? <>
        <span className="tb-tool-name">{t(`float.${tool}`)}</span><span className="tb-sep" aria-hidden="true" />
        {tool === 'node' && <ToolNodeOptions />}
        {tool === 'element' && <ToolElementOptions />}
        {tool === 'support' && <ToolSupportOptions />}
        {tool === 'load' && <ToolLoadOptions />}
        {tool === 'influenceLine' && IL_QUANTITY_GROUPS.map((group, index) => <span className="tb-group" key={group.labelKey}>
          {index > 0 && <span className="tb-sep" aria-hidden="true" />}
          <span className="tb-group-label">{t(group.labelKey)}</span>
          {group.quantities.map((quantity) => <button className={`tb-btn${uiStore.ilQuantity === quantity.id ? ' on' : ''}`} onClick={() => { uiStore.ilQuantity = quantity.id; }} key={quantity.id}>{t(quantity.labelKey)}</button>)}
        </span>)}
      </> : <span className="tb-hint">{t(`float.${tool}`)}</span>}
    </div>
    <div className="tb-state" data-testid="model-state" data-tone={state.tone}>
      <span className="tb-dot" data-tone={state.tone} aria-hidden="true" /><span className="tb-state-text">{t(state.key)}</span>
    </div>
  </>;
}
