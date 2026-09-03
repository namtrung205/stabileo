import { useSyncExternalStore } from 'react';
import { t, localeExternalStore } from '../../lib/i18n/store.svelte';
import { uiStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';
import { Icon, type IconName } from './Icon';
import './PointerModeButton.css';

const TOOL_LABEL: Record<string, string> = {
  node: 'float.node',
  element: 'float.element',
  support: 'float.support',
  load: 'float.load',
  influenceLine: 'float.influenceLine',
};

const TOOL_ICON: Partial<Record<string, IconName>> = {
  node: 'node', element: 'element', support: 'support', load: 'load',
};

export function PointerModeButton() {
  useStoreRevision(uiStore);
  useSyncExternalStore(
    localeExternalStore.subscribe,
    localeExternalStore.getSnapshot,
    localeExternalStore.getSnapshot,
  );

  const tool = uiStore.currentTool;
  const isPan = tool === 'pan';
  const isSelect = tool === 'select';
  const iconName: IconName = isPan ? 'pan' : isSelect ? 'select' : (TOOL_ICON[tool] ?? 'select');
  const mode = isPan
    ? (uiStore.analysisMode === '3d' ? t('viewport.modePan3d') : t('viewport.modePan'))
    : isSelect ? t('viewport.modeSelect') : t(TOOL_LABEL[tool] ?? 'float.select');
  const action = isSelect ? t('viewport.clickToPan') : t('viewport.clickToSelect');

  function toggle() {
    uiStore.currentTool = isSelect ? 'pan' : 'select';
  }

  return (
    <div className="pm-wrap">
      <button
        className={`pointer-mode${isPan ? ' panning' : ''}`}
        onClick={toggle}
        aria-label={isSelect ? t('viewport.switchToPan') : t('viewport.switchToSelect')}
        aria-pressed={isPan}
        data-testid="pointer-mode"
      >
        <Icon name={iconName} size={17} />
      </button>
      <div className="pm-tip" role="tooltip">
        <p className="pm-tip-mode">{mode}</p>
        {isSelect && <p className="pm-tip-note">{t('viewport.selectKindHint')}</p>}
        <p className="pm-tip-action">{action}</p>
      </div>
    </div>
  );
}
