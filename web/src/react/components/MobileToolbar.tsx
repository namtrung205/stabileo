import { useSyncExternalStore } from 'react';
import { localeExternalStore, t } from '../../lib/i18n/store';
import { historyStore, modelStore, uiStore } from '../../lib/store';
import { hasBackup, needsPlaneChoice, restore3D, switchPlain } from '../../lib/store/switch-2d';
import { useStoreRevision } from '../store/useStoreRevision';
import { ToolbarAdvanced } from './ToolbarAdvanced';
import { ToolbarConfig } from './ToolbarConfig';
import { ToolbarExamples } from './ToolbarExamples';
import { ToolbarProject } from './ToolbarProject';
import { ToolbarResults } from './ToolbarResults';
import './MobileToolbar.css';

export function MobileToolbar() {
  useStoreRevision(uiStore); useStoreRevision(modelStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const threeD = uiStore.analysisMode === '3d';
  const switch2D = () => { if (needsPlaneChoice()) uiStore.switchTo2DPrompt = true; else switchPlain(); };
  const switch3D = () => { if (hasBackup()) restore3D(); else uiStore.analysisMode = '3d'; };
  return <div className="react-mobile-toolbar">
    <div className="toolbar-section"><div className="undo-redo-row"><button className="undo-redo-btn" onClick={() => historyStore.undo()} disabled={!historyStore.canUndo} title={t('toolbar.undo')}>↶ {t('toolbar.undo')}</button><button className="undo-redo-btn" onClick={() => historyStore.redo()} disabled={!historyStore.canRedo} title={t('toolbar.redo')}>↷ {t('toolbar.redo')}</button></div></div>
    {uiStore.appMode === 'basico' && <div className="toolbar-section dim-toggle-section"><div className="dim-toggle"><button className={!threeD ? 'active' : ''} onClick={switch2D}>2D</button><button className={threeD ? 'active' : ''} onClick={switch3D}>3D</button></div></div>}
    <ToolbarResults /><ToolbarAdvanced /><ToolbarExamples />
    <div data-tour="config-project-section" className="config-project-section"><ToolbarConfig /><ToolbarProject /></div>
  </div>;
}
