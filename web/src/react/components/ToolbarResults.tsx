import { useEffect, useRef, useState, useSyncExternalStore, type ChangeEvent, type MouseEventHandler, type ReactNode } from 'react';
import { runSolve } from '../../lib/actions/solve';
import { localeExternalStore, t } from '../../lib/i18n/store.svelte';
import { modelStore, resultsStore, uiStore } from '../../lib/store';
import {
  activeMapMeasure,
  activeQuantity,
  activeRepresentation,
  hasLiveColourScale,
  representationsFor,
  showQuantityAs,
  showStressMap,
  type MapMeasure,
} from '../../lib/store/result-view';
import { showDiagram } from '../../lib/store/view-mode';
import { useStoreRevision } from '../store/useStoreRevision';
import { ResultsTable } from './ResultsTable';
import './ToolbarResults.css';

const HELP_TEXTS: Record<string, { title: string; desc: string }> = {
  solve: { title: 'tooltip.solve.title', desc: 'tooltip.solve.desc' },
  'diag-none': { title: 'tooltip.diagNone.title', desc: 'tooltip.diagNone.desc' },
  'diag-deformed': { title: 'tooltip.diagDeformed.title', desc: 'tooltip.diagDeformed.desc' },
  'diag-moment': { title: 'tooltip.diagMoment.title', desc: 'tooltip.diagMoment.desc' },
  'diag-shear': { title: 'tooltip.diagShear.title', desc: 'tooltip.diagShear.desc' },
  'diag-axial': { title: 'tooltip.diagAxial.title', desc: 'tooltip.diagAxial.desc' },
  'diag-axialColor': { title: 'tooltip.diagAxialColor.title', desc: 'tooltip.diagAxialColor.desc' },
  'diag-colorMap': { title: 'tooltip.diagColorMap.title', desc: 'tooltip.diagColorMap.desc' },
};

type TipButtonProps = {
  tipKey?: string;
  className: string;
  title?: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
  children: ReactNode;
  [key: `data-${string}`]: string | undefined;
};

function TipButton({ tipKey, className, title, onClick, children, ...rest }: TipButtonProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltip = useRef<HTMLDivElement | null>(null);

  function hide() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    tooltip.current?.remove();
    tooltip.current = null;
  }

  function show(event: React.MouseEvent<HTMLButtonElement>) {
    if (!tipKey || !uiStore.showTooltips) return;
    const info = HELP_TEXTS[tipKey];
    if (!info) return;
    const node = event.currentTarget;
    timer.current = setTimeout(() => {
      const element = document.createElement('div');
      element.className = 'edu-tooltip';
      const strong = document.createElement('strong');
      strong.textContent = t(info.title);
      const br = document.createElement('br');
      const span = document.createElement('span');
      span.textContent = t(info.desc);
      element.append(strong, br, span);
      document.body.appendChild(element);
      tooltip.current = element;
      const rect = node.getBoundingClientRect();
      element.style.top = `${rect.top + window.scrollY}px`;
      element.style.left = `${rect.right + 8}px`;
      requestAnimationFrame(() => {
        if (!tooltip.current) return;
        const tipRect = tooltip.current.getBoundingClientRect();
        if (tipRect.right > window.innerWidth - 10) tooltip.current.style.left = `${rect.left - tipRect.width - 8}px`;
        if (tipRect.bottom > window.innerHeight - 10) tooltip.current.style.top = `${window.innerHeight - tipRect.height - 10}px`;
      });
    }, 600);
  }

  useEffect(() => hide, []);
  return <button {...rest} className={className} title={title} onClick={onClick} onMouseEnter={show} onMouseLeave={hide}>{children}</button>;
}

type ToolbarResultsProps = { hideDiagrams?: boolean; flat?: boolean };
type Diagram = Parameters<typeof showDiagram>[0];

export function ToolbarResults({ hideDiagrams = false, flat = false }: ToolbarResultsProps) {
  useStoreRevision(uiStore);
  useStoreRevision(resultsStore);
  useStoreRevision(modelStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const [showResultsPanel, setShowResultsPanel] = useState(true);
  const [showResultsViewSub, setShowResultsViewSub] = useState(false);
  const [showResultsTable, setShowResultsTable] = useState(false);

  const modelReady = modelStore.nodes.size > 0 && modelStore.elements.size > 0 && modelStore.supports.size > 0
    && modelStore.model.loads.length > 0 && !resultsStore.results;
  const hasResults = !!(resultsStore.results || resultsStore.results3D || resultsStore.influenceLine);
  const is3D = uiStore.analysisMode === '3d';
  const measure = activeMapMeasure();
  const shownQuantity = activeQuantity();
  const representation = activeRepresentation();
  const showsPrimary = uiStore.showPrimarySelector;
  const showsSecondary = showsPrimary && uiStore.showSecondarySelector
    && resultsStore.diagramType !== 'deformed' && representation === 'diagram';
  const showViewChoice = resultsStore.hasCombinations && (showsPrimary || showsSecondary)
    && (shownQuantity !== null || resultsStore.diagramType === 'deformed');
  const caseKeys = is3D ? [...resultsStore.perCase3D.keys()] : [...resultsStore.perCase.keys()];
  const comboKeys = is3D ? [...resultsStore.perCombo3D.keys()] : [...resultsStore.perCombo.keys()];
  const hasEnvelope = is3D ? resultsStore.fullEnvelope3D !== null : resultsStore.fullEnvelope !== null;
  const hasShells = modelStore.model.plates.size > 0 || modelStore.model.quads.size > 0;
  const anyMemberLacksYield = [...modelStore.elements.values()].some((element) => !modelStore.materials.get(element.materialId)?.fy);

  const checked = (setter: (value: boolean) => void) => (event: ChangeEvent<HTMLInputElement>) => setter(event.currentTarget.checked);
  const diagramButton = (diagram: Diagram, label: string, title: string, tipKey?: string) => <TipButton
    key={String(diagram)}
    className={`diagram-btn${resultsStore.diagramType === diagram ? ' active' : ''}`}
    onClick={() => showDiagram(diagram)}
    title={t(title)}
    tipKey={tipKey}
  >{t(label)}</TipButton>;

  function clearOverlay() {
    if (is3D) resultsStore.setOverlay3D(null);
    else resultsStore.setOverlay(null);
  }

  function changePrimary(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.currentTarget.value;
    if (value === 'single') { resultsStore.activeCaseId = null; resultsStore.activeView = 'single'; clearOverlay(); }
    else if (value === 'envelope') { resultsStore.activeCaseId = null; resultsStore.activeView = 'envelope'; clearOverlay(); }
    else if (value.startsWith('case_')) { resultsStore.activeCaseId = Number(value.slice(5)); clearOverlay(); }
    else if (value.startsWith('combo_')) { resultsStore.activeCaseId = null; resultsStore.activeView = 'combo'; resultsStore.activeComboId = Number(value.slice(6)); }
  }

  function changeSecondary(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.currentTarget.value;
    if (value === 'none') clearOverlay();
    else if (value === 'single') {
      if (is3D) resultsStore.setOverlay3D(resultsStore.singleResults3D, t('results.simpleLoads'));
      else resultsStore.setOverlay(resultsStore.singleResults, t('results.simpleLoads'));
    } else if (value === 'envelope') {
      if (is3D) resultsStore.setOverlay3D(resultsStore.fullEnvelope3D?.maxAbsResults3D ?? null, t('results.envelope'));
      else resultsStore.setOverlay(resultsStore.fullEnvelope?.maxAbsResults ?? null, t('results.envelope'));
    } else if (value.startsWith('case_')) {
      const id = Number(value.slice(5));
      const label = modelStore.model.loadCases.find((item) => item.id === id)?.name ?? `${t('results.caseFallback')} ${id}`;
      if (is3D) { const result = resultsStore.perCase3D.get(id); if (result) resultsStore.setOverlay3D(result, label); }
      else { const result = resultsStore.perCase.get(id); if (result) resultsStore.setOverlay(result, label); }
    } else if (value.startsWith('combo_')) {
      const id = Number(value.slice(6));
      const label = modelStore.model.combinations.find((item) => item.id === id)?.name ?? `${t('results.comboFallback')} ${id}`;
      if (is3D) { const result = resultsStore.perCombo3D.get(id); if (result) resultsStore.setOverlay3D(result, label); }
      else { const result = resultsStore.perCombo.get(id); if (result) resultsStore.setOverlay(result, label); }
    }
  }

  const primaryValue = resultsStore.activeView === 'envelope' ? 'envelope'
    : resultsStore.activeCaseId !== null ? `case_${resultsStore.activeCaseId}`
    : resultsStore.activeView === 'combo' ? `combo_${resultsStore.activeComboId ?? ''}`
    : 'single';

  return <>
    {!flat && <div className="toolbar-section react-toolbar-results">
      <h3>{t('results.solve')}</h3>
      <TipButton className={`solve-btn${modelReady ? ' ready' : ''}`} data-tour="calcular-btn" onClick={() => void runSolve()} tipKey="solve" title={is3D ? t('results.analysis3dTooltip') : ''}>{is3D ? t('results.solve3d') : t('results.solve')}</TipButton>
    </div>}
    <div className="toolbar-section react-toolbar-results" data-tour="results-section">
      {!flat && <button className="section-toggle" onClick={() => setShowResultsPanel((value) => !value)}>{showResultsPanel ? '▾' : '▸'} {t('results.results')}</button>}
      {(showResultsPanel || flat) && (hasResults ? <>
        {!hideDiagrams && <div className="diagram-grid">
          {diagramButton('none', 'results.none', 'results.noDiagramTooltip', 'diag-none')}
          {diagramButton('deformed', 'results.deformed', 'results.deformedTooltip', 'diag-deformed')}
          {!is3D ? <>
            {diagramButton('moment', 'results.moment', 'results.momentTooltip', 'diag-moment')}
            {diagramButton('shear', 'results.shear', 'results.shearTooltip', 'diag-shear')}
            {diagramButton('axial', 'results.axial', 'results.axialTooltip', 'diag-axial')}
            {diagramButton('axialColor', 'results.axialColors', 'results.axialColorTooltip', 'diag-axialColor')}
          </> : <>
            {diagramButton('shearZ', 'results.shearZ', 'results.shearZTooltip')}
            {diagramButton('momentY', 'results.momentY', 'results.momentYTooltip')}
            {diagramButton('shearY', 'results.shearY', 'results.shearYTooltip')}
            {diagramButton('momentZ', 'results.momentZ', 'results.momentZTooltip')}
            {diagramButton('axial', 'results.axial', 'results.axialNTooltip')}
            {diagramButton('torsion', 'results.torsion', 'results.torsionTooltip')}
            {diagramButton('axialColor', 'results.axialColors', 'results.axialColor3dTooltip')}
            {diagramButton('colorMap', 'results.colorMap', 'results.colorMapTooltip', 'diag-colorMap')}
          </>}
        </div>}

        {resultsStore.diagramType === 'deformed' ? <div className="input-group">
          <label>{t('results.diagramScale')}:</label>
          <button className="scale-step-btn" onClick={() => { resultsStore.deformedScale = Math.max(1, resultsStore.deformedScale - (resultsStore.deformedScale <= 10 ? 1 : resultsStore.deformedScale <= 100 ? 5 : 50)); }} title={t('results.decreaseScale')}>◀</button>
          <input type="range" min="1" max="1000" step="1" value={resultsStore.deformedScale} onChange={(event) => { resultsStore.deformedScale = Number(event.currentTarget.value); }} style={{ width: 80 }} />
          <button className="scale-step-btn" onClick={() => { resultsStore.deformedScale = Math.min(1000, resultsStore.deformedScale + (resultsStore.deformedScale < 10 ? 1 : resultsStore.deformedScale < 100 ? 5 : 50)); }} title={t('results.increaseScale')}>▶</button>
          <span className="scale-readout">{Math.round(resultsStore.deformedScale)}×</span>
        </div> : resultsStore.diagramType !== 'none' && resultsStore.diagramType !== 'colorMap' && resultsStore.diagramType !== 'axialColor' && <div className="input-group">
          <label>{t('results.diagramScale')}:</label>
          <button className="scale-step-btn" onClick={() => { resultsStore.diagramScale = Math.max(0.1, +(resultsStore.diagramScale - 0.1).toFixed(1)); }} title={t('results.decreaseScale')}>◀</button>
          <input type="range" min="0.1" max="5" step="0.1" value={resultsStore.diagramScale} onChange={(event) => { resultsStore.diagramScale = Number(event.currentTarget.value); }} style={{ width: 80 }} />
          <button className="scale-step-btn" onClick={() => { resultsStore.diagramScale = Math.min(5, +(resultsStore.diagramScale + 0.1).toFixed(1)); }} title={t('results.increaseScale')}>▶</button>
          <span className="scale-readout">{resultsStore.diagramScale.toFixed(1)}x</span>
        </div>}

        {resultsStore.diagramType === 'deformed' && <>
          <label className="checkbox-item"><input type="checkbox" checked={resultsStore.animateDeformed} onChange={checked((value) => { resultsStore.animateDeformed = value; })} /><span>{t('results.animate')}</span></label>
          {resultsStore.animateDeformed && <div className="input-group"><label>{t('results.speed')}:</label><input type="range" min="0.25" max="3" step="0.25" value={resultsStore.animSpeed} onChange={(event) => { resultsStore.animSpeed = Number(event.currentTarget.value); }} style={{ width: 80 }} /><span className="scale-readout">{resultsStore.animSpeed.toFixed(2)}x</span></div>}
        </>}
        {resultsStore.diagramType === 'influenceLine' && resultsStore.influenceLine && <>
          <label className="checkbox-item"><input type="checkbox" checked={resultsStore.ilAnimating} onChange={checked((value) => { resultsStore.ilAnimating = value; })} /><span>{t('results.animateLoad')}</span></label>
          {resultsStore.ilAnimating && <div className="input-group"><label>{t('results.speed')}:</label><input type="range" min="0.25" max="3" step="0.25" value={resultsStore.ilAnimSpeed} onChange={(event) => { resultsStore.ilAnimSpeed = Number(event.currentTarget.value); }} style={{ width: 80 }} /><span className="scale-readout">{resultsStore.ilAnimSpeed.toFixed(2)}x</span></div>}
        </>}

        {measure && <>
          <div className="input-group"><label>{t('results.stressMeasure')}:</label><select value={measure} onChange={(event) => showStressMap(event.currentTarget.value as MapMeasure)}>
            <option value="stressRatio">{t('results.measureUtilisation')}</option><option value="vonMises">{t('results.measureVonMises')}</option><option value="sigmaMax">{t('results.measureSigmaMax')}</option><option value="tauMax">{t('results.measureTauMax')}</option>{hasShells && <option value="shellVonMises">{t('results.shellVonMises')}</option>}
          </select></div>
          {measure === 'stressRatio' && anyMemberLacksYield && <p className="rep-help rep-warn">{t('results.noYield')}</p>}
          {measure !== 'shellVonMises' && measure !== 'shellBending' && <p className="rep-help">{measure === 'stressRatio' ? t('results.measureUtilisationHelp') : measure === 'vonMises' ? t('results.measureVonMisesHelp') : measure === 'sigmaMax' ? t('results.measureSigmaMaxHelp') : t('results.measureTauMaxHelp')}</p>}
        </>}

        {shownQuantity && <>
          <div className="input-group"><label>{t('results.shownAs')}:</label><div className="seg" role="group" aria-label={t('results.shownAs')}>
            {representationsFor(shownQuantity).map((item) => <button key={item} className={`seg-btn${representation === item ? ' on' : ''}`} onClick={() => showQuantityAs(shownQuantity, item)} data-testid={item === 'diagram' ? 'shown-as-diagram' : item === 'memberColour' ? 'shown-as-colour' : 'shown-as-map'}>{item === 'diagram' ? t('results.asDiagram') : item === 'memberColour' ? t('results.asMemberColour') : t('results.asColourMap')}</button>)}
          </div></div>
          <p className="rep-help">{representation === 'diagram' ? t('results.repDiagramHelp') : representation === 'memberColour' ? t('results.repMemberColourHelp') : t('results.repColourMapHelp')}</p>
        </>}
        {hasLiveColourScale() && <label className="checkbox-item"><input type="checkbox" checked={uiStore.showColourScale} onChange={checked((value) => { uiStore.showColourScale = value; })} />{t('results.showScale')}</label>}

        {showViewChoice && <>
          {!flat ? <button className="sub-toggle" onClick={() => setShowResultsViewSub((value) => !value)}>{showResultsViewSub ? '▾' : '▸'} {t('results.changeResultsView')}</button> : <span className="sub-heading">{t('results.changeResultsView')}</span>}
          {(showResultsViewSub || flat) && <div className="sub-content">
            {showsPrimary && <div className="input-group"><select aria-label={t('results.primary')} value={primaryValue} onChange={changePrimary}>
              <option value="single">{t('results.simpleLoads')}</option>
              {caseKeys.map((id) => <option key={`case-${id}`} value={`case_${id}`}>{modelStore.model.loadCases.find((item) => item.id === id)?.name ?? `${t('results.caseFallback')} ${id}`}</option>)}
              {comboKeys.map((id) => <option key={`combo-${id}`} value={`combo_${id}`}>{modelStore.model.combinations.find((item) => item.id === id)?.name ?? `${t('results.comboFallback')} ${id}`}</option>)}
              <option value="envelope">{t('results.envelope')}</option>
            </select></div>}
            {showsSecondary && <div className="input-group"><label>{t('results.compare')}:</label><select defaultValue="none" onChange={changeSecondary}>
              <option value="none">{t('results.noComparison')}</option><option value="single">{t('results.simpleLoads')}</option>
              {caseKeys.map((id) => <option key={`case-${id}`} value={`case_${id}`}>{modelStore.model.loadCases.find((item) => item.id === id)?.name ?? `${t('results.caseFallback')} ${id}`}</option>)}
              {comboKeys.map((id) => <option key={`combo-${id}`} value={`combo_${id}`}>{modelStore.model.combinations.find((item) => item.id === id)?.name ?? `${t('results.comboFallback')} ${id}`}</option>)}
              {hasEnvelope && <option value="envelope">{t('results.envelope')}</option>}
            </select></div>}
          </div>}
          {!flat ? <button className="sub-toggle" onClick={() => setShowResultsTable((value) => !value)}>{showResultsTable ? '▾' : '▸'} {t('data.results')}</button> : <span className="sub-heading">{t('data.results')}</span>}
          {(showResultsTable || flat) && <div className="sub-content"><div className="results-table-wrap"><ResultsTable /></div></div>}
        </>}
      </> : <p className="no-results-msg">{t('results.noResultsMsg')}</p>)}
    </div>
  </>;
}
