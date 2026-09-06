import { useSyncExternalStore } from 'react';
import { localeExternalStore, t } from '../../lib/i18n/store';
import { modelStore, resultsStore, uiStore } from '../../lib/store';
import type { DiagramType } from '../../lib/store/results';
import { useStoreRevision } from '../store/useStoreRevision';
import './MobileResultsPanel.css';

const DIAGRAMS_2D: Array<[DiagramType, string]> = [
  ['moment', 'results.moment'],
  ['shear', 'results.shear'],
  ['axial', 'results.axial'],
  ['axialColor', 'results.axialColors'],
  ['colorMap', 'results.colorMap'],
];

const DIAGRAMS_3D: Array<[DiagramType, string]> = [
  ['shearZ', 'results.shearZ'],
  ['momentY', 'results.momentY'],
  ['shearY', 'results.shearY'],
  ['momentZ', 'results.momentZ'],
  ['axial', 'results.axial'],
  ['torsion', 'results.torsion'],
  ['axialColor', 'results.axialColors'],
  ['colorMap', 'results.colorMap'],
];

function DiagramButton({ type, label }: { type: DiagramType; label: string }) {
  return (
    <button
      className={`mrp-btn${resultsStore.diagramType === type ? ' active' : ''}`}
      onClick={() => { resultsStore.diagramType = type; }}
    >
      {t(label)}
    </button>
  );
}

/** Mobile-only solve and result controls, portalled into the viewport shell. */
export function MobileResultsPanel() {
  useStoreRevision(uiStore);
  useStoreRevision(resultsStore);
  useStoreRevision(modelStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);

  const is3D = uiStore.analysisMode === '3d';
  const hasResults = resultsStore.results !== null || resultsStore.results3D !== null;
  const hasModel = modelStore.nodes.size > 0;
  const isDiagramWithScale = resultsStore.diagramType !== 'none'
    && resultsStore.diagramType !== 'deformed'
    && resultsStore.diagramType !== 'colorMap'
    && resultsStore.diagramType !== 'axialColor';

  const handleSolve = () => window.dispatchEvent(new Event('stabileo-solve'));
  const stepDeformedScale = (delta: number) => {
    const scale = resultsStore.deformedScale;
    const step = scale <= 10 ? 1 : scale <= 100 ? 5 : 50;
    resultsStore.deformedScale = Math.max(1, Math.min(1000, scale + delta * step));
  };
  const stepDiagramScale = (delta: number) => {
    resultsStore.diagramScale = Math.max(0.1, Math.min(5, +(resultsStore.diagramScale + delta * 0.1).toFixed(1)));
  };

  if (!uiStore.isMobile) return null;

  if (!uiStore.mobileResultsPanelOpen) {
    return (
      <button
        className="mrp-reopen"
        style={{ top: uiStore.floatingToolsTopOffset }}
        onClick={() => { uiStore.mobileResultsPanelOpen = true; }}
        title={t('mobile.resultsAndSolve')}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
          <line x1="2" y1="17" x2="22" y2="17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M2,17 Q7,5 12,17 Q17,5 22,17" stroke="var(--st-accent)" strokeWidth="1.8" fill="none" />
        </svg>
      </button>
    );
  }

  if (!uiStore.mobileResultsPanelOpen) return null;

  const diagrams = is3D ? DIAGRAMS_3D : DIAGRAMS_2D;

  return (
    <div
      className="mrp-panel"
      style={{ top: uiStore.floatingToolsTopOffset }}
    >
      <div className="mrp-header">
        <span className="mrp-title">{t('mobile.results')}</span>
        <button className="mrp-close" onClick={() => { uiStore.mobileResultsPanelOpen = false; }}>&times;</button>
      </div>
      <div className="mrp-body">
        <button className="mrp-solve" onClick={handleSolve} disabled={!hasModel}>
          {is3D ? t('results.solve3d') : t('results.solve')}
        </button>

        {hasResults ? <>
          <div className="mrp-grid">
            <DiagramButton type="none" label="results.none" />
            <DiagramButton type="deformed" label="results.deformed" />
            {diagrams.map(([type, label]) => <DiagramButton key={type} type={type} label={label} />)}
          </div>

          {resultsStore.diagramType === 'deformed' ? <>
            <div className="mrp-scale">
              <span className="mrp-scale-label">{t('mobile.scale')}</span>
              <button className="mrp-step" onClick={() => stepDeformedScale(-1)}>◀</button>
              <input
                type="range"
                min="1"
                max="1000"
                step="1"
                value={resultsStore.deformedScale}
                onChange={(event) => { resultsStore.deformedScale = Number(event.currentTarget.value); }}
              />
              <button className="mrp-step" onClick={() => stepDeformedScale(1)}>▶</button>
              <span className="mrp-scale-val">{resultsStore.deformedScale}x</span>
            </div>
            <label className="mrp-check">
              <input
                type="checkbox"
                checked={resultsStore.animateDeformed}
                onChange={(event) => { resultsStore.animateDeformed = event.currentTarget.checked; }}
              />
              <span>{t('results.animate')}</span>
            </label>
            {resultsStore.animateDeformed && (
              <div className="mrp-scale">
                <span className="mrp-scale-label">{t('results.speed')}</span>
                <input
                  type="range"
                  min="0.25"
                  max="3"
                  step="0.25"
                  value={resultsStore.animSpeed}
                  onChange={(event) => { resultsStore.animSpeed = Number(event.currentTarget.value); }}
                />
                <span className="mrp-scale-val">{resultsStore.animSpeed.toFixed(2)}x</span>
              </div>
            )}
          </> : isDiagramWithScale ? (
            <div className="mrp-scale">
              <span className="mrp-scale-label">{t('mobile.scale')}</span>
              <button className="mrp-step" onClick={() => stepDiagramScale(-1)}>◀</button>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={resultsStore.diagramScale}
                onChange={(event) => { resultsStore.diagramScale = Number(event.currentTarget.value); }}
              />
              <button className="mrp-step" onClick={() => stepDiagramScale(1)}>▶</button>
              <span className="mrp-scale-val">{resultsStore.diagramScale.toFixed(1)}x</span>
            </div>
          ) : null}

          {resultsStore.diagramType === 'colorMap' && (
            <div className="mrp-select-row">
              <span className="mrp-scale-label">{t('results.variable')}</span>
              <select
                value={resultsStore.colorMapKind}
                onChange={(event) => { resultsStore.colorMapKind = event.currentTarget.value as typeof resultsStore.colorMapKind; }}
              >
                <option value="moment">{t('results.moment')}</option>
                <option value="shear">{t('results.shear')}</option>
                <option value="axial">{t('results.axial')}</option>
                <option value="stressRatio">{t('results.resistance')}</option>
                <option value="vonMises">Von Mises (σ)</option>
                {is3D && <option value="shellVonMises">{t('results.shellVonMises')}</option>}
              </select>
            </div>
          )}

          <label className="mrp-check">
            <input
              type="checkbox"
              checked={resultsStore.showDiagramValues}
              onChange={(event) => { resultsStore.showDiagramValues = event.currentTarget.checked; }}
            />
            <span>{t('mobile.values')}</span>
          </label>
        </> : <p className="mrp-hint">{t('mobile.buildAndSolve')}</p>}
      </div>
    </div>
  );
}
