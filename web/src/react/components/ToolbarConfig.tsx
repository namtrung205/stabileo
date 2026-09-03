import { useEffect, useState, useSyncExternalStore, type ChangeEvent } from 'react';
import { localeExternalStore, t } from '../../lib/i18n/store.svelte';
import { resultsStore, uiStore } from '../../lib/store';
import { unitLabel, type Quantity } from '../../lib/utils/units';
import { useStoreRevision } from '../store/useStoreRevision';
import { HelpTip } from './HelpTip';
import './ToolbarConfig.css';

type ToolbarConfigProps = { inline?: boolean; flat?: boolean };

export function ToolbarConfig({ inline = false, flat = false }: ToolbarConfigProps) {
  useStoreRevision(uiStore);
  useStoreRevision(resultsStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const [showConfig, setShowConfig] = useState(false);
  const [showGridSub, setShowGridSub] = useState(false);
  const [showStructureSub, setShowStructureSub] = useState(false);
  const [showResultsSub, setShowResultsSub] = useState(false);

  useEffect(() => {
    const openConfig = () => setShowConfig(true);
    const closeConfig = () => setShowConfig(false);
    window.addEventListener('stabileo-open-config', openConfig);
    window.addEventListener('stabileo-close-config', closeConfig);
    return () => {
      window.removeEventListener('stabileo-open-config', openConfig);
      window.removeEventListener('stabileo-close-config', closeConfig);
    };
  }, []);

  const ul = (quantity: Quantity) => unitLabel(quantity, uiStore.unitSystem);
  const is3D = uiStore.analysisMode === '3d' || uiStore.analysisMode === 'pro';
  const isPro = uiStore.analysisMode === 'pro';
  const gridVisible = is3D ? uiStore.showGrid3D : uiStore.showGrid;
  const visible = showConfig || inline || flat;

  const checked = (setter: (value: boolean) => void) => (event: ChangeEvent<HTMLInputElement>) => setter(event.currentTarget.checked);

  return <div className="toolbar-section react-toolbar-config" data-tour="config-section">
    {!inline && !flat && <button className="section-toggle" onClick={() => setShowConfig((value) => !value)}>
      {showConfig ? '▾' : '▸'} {t('config.title')}
    </button>}

    {visible && <div className="config-children">
      {flat
        ? <span className="sub-heading">{t('config.grid')}</span>
        : <button className="sub-toggle" onClick={() => setShowGridSub((value) => !value)}>{showGridSub ? '▾' : '▸'} {t('config.grid')}</button>}

      {(flat || showGridSub) && <div className="sub-content" data-tour="cfg-grid">
        <label className="checkbox-item"><HelpTip text={t('config.tip.showAxes')}>
          <input type="checkbox" checked={is3D ? uiStore.showAxes3D : uiStore.showAxes} onChange={checked((value) => { if (is3D) uiStore.showAxes3D = value; else uiStore.showAxes = value; })} />
          <span>{t('config.showAxes')}</span>
        </HelpTip></label>
        <div className="input-group">
          <HelpTip text={t('config.tip.localAxes')}><label>{isPro ? t('config.localAxesMembers') : t('config.localAxes')}:</label></HelpTip>
          <select value={uiStore.localAxesMode3D} onChange={(event) => { uiStore.localAxesMode3D = event.currentTarget.value as typeof uiStore.localAxesMode3D; }}>
            <option value="selected">{t('config.localAxesSelected')}</option><option value="always">{t('config.localAxesAlways')}</option><option value="never">{t('config.localAxesNever')}</option>
          </select>
        </div>
        {isPro && <>
          <div className="input-group">
            <HelpTip text={t('config.tip.localAxesShells')}><label>{t('config.localAxesShells')}:</label></HelpTip>
            <select value={uiStore.shellAxesMode3D} onChange={(event) => { uiStore.shellAxesMode3D = event.currentTarget.value as typeof uiStore.shellAxesMode3D; }}>
              <option value="selected">{t('config.localAxesSelected')}</option><option value="always">{t('config.localAxesAlways')}</option><option value="never">{t('config.localAxesNever')}</option>
            </select>
          </div>
          <label className="checkbox-item"><HelpTip text={t('config.tip.smoothOrbit')}>
            <input type="checkbox" checked={uiStore.smoothOrbit3D} onChange={checked((value) => { uiStore.smoothOrbit3D = value; })} /><span>{t('config.smoothOrbit')}</span>
          </HelpTip></label>
        </>}
        <label className="checkbox-item"><HelpTip text={t('config.tip.showGrid')}>
          <input type="checkbox" checked={gridVisible} onChange={checked((value) => { if (is3D) uiStore.showGrid3D = value; else uiStore.showGrid = value; })} /><span>{t('config.showGrid')}</span>
        </HelpTip></label>
        <div className="grid-dependent" style={{ opacity: gridVisible ? 1 : 0.4, pointerEvents: gridVisible ? 'auto' : 'none' }}>
          <label className="checkbox-item"><HelpTip text={t('config.tip.snapGrid')}>
            <input type="checkbox" checked={is3D ? uiStore.snapToGrid3D : uiStore.snapToGrid} onChange={checked((value) => { if (is3D) uiStore.snapToGrid3D = value; else uiStore.snapToGrid = value; })} /><span>{t('config.snapGrid')}</span>
          </HelpTip></label>
          <div className="input-group">
            <HelpTip text={t('config.tip.gridSize')}><label>{is3D ? t('config.gridSizeXZ') : `${t('config.gridSize')} (${ul('length')})`}:</label></HelpTip>
            <input type="number" value={is3D ? uiStore.gridSize3D : uiStore.gridSize} onChange={(event) => { const value = parseFloat(event.currentTarget.value); if (!Number.isNaN(value) && value > 0) { if (is3D) uiStore.gridSize3D = value; else uiStore.gridSize = value; } }} min="0.1" step="0.1" />
          </div>
          {is3D && <div className="input-group range-group">
            <HelpTip text={t('config.tip.gridExtent')}><label>{t('config.gridExtent')}: {uiStore.gridExtent3D}×{uiStore.gridExtent3D} m</label></HelpTip>
            <input type="range" min="20" max="100" step="10" value={uiStore.gridExtent3D} onChange={(event) => { uiStore.gridExtent3D = parseInt(event.currentTarget.value); }} />
          </div>}
        </div>
      </div>}

      {flat
        ? <span className="sub-heading">{t('config.model')}</span>
        : <button className="sub-toggle" onClick={() => setShowStructureSub((value) => !value)}>{showStructureSub ? '▾' : '▸'} {t('config.model')}</button>}

      {(flat || showStructureSub) && <div className="sub-content" data-tour="cfg-model">
        <label className="checkbox-item"><HelpTip text={t('config.tip.nodeIds')}><input type="checkbox" checked={is3D ? uiStore.showNodeLabels3D : uiStore.showNodeLabels} onChange={checked((value) => { if (is3D) uiStore.showNodeLabels3D = value; else uiStore.showNodeLabels = value; })} /><span>{t('config.nodeIds')}</span></HelpTip></label>
        <label className="checkbox-item"><HelpTip text={t('config.tip.elementIds')}><input type="checkbox" checked={is3D ? uiStore.showElementLabels3D : uiStore.showElementLabels} onChange={checked((value) => { if (is3D) uiStore.showElementLabels3D = value; else uiStore.showElementLabels = value; })} /><span>{t('config.elementIds')}</span></HelpTip></label>
        <label className="checkbox-item"><HelpTip text={t('config.tip.lengths')}><input type="checkbox" checked={is3D ? uiStore.showLengths3D : uiStore.showLengths} onChange={checked((value) => { if (is3D) uiStore.showLengths3D = value; else uiStore.showLengths = value; })} /><span>{t('config.lengths')}</span></HelpTip></label>
        <label className="checkbox-item"><HelpTip text={t('config.tip.showLoads')}><input type="checkbox" checked={is3D ? uiStore.showLoads3D : uiStore.showLoads} onChange={checked((value) => { if (is3D) uiStore.showLoads3D = value; else uiStore.showLoads = value; })} /><span>{t('config.showLoads')}</span></HelpTip></label>
        {!is3D && <label className="checkbox-item"><HelpTip text={t('config.tip.autoSplit')}><input type="checkbox" checked={uiStore.autoSplitOnNodePlace} onChange={checked((value) => { uiStore.autoSplitOnNodePlace = value; })} /><span>{t('config.autoSplitElements')}</span></HelpTip></label>}
        <div className="input-group">
          <HelpTip text={t('config.tip.units')}><label>{t('config.units')}:</label></HelpTip>
          <select value={uiStore.unitSystem} onChange={(event) => { uiStore.unitSystem = event.currentTarget.value as typeof uiStore.unitSystem; }}><option value="SI">{t('config.unitSI')}</option><option value="Imperial">{t('config.unitImperial')}</option></select>
        </div>
        <div className="input-group">
          <HelpTip text={t('config.tip.axisConvention')}><label>{t('config.localAxes')}:</label></HelpTip>
          <select value={uiStore.axisConvention3D} onChange={(event) => { uiStore.axisConvention3D = event.currentTarget.value as typeof uiStore.axisConvention3D; }}><option value="rightHand">{t('config.rightHand')}</option><option value="leftHand">{t('config.leftHand')}</option></select>
          <span className="help-hint" title={t('config.axisConventionHelp')}>?</span>
        </div>
        {is3D ? <>
          <div className="input-group"><HelpTip text={t('config.tip.momentStyle')}><select value={uiStore.momentStyle3D} onChange={(event) => { uiStore.momentStyle3D = event.currentTarget.value as typeof uiStore.momentStyle3D; }}><option value="double-arrow">{t('config.momentsDoubleArrow')}</option><option value="curved">{t('config.momentsCurved')}</option></select></HelpTip></div>
          <div className="input-group"><HelpTip text={t('config.tip.renderMode')}><select value={uiStore.renderMode3D} onChange={(event) => { uiStore.renderMode3D = event.currentTarget.value as typeof uiStore.renderMode3D; }}><option value="wireframe">{t('config.wireframe')}</option><option value="solid">{t('config.solid')}</option><option value="sections">{t('config.sections')}</option></select></HelpTip></div>
        </> : <div className="input-group">
          <HelpTip text={t('config.tip.color')}><label>{t('config.color')}:</label></HelpTip>
          <select value={uiStore.elementColorMode} onChange={(event) => { uiStore.elementColorMode = event.currentTarget.value as typeof uiStore.elementColorMode; }}><option value="uniform">{t('config.uniform')}</option><option value="byMaterial">{t('config.byMaterial')}</option><option value="bySection">{t('config.bySection')}</option></select>
        </div>}
      </div>}

      {flat
        ? <span className="sub-heading">{t('config.resultsSection')}</span>
        : <button className="sub-toggle" onClick={() => setShowResultsSub((value) => !value)}>{showResultsSub ? '▾' : '▸'} {t('config.resultsSection')}</button>}

      {(flat || showResultsSub) && <div className="sub-content" data-tour="cfg-results">
        <label className="checkbox-item"><HelpTip text={t('config.tip.showValues')}><input type="checkbox" checked={resultsStore.showDiagramValues} onChange={checked((value) => { resultsStore.showDiagramValues = value; })} /><span>{t('config.showValues')}</span></HelpTip></label>
        <label className="checkbox-item"><HelpTip text={t('config.tip.showReactions')}><input type="checkbox" checked={resultsStore.showReactions} onChange={checked((value) => { resultsStore.showReactions = value; })} /><span>{t('config.showReactions')}</span></HelpTip></label>
        <label className="checkbox-item"><HelpTip text={t('config.tip.showConstraintForces')}><input type="checkbox" checked={resultsStore.showConstraintForces} onChange={checked((value) => { resultsStore.showConstraintForces = value; })} /><span>{t('config.showConstraintForces')}</span></HelpTip></label>
        <label className="checkbox-item"><HelpTip text={t('config.tip.hideLoadsWithDiagram')}><input type="checkbox" checked={uiStore.hideLoadsWithDiagram} onChange={checked((value) => { uiStore.hideLoadsWithDiagram = value; })} /><span>{t('config.hideLoadsWithDiagram')}</span></HelpTip></label>
        <label className="checkbox-item"><HelpTip text={t('config.tip.showPrimarySelector')}><input type="checkbox" checked={uiStore.showPrimarySelector} onChange={checked((value) => { uiStore.showPrimarySelector = value; })} /><span>{t('config.showPrimarySelector')}</span></HelpTip></label>
        <label className={`checkbox-item${!uiStore.showPrimarySelector ? ' checkbox-disabled' : ''}`}><HelpTip text={t('config.tip.showSecondarySelector')}><input type="checkbox" checked={uiStore.showSecondarySelector} onChange={checked((value) => { uiStore.showSecondarySelector = value; })} disabled={!uiStore.showPrimarySelector} /><span>{t('config.showSecondarySelector')}</span></HelpTip></label>
        <label className="checkbox-item"><HelpTip text={t('config.tip.drawPositiveTowardLocalAxes')}><input type="checkbox" checked={resultsStore.drawPositiveTowardLocalAxes} onChange={checked((value) => { resultsStore.drawPositiveTowardLocalAxes = value; })} /><span>{t('config.drawPositiveTowardLocalAxes')}</span></HelpTip></label>
      </div>}

      {!inline && <button className={`config-action-btn live-calc-btn${uiStore.liveCalc ? ' live-calc-active' : ''}`} onClick={() => { uiStore.liveCalc = !uiStore.liveCalc; }} title={t('config.liveCalcTooltip')}>
        {t('config.liveCalc')} — {uiStore.liveCalc ? t('config.liveCalcOn') : t('config.liveCalcOff')}
      </button>}
    </div>}
  </div>;
}
