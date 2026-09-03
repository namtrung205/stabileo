import { useSyncExternalStore } from 'react';
import { t, localeExternalStore } from '../../lib/i18n/store.svelte';
import { modelStore, uiStore } from '../../lib/store';
import { TOOL_KEYS, type ToolKeyId } from '../../lib/tool-keys';
import { IL_QUANTITY_GROUPS } from '../../lib/influence-line-quantities';
import { useStoreRevision } from '../store/useStoreRevision';
import { Icon, type IconName } from './Icon';
import { ToolElementOptions, ToolLoadOptions, ToolNodeOptions, ToolSelectOptions, ToolSupportOptions } from './FloatingToolOptions';
import './FloatingToolsCore.css';

const TOOL_DISPLAY: Record<ToolKeyId, { icon: IconName; labelKey: string }> = {
  pan: { icon: 'pan', labelKey: 'float.pan' },
  select: { icon: 'select', labelKey: 'float.select' },
  node: { icon: 'node', labelKey: 'float.node' },
  element: { icon: 'element', labelKey: 'float.element' },
  support: { icon: 'support', labelKey: 'float.support' },
  load: { icon: 'load', labelKey: 'float.load' },
};
const TOOLS = TOOL_KEYS.map((tool) => ({ ...tool, ...TOOL_DISPLAY[tool.id] }));

export function FloatingToolsCore({ mode }: { mode: 'main' | 'reopen' }) {
  useStoreRevision(uiStore);
  useStoreRevision(modelStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);

  if (mode === 'reopen') {
    return <button className="ft-reopen" onClick={() => { uiStore.showFloatingTools = true; }} title={t('float.showTools')}>↖</button>;
  }

  const tool = uiStore.currentTool;
  const hasOptions = ['select', 'node', 'element', 'support', 'load', 'influenceLine'].includes(tool);
  return <>
    <div className="ft-main">
      {TOOLS.map((item) => <button className={`ft-btn${tool === item.id ? ' active' : ''}`} onClick={() => { uiStore.currentTool = item.id; }} title={`${t(item.labelKey)} (${item.key})`} key={item.id}>
        <span className="ft-icon"><Icon name={item.icon} size={19} /></span><span className="ft-label">{t(item.labelKey)}</span>
      </button>)}
      <button className="ft-close" onClick={() => { uiStore.showFloatingTools = false; }} title={t('float.hideBar')}>✕</button>
    </div>
    {hasOptions && <div className="ft-options">
      {tool === 'select' && <ToolSelectOptions />}
      {tool === 'node' && <ToolNodeOptions />}
      {tool === 'element' && <ToolElementOptions />}
      {tool === 'support' && <ToolSupportOptions />}
      {tool === 'load' && <ToolLoadOptions />}
      {tool === 'influenceLine' && <>
        {IL_QUANTITY_GROUPS.map((group, index) => <span className="ft-il-wrap" key={group.labelKey}>{index > 0 && <span className="ft-sep">|</span>}<span className="ft-il-group"><span className="ft-il-label">{t(group.labelKey)}</span>{group.quantities.map((quantity) => <button className={`ft-il-btn${uiStore.ilQuantity === quantity.id ? ' active' : ''}`} onClick={() => { uiStore.ilQuantity = quantity.id; }} key={quantity.id}>{t(quantity.labelKey)}</button>)}</span></span>)}
        <span className="ft-hint">{t('float.ilHint')}</span>
      </>}
    </div>}
  </>;
}
