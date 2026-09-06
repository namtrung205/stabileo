import { useSyncExternalStore } from 'react';
import { t, localeExternalStore } from '../../lib/i18n/store';
import { uiStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';
import './SelectionPanel.css';

const MODES = [
  { id: 'elements', key: 'float.selectElements', hint: 'float.selectElementsHint' },
  { id: 'nodes', key: 'float.selectNodes', hint: 'float.selectNodesHint' },
  { id: 'supports', key: 'float.selectSupports', hint: 'float.selectSupportsHint' },
  { id: 'loads', key: 'float.selectLoads', hint: 'float.selectLoadsHint' },
] as const;

export function SelectionPanel() {
  useStoreRevision(uiStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);

  return <div className="sel-panel">
    <label className="sel-multi">
      <input
        type="checkbox"
        checked={uiStore.multiKindSelect}
        onChange={(event) => { uiStore.multiKindSelect = event.currentTarget.checked; }}
        data-testid="multi-kind"
      />
      <span>{t('selection.multi')}</span>
    </label>
    <p className="sel-intro">{uiStore.multiKindSelect ? t('selection.multiHelp') : t('selection.intro')}</p>
    <div className="sel-list" role="group" aria-label={t('ribbon.selection')}>
      {MODES.map((mode) => {
        const on = uiStore.selectsKind(mode.id);
        return <button
          className={`sel-item${on ? ' on' : ''}`}
          aria-pressed={on}
          onClick={() => uiStore.toggleSelectKind(mode.id)}
          data-testid={`select-mode-${mode.id}`}
          key={mode.id}
        >
          <span className="sel-name">
            {uiStore.multiKindSelect && <span className="sel-tick" aria-hidden="true">{on ? '☑' : '☐'}</span>}
            {t(mode.key)}
          </span>
          <span className="sel-hint">{t(mode.hint)}</span>
        </button>;
      })}
    </div>
    <p className="sel-note">{t('selection.dragNote')}</p>
  </div>;
}
