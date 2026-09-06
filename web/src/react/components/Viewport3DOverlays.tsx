import { useState, useSyncExternalStore } from 'react';
import { t, localeExternalStore } from '../../lib/i18n/store';
import { resultsStore, uiStore, verificationStore } from '../../lib/store';
import { shellComponentMeta, shellComponentRange, shellComponentStats } from '../../lib/engine/shell-stress';
import { divergingColor } from '../../lib/three/stress-heatmap';
import { heatmapColor } from '../../lib/three/selection-helpers';
import { useStoreRevision } from '../store/useStoreRevision';

const diagramColors: Record<string, string> = {
  momentZ: '#4488ff', momentY: '#44bbaa', shearY: '#44bb44', shearZ: '#66aa66',
  axial: '#aa66dd', torsion: '#ee8844', deformed: '#ff8800', modeShape: '#4ecdc4', bucklingMode: '#e96941',
};
const diagramLabelKeys: Record<string, string> = {
  momentZ: 'viewport3d.momentZ', momentY: 'viewport3d.momentY', shearY: 'viewport3d.shearY',
  shearZ: 'viewport3d.shearZ', axial: 'viewport3d.axial', torsion: 'viewport3d.torsion',
  deformed: 'viewport3d.deformed', modeShape: 'viewport3d.modeShape', bucklingMode: 'viewport3d.bucklingMode',
};

export function Viewport3DStoreOverlays() {
  useStoreRevision(uiStore);
  useStoreRevision(resultsStore);
  useStoreRevision(verificationStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const dt = resultsStore.diagramType;
  const color = diagramColors[dt];
  const labelKey = diagramLabelKeys[dt];
  const standardLegend = resultsStore.results3D && color && labelKey;

  return <>
    {uiStore.clippingEnabled && <div className="clip-controls" style={{
      top: uiStore.floatingToolsTopOffset,
      left: uiStore.showFloatingTools ? 12 : 48,
    }}>
      <div className="clip-axis-btns">
        {(['x', 'y', 'z'] as const).map((axis) => <button
          type="button"
          className={uiStore.clippingAxis === axis ? 'active-ax' : ''}
          onClick={() => { uiStore.clippingAxis = axis; }}
          key={axis}
        >{axis.toUpperCase()}</button>)}
      </div>
      <input
        type="range" min="-30" max="30" step="0.1"
        value={uiStore.clippingPosition}
        onChange={(event) => { uiStore.clippingPosition = Number(event.currentTarget.value); }}
        className="clip-slider"
        aria-label="3D clipping position"
      />
      <span className="clip-val">{uiStore.clippingPosition.toFixed(1)}</span>
    </div>}

    {standardLegend && <div className="diagram-legend">
      {resultsStore.isEnvelopeActive && resultsStore.fullEnvelope3D ? <>
        <LegendSwatch color="#4169E1" /><span className="legend-text">{t('viewport3d.envPlus')}</span>
        <LegendSwatch color="#E15041" spaced /><span className="legend-text">{t('viewport3d.envMinus')}</span>
      </> : <>
        <LegendSwatch color={color} /><span className="legend-text">{t(labelKey)}</span>
      </>}
      {resultsStore.overlayResults3D && resultsStore.overlayLabel && <>
        <LegendSwatch color="#FFA500" spaced />
        <span className="legend-text">{t('viewport3d.overlay').replace('{label}', resultsStore.overlayLabel)}</span>
      </>}
    </div>}

    {dt === 'axialColor' && resultsStore.results3D && <div className="diagram-legend">
      <LegendSwatch color="#e5482a" /><span className="legend-text">{t('viewport.tension')}</span>
      <LegendSwatch color="#2c6cb4" spaced /><span className="legend-text">{t('viewport.compression')}</span>
    </div>}

    {dt === 'despiece' && resultsStore.results3D && <div className="diagram-legend">
      <LegendSwatch color="#ff7070" /><span className="legend-text">{t('despiece.legendAxial')}</span>
      <LegendSwatch color="#4ecdc4" spaced /><span className="legend-text">{t('despiece.legendShear')}</span>
      <LegendSwatch color="#ffd166" spaced /><span className="legend-text">{t('despiece.legendMoment')}</span>
      <LegendSwatch color="#00e676" spaced /><span className="legend-text">{t('despiece.legendReaction')}</span>
      <span className="legend-text legend-note">{t('despiece.legendNote')}</span>
    </div>}

    {dt === 'verification' && (verificationStore.hasResults || verificationStore.hasDemandData) &&
      <div className="diagram-legend verification-legend" data-testid="overlay-legend">
        <span className="legend-text legend-util-label">u = D/C</span>
        <LegendSwatch color="#22cc66" /><span className="legend-text">≤ 0.5</span>
        <LegendSwatch color="#88cc22" spaced /><span className="legend-text">≤ 0.9</span>
        <LegendSwatch color="#ddaa00" spaced /><span className="legend-text">≤ 1.0 ⚠</span>
        <LegendSwatch color="#ee2222" spaced /><span className="legend-text">&gt; 1.0 ✗</span>
        <span className="legend-sep">|</span>
        <span className="legend-color legend-current" data-testid="overlay-legend-current" style={{ background: '#22cc66' }} />
        <span className="legend-text">{t('design.overlay.current')}</span>
        <span className="legend-color legend-stale" data-testid="overlay-legend-stale" />
        <span className="legend-text">⌛ {t('design.overlay.stale')}</span>
        <span className="legend-color legend-unavailable" data-testid="overlay-legend-unavailable" style={{ background: '#888888' }} />
        <span className="legend-text">○ {t('design.overlay.unavailable')}</span>
      </div>}
  </>;
}

function LegendSwatch({ color, spaced = false }: { color: string; spaced?: boolean }) {
  return <span className="legend-color" style={{ background: color, marginLeft: spaced ? 8 : undefined }} />;
}

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

function formatContourValue(value: number): string {
  if (value === 0) return '0';
  const absolute = Math.abs(value);
  if (absolute >= 1e4 || absolute < 1e-2) return value.toExponential(1);
  return value.toFixed(absolute >= 100 ? 0 : 1);
}

/** React-owned shell contour legend, sampled from the same colour functions as the scene. */
export function ShellContourLegend() {
  useStoreRevision(resultsStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const shellMode = resultsStore.diagramType === 'colorMap'
    && (resultsStore.colorMapKind === 'shellVonMises' || resultsStore.colorMapKind === 'shellBending');
  const result = resultsStore.results3D;
  const allShells = result ? [...(result.plateStresses ?? []), ...(result.quadStresses ?? [])] : [];
  const hasData = allShells.length > 0;
  const meta = shellComponentMeta(resultsStore.shellContourComponent);
  const range = shellComponentRange(allShells, resultsStore.shellContourComponent);
  const stat = shellComponentStats(allShells)[resultsStore.shellContourComponent];
  const mid = (range.min + range.max) / 2;

  if (!shellMode) return null;
  if (!hasData) return <div className="shell-legend shell-legend-empty" role="status">
    <div className="shell-legend-title">{meta.label}</div>
    <div className="shell-legend-unavailable">{t('results.shellContourUnavailable')}</div>
  </div>;
  if (stat?.status === 'negligible') return <div className="shell-legend shell-legend-flat" role="status">
    <div className="shell-legend-title">{meta.label} <span className="shell-legend-unit-inline">[{meta.unit}]</span></div>
    <div className="shell-legend-flat-note">{t('results.shellContourNegligible')}</div>
    <div className="shell-legend-flat-range">peak ≈ {formatContourValue(stat.peak)} {meta.unit}</div>
  </div>;
  if (stat?.status === 'uniform') return <div className="shell-legend" role="img" aria-label="Shell contour legend">
    <div className="shell-legend-title">{meta.label} <span className="shell-legend-unit-inline">[{meta.unit}]</span></div>
    <div className="shell-legend-flat-note">{t('results.shellContourUniform').replace('{v}', `${formatContourValue(mid)} ${meta.unit}`)}</div>
    <div className="shell-legend-unit">{meta.unit}</div>
  </div>;

  const absoluteRange = meta.signed
    ? Math.max(Math.abs(range.min), Math.abs(range.max))
    : Math.max(range.max, 1e-12);
  const stops = Array.from({ length: 11 }, (_, index) => {
    const ratio = index / 10;
    const value = range.min + ratio * (range.max - range.min);
    const normalized = absoluteRange > 1e-12 ? value / absoluteRange : 0;
    const color = meta.signed ? divergingColor(normalized) : heatmapColor(Math.max(0, normalized));
    return `${hex(color)} ${(ratio * 100).toFixed(0)}%`;
  });

  return <div className="shell-legend" role="img" aria-label="Shell contour legend">
    <div className="shell-legend-title">{meta.label} <span className="shell-legend-unit-inline">[{meta.unit}]</span></div>
    <div className="shell-legend-body">
      <div className="shell-legend-bar" style={{ background: `linear-gradient(to top, ${stops.join(', ')})` }} />
      <div className="shell-legend-ticks">
        <span>{formatContourValue(range.max)}</span>
        <span>{formatContourValue(mid)}</span>
        <span>{formatContourValue(range.min)}</span>
      </div>
    </div>
    <div className="shell-legend-unit">{meta.unit}</div>
  </div>;
}

export function CoordinateNodeDialog3D({ onClose, onSubmit }: {
  onClose(): void;
  onSubmit(x: number, y: number, z: number): void;
}) {
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const [values, setValues] = useState({ x: '0', y: '0', z: '0' });
  const submit = () => {
    const point = { x: Number(values.x), y: Number(values.y), z: Number(values.z) };
    if (Object.values(point).every(Number.isFinite)) onSubmit(point.x, point.y, point.z);
  };
  return <div className="coord-dialog-overlay" role="dialog" aria-modal="true"
    aria-label={t('viewport3d.createNodeCoords')}
    onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}>
    <div className="coord-dialog">
      <div className="coord-title">{t('viewport3d.createNodeCoords')}</div>
      {(['x', 'y', 'z'] as const).map((axis, index) => <div className="coord-row" key={axis}>
        <label htmlFor={`coord-3d-${axis}`}>{axis.toUpperCase()}</label>
        <input id={`coord-3d-${axis}`} type="number" step="any" value={values[axis]}
          autoFocus={index === 0}
          onChange={(event) => setValues({ ...values, [axis]: event.currentTarget.value })}
          onKeyDown={(event) => { if (event.key === 'Enter') submit(); }} />
      </div>)}
      <div className="coord-actions">
        <button type="button" className="coord-btn-ok" onClick={submit}>{t('viewport3d.create')}</button>
        <button type="button" className="coord-btn-cancel" onClick={onClose}>{t('viewport3d.cancel')}</button>
      </div>
    </div>
  </div>;
}

export function Viewport3DInteractionOverlays({ state }: {
  state: {
    boxSelect: { startX: number; startY: number; endX: number; endY: number; additive: boolean } | null;
    hoverTooltip: { text: string; x: number; y: number } | null;
    perfHud: { on: boolean; flush: number; fps: number; renderMs: number; syncMs: number; calls: number; tris: number; geos: number; texs: number };
  };
}) {
  const box = state.boxSelect;
  const isWindow = box ? box.endX >= box.startX : false;
  return <>
    {state.perfHud.on && <div className="perf-hud" data-flush={state.perfHud.flush}>
      <div><b>3D perf</b> <span className="perf-hud-shortcut">(Shift+P)</span></div>
      <div>fps <b>{state.perfHud.fps}</b> · render <b>{state.perfHud.renderMs}</b>ms</div>
      <div>sync <b>{state.perfHud.syncMs}</b>ms/window</div>
      <div>draw calls <b>{state.perfHud.calls}</b> · tris <b>{(state.perfHud.tris / 1000).toFixed(0)}</b>k</div>
      <div>geos <b>{state.perfHud.geos}</b> · texs <b>{state.perfHud.texs}</b></div>
    </div>}
    {box && <div className={`box-select-rect ${isWindow ? 'window-mode' : 'crossing-mode'}`} style={{
      left: Math.min(box.startX, box.endX), top: Math.min(box.startY, box.endY),
      width: Math.abs(box.endX - box.startX), height: Math.abs(box.endY - box.startY),
    }} />}
    {state.hoverTooltip && <div className="hover-tooltip" style={{
      left: state.hoverTooltip.x, top: state.hoverTooltip.y,
    }}>{state.hoverTooltip.text}</div>}
  </>;
}
