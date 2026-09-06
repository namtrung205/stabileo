import { useEffect, useRef, useState, useSyncExternalStore, type ChangeEvent } from 'react';
import { localeExternalStore, t } from '../../lib/i18n/store';
import {
  downloadDXF,
  downloadExcel,
  downloadResultsCSV,
  downloadSVG,
  isMode3D,
  loadFile,
  saveProject,
  saveSession,
} from '../../lib/store/file';
import { resultsStore, tabManager, uiStore } from '../../lib/store';
import { generateShareURL, loadFromShareLink, MAX_URL_SAFE } from '../../lib/utils/url-sharing';
import { useStoreRevision } from '../store/useStoreRevision';
import { ToolbarExamples } from './ToolbarExamples';
import { DemoMenu } from './DemoMenu';
import './ToolbarProject.css';

export function ToolbarProject({ flat = false }: { flat?: boolean }) {
  useStoreRevision(uiStore);
  useStoreRevision(resultsStore);
  useStoreRevision(tabManager);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const fileInput = useRef<HTMLInputElement>(null);
  const [showProject, setShowProject] = useState(false);
  const [showExtras, setShowExtras] = useState(false);

  useEffect(() => {
    const openProject = () => setShowProject(true);
    const closeProject = () => setShowProject(false);
    window.addEventListener('stabileo-open-project', openProject);
    window.addEventListener('stabileo-close-project', closeProject);
    return () => {
      window.removeEventListener('stabileo-open-project', openProject);
      window.removeEventListener('stabileo-close-project', closeProject);
    };
  }, []);

  async function copyShareLink() {
    const result = generateShareURL();
    if (!result) {
      uiStore.toast(t('project.emptyModel'), 'error');
      return;
    }
    if (result.length > MAX_URL_SAFE) {
      uiStore.toast(t('project.longLink').replace('{n}', String(result.length)), 'info');
    }
    await navigator.clipboard.writeText(result.url);
    uiStore.toast(t('project.linkCopied'), 'success');
  }

  async function pasteShareLink() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || (!text.includes('#data=') && !text.includes('#embed='))) {
        uiStore.toast(t('project.noLinkFound'), 'error');
        return;
      }
      tabManager.createTab();
      if (!loadFromShareLink(text)) {
        uiStore.toast(t('project.invalidLink'), 'error');
        return;
      }
      tabManager.syncActiveTabName();
      uiStore.toast(t('project.linkLoadedNewTab'), 'success');
    } catch {
      uiStore.toast(t('project.clipboardError'), 'error');
    }
  }

  async function loadProject(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    try {
      const result = await loadFile(file);
      if (result.type === 'session') {
        uiStore.toast(t('project.sessionRestored').replace('{n}', String(result.count)), 'success');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : t('project.loadError'));
    }
    event.currentTarget.value = '';
  }

  const visible = flat || showProject;
  const extrasVisible = flat || showExtras;

  return <>
    <div className="toolbar-section react-toolbar-project" data-tour="project-section">
      {!flat && <button className="section-toggle" onClick={() => setShowProject((value) => !value)}>
        {showProject ? '▾' : '▸'} {t('project.title')}
      </button>}

      {visible && <>
        {flat && <h4 className="proj-heading">{t('project.fileSection')}</h4>}
        <div className="file-grid">
          <button className="file-btn" onClick={() => saveProject()} title={t('project.saveTabTooltip')}>{t('project.saveTab')}</button>
          <button className="file-btn" onClick={() => saveSession()} title={t('project.saveSessionTooltip')}>{t('project.saveSession')}</button>
          <button className="file-btn" onClick={() => fileInput.current?.click()} title={t('project.openTooltip')}>{t('project.open')}</button>
        </div>

        <div className="proj-block"><ToolbarExamples flat /></div>
        <div className="proj-block"><DemoMenu /></div>

        {flat
          ? <h4 className="proj-heading">{t('project.exportImport')}</h4>
          : <button className="sub-section-toggle" onClick={() => setShowExtras((value) => !value)}>
              {showExtras ? '▾' : '▸'} {t('project.exportImport')}
            </button>}

        {extrasVisible && <div className="sub-section-content">
          <span className="file-sub-header">{t('project.export')}</span>
          <div className="file-grid">
            <button className="file-btn" onClick={() => void downloadExcel()} title={t('project.exportExcelTooltip')}>Excel</button>
            <button className="file-btn" onClick={() => window.dispatchEvent(new Event('stabileo-open-calc-report'))} title={t('project.exportPdfTooltip')}>PDF</button>
            <button className="file-btn" onClick={() => downloadDXF()} disabled={isMode3D(uiStore.analysisMode)} title={isMode3D(uiStore.analysisMode) ? t('project.inDev3d') : t('project.exportDxfTooltip')}>DXF</button>
            <button className="file-btn" onClick={() => downloadSVG()} disabled={isMode3D(uiStore.analysisMode)} title={isMode3D(uiStore.analysisMode) ? t('project.inDev3d') : t('project.exportSvgTooltip')}>SVG</button>
            <button className="file-btn" onClick={() => window.dispatchEvent(new CustomEvent('stabileo-export-png'))} title={t('project.exportPngTooltip')}>PNG</button>
            <button className="file-btn" onClick={() => downloadResultsCSV()} disabled={!resultsStore.results && !resultsStore.results3D} title={t('project.exportCsvTooltip')}>CSV</button>
          </div>

          <span className="file-sub-header">{t('project.importLabel')}</span>
          <div className="file-grid">
            <button className="file-btn" onClick={() => fileInput.current?.click()} title={t('project.openDedTooltip')}>{t('project.openDed')}</button>
            <button className="file-btn" onClick={() => window.dispatchEvent(new Event('stabileo-import-dxf'))} title={isMode3D(uiStore.analysisMode) ? t('project.openDxfCadTooltip') : t('project.openDxfTooltip')}>{t('project.openDxf')}</button>
            <button className="file-btn" onClick={() => window.dispatchEvent(new Event('stabileo-import-ifc'))} title={t('project.openIfcTooltip')}>{t('project.openIfc')}</button>
            <button className="file-btn" onClick={() => window.dispatchEvent(new Event('stabileo-import-coords'))} title={t('project.pasteCoordsTooltip')}>{t('project.pasteCoords')}</button>
          </div>

          <span className="file-sub-header">{t('project.share')}</span>
          <div className="file-grid">
            <button className="file-btn" onClick={() => void copyShareLink()} title={t('project.copyLinkTooltip')}>{t('project.copyLink')}</button>
            <button className="file-btn" onClick={() => void pasteShareLink()} title={t('project.pasteLinkTooltip')}>{t('project.pasteLink')}</button>
          </div>
        </div>}
      </>}
    </div>

    <input
      ref={fileInput}
      data-testid="project-open-file"
      type="file"
      accept=".ded,.json"
      style={{ display: 'none' }}
      onChange={(event) => void loadProject(event)}
    />
  </>;
}
