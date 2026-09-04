import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent } from 'react';
import SectionStressPanel from '../../components/SectionStressPanel.svelte';
import { localeExternalStore, t } from '../../lib/i18n/store.svelte';
import { dsmStepsStore, resultsStore, uiStore } from '../../lib/store';
import { LegacySvelteSurface } from '../LegacySvelteSurface';
import { useStoreRevision } from '../store/useStoreRevision';
import { DataTable, type DataTab } from './DataTable';
import { DSMStepWizard } from './DSMStepWizard';
import { KinematicPanel } from './KinematicPanel';
import { WhatIfPanel } from './WhatIfPanel';
import { SelectionPanel } from './SelectionPanel';
import { ToolbarAdvanced } from './ToolbarAdvanced';
import { ToolbarConfig } from './ToolbarConfig';
import { ToolbarProject } from './ToolbarProject';
import { ToolbarResults } from './ToolbarResults';
import './BasicPanel.css';

const MIN = 240; const MAX = 620; const KEY = 'stabileo-basic-panel-width';
const storedWidth = () => { try { const value = Number(localStorage.getItem(KEY)); return Number.isFinite(value) && value >= MIN && value <= MAX ? value : 320; } catch { return 320; } };

export function BasicPanel() {
  useStoreRevision(uiStore); useStoreRevision(resultsStore); useStoreRevision(dsmStepsStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const [panel, setPanel] = useState<string | null>(null);
  const [dataTab, setDataTab] = useState<DataTab>('nodes');
  const [width, setWidth] = useState(storedWidth);
  const [dragging, setDragging] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null); const lastOpen = useRef(0);
  useEffect(() => {
    const receive = (event: Event) => { const detail = (event as CustomEvent<{activePanel?: string | null; activeDataTab?: string}>).detail; setPanel(detail?.activePanel ?? null); if (detail?.activeDataTab && ['nodes','elements','supports','loads','materials','sections'].includes(detail.activeDataTab)) setDataTab(detail.activeDataTab as DataTab); };
    window.addEventListener('stabileo-basic-panel-state', receive); window.dispatchEvent(new Event('stabileo-request-basic-panel-state'));
    return () => window.removeEventListener('stabileo-basic-panel-state', receive);
  }, []);
  useEffect(() => { document.documentElement.style.setProperty('--st-right-panel-w', `${width}px`); return () => { document.documentElement.style.removeProperty('--st-right-panel-w'); }; }, [width]);
  const openCount = Number(uiStore.showKinematicPanel) + Number(uiStore.showWhatIf) + Number(Boolean(resultsStore.stressQuery));
  useEffect(() => { if (openCount > lastOpen.current) outputRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); lastOpen.current = openCount; }, [openCount]);
  const startResize = (event: ReactPointerEvent) => { const startX = event.clientX, startWidth = width; setDragging(true); const move = (e: PointerEvent) => setWidth(Math.min(MAX, Math.max(MIN, startWidth - (e.clientX - startX)))); const up = () => { setDragging(false); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); try { localStorage.setItem(KEY, String(Math.round(Number.parseFloat(document.documentElement.style.getPropertyValue('--st-right-panel-w'))))); } catch {} }; window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); event.preventDefault(); };
  const close = () => window.dispatchEvent(new CustomEvent('stabileo-open-basic-panel', { detail: { panel: null, opts: { toggle: false } } }));
  if (!panel) return null;
  let content = null;
  if (panel === 'selection') content = <SelectionPanel />;
  else if (panel === 'results') content = <ToolbarResults hideDiagrams flat />;
  else if (panel === 'settings') content = <ToolbarConfig flat />;
  else if (panel === 'project') content = <ToolbarProject flat />;
  else if (panel === 'data') content = dsmStepsStore.isOpen ? <DSMStepWizard /> : <DataTable syncBasicPanel initialTab={dataTab} />;
  else if (panel === 'advanced') content = <><ToolbarAdvanced flat /><div ref={outputRef}><KinematicPanel docked /><WhatIfPanel docked /><LegacySvelteSurface component={SectionStressPanel} props={{ docked: true }} /></div></>;
  return <aside className="react-basic-panel" data-testid="basic-panel" data-panel={panel} style={{ width }}><div className={`bp-resize${dragging ? ' dragging' : ''}`} onPointerDown={startResize} role="separator" aria-orientation="vertical" aria-label={t('ribbon.resize')} /><header className="bp-head"><span className="bp-title" data-testid="bp-title">{t(`ribbon.${panel}`)}</span><button className="bp-close" onClick={close} title={t('ribbon.close')} aria-label={t('ribbon.close')}>×</button></header><div className="bp-body">{content}</div></aside>;
}
