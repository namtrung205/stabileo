import { useSyncExternalStore } from 'react';
import { localeExternalStore, t } from '../../lib/i18n/store';
import { dsmStepsStore, uiStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';
import { DataTable } from './DataTable';
import { DSMStepWizard } from './DSMStepWizard';
import { MobileToolbar } from './MobileToolbar';
import { PropertyPanel } from './PropertyPanel';
import './BasicMobileShell.css';

export function BasicMobileShell() {
  useStoreRevision(uiStore);
  useStoreRevision(dsmStepsStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  if (!uiStore.isMobile || uiStore.appMode !== 'basico') return null;

  return <div className="react-basic-mobile-shell">
    {uiStore.leftDrawerOpen && <>
      <button type="button" className="drawer-backdrop" onClick={() => { uiStore.leftDrawerOpen = false; }} aria-label={t('app.cancel')} />
      <aside className="drawer drawer-left"><MobileToolbar /></aside>
    </>}
    {uiStore.rightDrawerOpen && <>
      <button type="button" className="drawer-backdrop" onClick={() => { uiStore.rightDrawerOpen = false; }} aria-label={t('app.cancel')} />
      <aside className="drawer drawer-right" data-tour="right-sidebar">
        {dsmStepsStore.isOpen ? <DSMStepWizard /> : <>
          <PropertyPanel />
          <button type="button" className="datatable-toggle" onClick={() => { uiStore.showDataTable = !uiStore.showDataTable; }}>
            {uiStore.showDataTable ? '▾' : '▸'} {t('app.modelData')}
          </button>
          {uiStore.showDataTable && <div className="data-table-sidebar"><DataTable /></div>}
        </>}
      </aside>
    </>}
    <nav className="mobile-bottom-bar">
      <button type="button" className="mobile-bar-btn" onClick={() => { uiStore.leftDrawerOpen = !uiStore.leftDrawerOpen; }} title={t('app.tools')} aria-label={t('app.tools')}>☰</button>
      <button type="button" className="mobile-bar-btn" onClick={() => { uiStore.rightDrawerOpen = !uiStore.rightDrawerOpen; }} title={t('app.properties')} aria-label={t('app.properties')}>⚙</button>
    </nav>
  </div>;
}
