import { BasicHeaderActions, BasicHeaderIdentity } from '../components/BasicHeader';
import { BasicPanelController } from '../components/BasicPanelController';
import { BasicRibbon } from '../components/BasicRibbon';
import { BasicWorkspace } from '../components/BasicWorkspace';
import { CadImportEventHost } from '../components/CadImportWizard';
import { GlobalNotifications } from '../components/GlobalNotifications';
import { IfcImportEventHost } from '../components/IfcImportDialog';
import { ImportCoordinatesDialog } from '../components/ImportCoordinatesDialog';
import { SectionChangerEventHost } from '../components/SectionChanger';
import { StatusBar } from '../components/StatusBar';
import { TabBar } from '../components/TabBar';
import { ToolOptionsBarCore } from '../components/ToolOptionsBarCore';
import { TourOverlay } from '../components/TourOverlay';
import { uiStore } from '../../lib/store';
import { t } from '../../lib/i18n';
import { useBasicEditorLifecycle } from './useBasicEditorLifecycle';
import './BasicEditorApp.css';

export function BasicEditorApp() {
  const { offer, showAutosave, restoreAutosave, discardAutosave } = useBasicEditorLifecycle();
  const mobile = uiStore.isMobile;

  return <div className={`react-basic-editor app-container${uiStore.embedMode ? ' embed-mode' : ''}`}>
    <header className={`app-header${showAutosave ? ' has-autosave' : ''}`}>
      <BasicHeaderIdentity />
      <span className="separator">|</span>
      <TabBar />
      {showAutosave && offer && <div className={`autosave-inline${offer.older ? ' autosave-older' : ''}`} data-testid="autosave-prompt">
        <span className="autosave-text">
          {t('app.autosaveFound')} <strong>{offer.data.name}</strong>
          {offer.timestamp && <span className="autosave-stamp"> ({new Date(offer.timestamp).toLocaleString()})</span>}
        </span>
        {offer.older && <span className="autosave-warning">{t('file.autosaveOlderRestored')}</span>}
        <button type="button" className="banner-btn restore" onClick={restoreAutosave}>{t('app.restore')}</button>
        <button type="button" className="banner-btn discard" onClick={discardAutosave}>{t('app.discard')}</button>
      </div>}
      <BasicHeaderActions />
    </header>

    {!mobile && <>
      <BasicRibbon />
      <ToolOptionsBarCore />
    </>}

    <div className="app-body"><BasicWorkspace /></div>
    {!mobile && <footer className="app-footer"><StatusBar /></footer>}

    <BasicPanelController />
    <SectionChangerEventHost />
    <GlobalNotifications />
    <CadImportEventHost />
    <IfcImportEventHost />
    <ImportCoordinatesDialog />
    <TourOverlay />
  </div>;
}

