import { useSyncExternalStore } from 'react';
import { localeExternalStore, t } from '../../lib/i18n/store';
import { historyStore, uiStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';
import './GlobalNotifications.css';

export function GlobalNotifications() {
  useStoreRevision(uiStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);

  return <>
    {uiStore.toasts.length > 0 && <div className="react-global-notifications toast-container" role="status" aria-live="polite">
      {uiStore.toasts.map((toast) => <div className={`toast toast-${toast.type}`} key={toast.id}>
        <span>{toast.message}</span>
        {toast.actionId === 'kinematic' && <button type="button" className="toast-action" onClick={() => {
          uiStore.showKinematicPanel = true;
          uiStore.dismissToast(toast.id);
        }}>{t('app.viewKinematic')}</button>}
        <button type="button" className="toast-dismiss" onClick={() => uiStore.dismissToast(toast.id)} title="Dismiss" aria-label="Dismiss">×</button>
      </div>)}
    </div>}

    {uiStore.liveCalcError && <div className="react-live-calc-error live-calc-error" role="alert">
      <span className="live-calc-error-msg">{uiStore.liveCalcError}</span>
      <span className="live-calc-error-actions">
        <button type="button" onClick={() => {
          uiStore.liveCalc = false;
          uiStore.liveCalcError = null;
          uiStore.toast(t('app.liveCalcDisabledMsg'), 'info');
        }}>{t('app.disableLiveCalc')}</button>
        <span className="live-calc-error-sep">·</span>
        <button type="button" onClick={() => historyStore.undo()}>{t('app.undoLastAction')}</button>
      </span>
    </div>}
  </>;
}
