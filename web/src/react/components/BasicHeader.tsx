import { useSyncExternalStore } from 'react';
import { i18n, setLocale, t } from '../../lib/i18n';
import { OFFERED_LOCALES, localeExternalStore } from '../../lib/i18n/store';
import { basicPanelStore, openBasicPanel } from '../../lib/store/basic-panel';
import { tabManager, uiStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';
import { Icon } from './Icon';
import './BasicHeader.css';

function useBasicHeaderState(): void {
  useStoreRevision(uiStore);
  useSyncExternalStore(
    localeExternalStore.subscribe,
    localeExternalStore.getSnapshot,
    localeExternalStore.getSnapshot,
  );
}

export function BasicHeaderIdentity() {
  useBasicHeaderState();

  return <div className="react-basic-header-identity logo">
    <button
      type="button"
      className="logo-home"
      onClick={() => window.dispatchEvent(new CustomEvent('stabileo-navigate', { detail: '/' }))}
      title={t('app.backHome')}
    >
      <span className="logo-icon">△</span>
      <span className="logo-text">Stabileo</span>
    </button>
    <span className="mode-label" data-testid="basic-mode-label">{t('app.modeBasic')}</span>
  </div>;
}

export function BasicHeaderActions() {
  useBasicHeaderState();
  const panel = useSyncExternalStore(
    basicPanelStore.subscribe,
    basicPanelStore.getSnapshot,
    basicPanelStore.getSnapshot,
  );

  return <div className="react-basic-header-actions header-actions">
    <button type="button" className="btn btn-help" onClick={() => { uiStore.showHelp = true; }} title={t('app.keyboardShortcuts')}>?</button>
    <select
      className="lang-select"
      data-testid="lang-select"
      aria-label={t('app.language')}
      value={i18n.locale}
      onChange={(event) => {
        setLocale(event.currentTarget.value);
        tabManager.updateDefaultNames();
      }}
    >
      {OFFERED_LOCALES.map((code) => <option value={code} key={code}>{t(`lang.${code}`)}</option>)}
    </select>
    {!uiStore.isMobile && <button
      type="button"
      className={`btn btn-settings${panel.activePanel === 'settings' ? ' on' : ''}`}
      onClick={() => openBasicPanel('settings')}
      title={t('ribbon.settings')}
      aria-label={t('ribbon.settings')}
      aria-pressed={panel.activePanel === 'settings'}
      data-testid="rb-settings"
    ><Icon name="settings" size={16} /></button>}
  </div>;
}
