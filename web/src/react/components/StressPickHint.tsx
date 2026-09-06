import { useSyncExternalStore } from 'react';
import { localeExternalStore, t } from '../../lib/i18n/store';
import { resultsStore, uiStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';
import './StressPickHint.css';

export function StressPickHint() {
  useStoreRevision(uiStore);
  useStoreRevision(resultsStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  if (uiStore.selectMode !== 'stress' || resultsStore.stressQuery !== null) return null;
  return <div className="sph" role="status">
    <span className="sph-icon" aria-hidden="true">◎</span>
    <span className="sph-text">{t('stress.pickHint')}</span>
  </div>;
}
