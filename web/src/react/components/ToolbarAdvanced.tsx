import { useEffect, useState, useSyncExternalStore, type MouseEvent, type ReactNode } from 'react';
import { solveDetailed3D } from '../../lib/engine/solver-detailed-3d';
import { solveDetailed } from '../../lib/engine/solver-detailed';
import {
  initSolver,
  isWasmReady,
  solveBuckling,
  solveBuckling3D as wasmBuckling3D,
  solveModal,
  solveModal3D as wasmModal3D,
  solvePDelta,
  solvePDelta3D as wasmPDelta3D,
  solvePlastic,
} from '../../lib/engine/wasm-solver';
import { getPredefinedTrains, solveMovingLoadsAsync } from '../../lib/engine/moving-loads';
import { localeExternalStore, t } from '../../lib/i18n/store.svelte';
import { dsmStepsStore, modelStore, resultsStore, uiStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';
import './ToolbarAdvanced.css';

const ADV_HELP: Record<string, { labelKey: string; textKey: string }> = {
  pdelta: { labelKey: 'advHelp.pdelta.label', textKey: 'advHelp.pdelta.text' },
  buckling: { labelKey: 'advHelp.buckling.label', textKey: 'advHelp.buckling.text' },
  modal: { labelKey: 'advHelp.modal.label', textKey: 'advHelp.modal.text' },
  spectral: { labelKey: 'advHelp.spectral.label', textKey: 'advHelp.spectral.text' },
  plastic: { labelKey: 'advHelp.plastic.label', textKey: 'advHelp.plastic.text' },
  dsm: { labelKey: 'advHelp.dsm.label', textKey: 'advHelp.dsm.text' },
  envelope: { labelKey: 'advHelp.envelope.label', textKey: 'advHelp.envelope.text' },
  trainLoad: { labelKey: 'advHelp.trainLoad.label', textKey: 'advHelp.trainLoad.text' },
  influenceLine: { labelKey: 'advHelp.influenceLine.label', textKey: 'advHelp.influenceLine.text' },
  kinematic: { labelKey: 'advHelp.kinematic.label', textKey: 'advHelp.kinematic.text' },
  stress: { labelKey: 'advHelp.stress.label', textKey: 'advHelp.stress.text' },
  despiece: { labelKey: 'advHelp.despiece.label', textKey: 'advHelp.despiece.text' },
  whatif: { labelKey: 'advHelp.whatif.label', textKey: 'advHelp.whatif.text' },
};

type Adv = { key: string; labelKey: string; active: boolean; close: () => void };

function HelpPanel({ helpKey, activeKey }: { helpKey: string; activeKey: string | null }) {
  const help = ADV_HELP[helpKey];
  return activeKey === helpKey && help ? <div className="adv-help-panel span-two"><strong>{t(help.labelKey)}</strong><p>{t(help.textKey)}</p></div> : null;
}

function HelpButton({ helpKey, activeKey, toggle }: { helpKey: string; activeKey: string | null; toggle: (key: string, event: MouseEvent) => void }) {
  return <button className={`adv-help-btn${activeKey === helpKey ? ' active' : ''}`} onClick={(event) => toggle(helpKey, event)}>?</button>;
}

function Row({ children, wide = false, className = '' }: { children: ReactNode; wide?: boolean; className?: string }) {
  return <div className={`adv-btn-wrap${wide ? ' span-two' : ''}${className ? ` ${className}` : ''}`}>{children}</div>;
}

export function ToolbarAdvanced({ flat = false }: { flat?: boolean }) {
  useStoreRevision(uiStore);
  useStoreRevision(modelStore);
  useStoreRevision(resultsStore);
  useStoreRevision(dsmStepsStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTrainPanel, setShowTrainPanel] = useState(false);
  const [selectedTrainIndex, setSelectedTrainIndex] = useState('');
  const [advHelpKey, setAdvHelpKey] = useState<string | null>(null);
  const is3D = uiStore.analysisMode === '3d' || uiStore.analysisMode === 'pro';
  const isPro = uiStore.analysisMode === 'pro';

  useEffect(() => {
    const openAdvanced = () => setShowAdvanced(true);
    window.addEventListener('stabileo-open-advanced', openAdvanced);
    return () => window.removeEventListener('stabileo-open-advanced', openAdvanced);
  }, []);

  function errText(error: unknown, fallbackKey: string) {
    if (typeof error === 'string' && error.trim()) return error;
    const message = (error as { message?: unknown } | null)?.message;
    return typeof message === 'string' && message.trim() ? message : t(fallbackKey);
  }

  function toggleAdvHelp(key: string, event: MouseEvent) {
    event.stopPropagation();
    setAdvHelpKey((current) => current === key ? null : key);
  }

  function blockedBySlidingJoints() {
    if (modelStore.hasSlidingJoints()) { uiStore.toast(t('advanced.slidingUnsupported'), 'error'); return true; }
    if (modelStore.hasJoint3D()) { uiStore.toast(t('advanced.jointsUnsupported'), 'error'); return true; }
    return false;
  }

  async function ensureWasmReady(context: string) {
    if (isWasmReady()) return true;
    try { console.warn(`[${context}] WASM solver not ready, initializing now...`); await initSolver(); return true; }
    catch (error) { console.error(`[${context}] WASM initialization failed:`, error); uiStore.toast(errText(error, 'toast.wasmInitError'), 'error'); return false; }
  }

  function handlePDelta() {
    if (blockedBySlidingJoints()) return;
    const input = modelStore.buildSolverInput(uiStore.includeSelfWeight);
    if (!input) { uiStore.toast(t('advanced.emptyModel'), 'error'); return; }
    try {
      const started = performance.now();
      const result = solvePDelta(input);
      const elapsed = performance.now() - started;
      if (typeof result === 'string') { uiStore.toast(result, 'error'); return; }
      resultsStore.setPDeltaResult(result);
      const message = result.converged
        ? t('toast.pdeltaConverged').replace('{iterations}', String(result.iterations)).replace('{b2}', result.b2Factor.toFixed(2)).replace('{ms}', elapsed.toFixed(0))
        : result.isStable ? t('toast.pdeltaNotConverged').replace('{iterations}', String(result.iterations)) : t('toast.pdeltaUnstable');
      uiStore.toast(message, result.converged ? 'success' : 'error');
    } catch (error) { uiStore.toast(errText(error, 'toast.pdeltaError'), 'error'); }
  }

  function handleModal() {
    if (blockedBySlidingJoints()) return;
    const input = modelStore.buildSolverInput(uiStore.includeSelfWeight);
    if (!input) { uiStore.toast(t('advanced.emptyModel'), 'error'); return; }
    const densities = new Map<number, number>();
    for (const [id, material] of modelStore.materials) densities.set(id, material.rho * 1000 / 9.81);
    try {
      const started = performance.now();
      const result = solveModal(input, densities);
      const elapsed = performance.now() - started;
      if (typeof result === 'string') { uiStore.toast(result, 'error'); return; }
      resultsStore.setModalResult(result);
      const rayleigh = result.rayleigh ? ` | Rayleigh: a₀=${result.rayleigh.a0.toFixed(3)}, a₁=${result.rayleigh.a1.toFixed(5)}` : '';
      const mass = ` | ΣMeff: X=${(result.cumulativeMassRatioX * 100).toFixed(0)}%, Y=${(result.cumulativeMassRatioY * 100).toFixed(0)}%`;
      uiStore.toast(t('toast.modalSuccess').replace('{modes}', String(result.modes.length)).replace('{cumMass}', mass).replace('{rayleigh}', rayleigh).replace('{ms}', elapsed.toFixed(0)), 'success');
    } catch (error) { uiStore.toast(errText(error, 'toast.modalError'), 'error'); }
  }

  function handleBuckling() {
    if (blockedBySlidingJoints()) return;
    const input = modelStore.buildSolverInput(uiStore.includeSelfWeight);
    if (!input) { uiStore.toast(t('advanced.emptyModel'), 'error'); return; }
    try {
      const started = performance.now();
      const result = solveBuckling(input);
      const elapsed = performance.now() - started;
      if (typeof result === 'string') { uiStore.toast(result, 'error'); return; }
      resultsStore.setBucklingResult(result);
      uiStore.toast(t('toast.bucklingSuccess').replace('{factor}', result.modes[0]?.loadFactor.toFixed(2) ?? '—').replace('{nComp}', String(result.elementData.length)).replace('{ms}', elapsed.toFixed(0)), 'success');
    } catch (error) { uiStore.toast(errText(error, 'toast.bucklingError'), 'error'); }
  }

  function handlePlastic() {
    if (blockedBySlidingJoints()) return;
    const input = modelStore.buildSolverInput(uiStore.includeSelfWeight);
    if (!input) { uiStore.toast(t('advanced.emptyModel'), 'error'); return; }
    const sections = new Map<number, { a: number; iz: number; materialId: number; b?: number; h?: number }>();
    for (const [id, section] of modelStore.sections) {
      const element = [...modelStore.elements.values()].find((item) => item.sectionId === id);
      sections.set(id, { a: section.a, iz: section.iy ?? section.iz, materialId: element?.materialId ?? 1, b: section.b, h: section.h });
    }
    const materials = new Map<number, { fy?: number }>();
    for (const [id, material] of modelStore.materials) materials.set(id, { fy: material.fy });
    try {
      const started = performance.now();
      const result = solvePlastic({ solver: input, sections, materials });
      const elapsed = performance.now() - started;
      if (typeof result === 'string') { uiStore.toast(result, 'error'); return; }
      resultsStore.setPlasticResult(result);
      const message = result.isMechanism
        ? t('toast.plasticMechanism').replace('{lambda}', result.collapseFactor.toFixed(2)).replace('{hinges}', String(result.hinges.length)).replace('{limit}', String(result.redundancy + 1)).replace('{ms}', elapsed.toFixed(0))
        : t('toast.plasticNoCollapse').replace('{hinges}', String(result.hinges.length)).replace('{lambda}', result.collapseFactor.toFixed(2)).replace('{redundancy}', String(result.redundancy)).replace('{ms}', elapsed.toFixed(0));
      uiStore.toast(message, result.isMechanism ? 'info' : 'success');
    } catch (error) { uiStore.toast(errText(error, 'toast.plasticError'), 'error'); }
  }

  async function handleMovingLoad(trainIndex: number) {
    if (blockedBySlidingJoints()) return;
    const input = modelStore.buildSolverInput(uiStore.includeSelfWeight);
    if (!input) { uiStore.toast(t('advanced.emptyModel'), 'error'); return; }
    const train = getPredefinedTrains()[trainIndex];
    if (!train) return;
    const abortController = resultsStore.startMovingLoadAnalysis();
    try {
      const started = performance.now();
      const result = await solveMovingLoadsAsync(input, { train, step: 0.25 }, (progress) => resultsStore.updateMovingLoadProgress(progress.current, progress.total), abortController.signal);
      if (abortController.signal.aborted) return;
      if (typeof result === 'string') { uiStore.toast(result, 'error'); return; }
      resultsStore.setMovingLoadEnvelope(result);
      uiStore.toast(t('toast.movingLoadSuccess').replace('{positions}', String(result.positions.length)).replace('{ms}', (performance.now() - started).toFixed(0)), 'success');
    } catch (error) { if (!abortController.signal.aborted) uiStore.toast(errText(error, 'toast.movingLoadError'), 'error'); }
    finally { resultsStore.finishMovingLoad(); }
  }

  async function handlePDelta3D() {
    if (blockedBySlidingJoints() || !await ensureWasmReady('handlePDelta3D')) return;
    const input = modelStore.buildSolverInput3D(uiStore.includeSelfWeight, uiStore.axisConvention3D === 'leftHand', { expandMemberOffsets: false });
    if (!input) { uiStore.toast(t('advanced.emptyModel'), 'error'); return; }
    try {
      const started = performance.now();
      const result = wasmPDelta3D(input);
      const elapsed = performance.now() - started;
      if (typeof result === 'string') { uiStore.toast(result, 'error'); return; }
      resultsStore.setPDeltaResult3D(result);
      const message = result.converged
        ? t('toast.pdeltaConverged').replace('{iterations}', String(result.iterations)).replace('{b2}', result.b2Factor.toFixed(2)).replace('{ms}', elapsed.toFixed(0))
        : result.isStable ? t('toast.pdeltaNotConverged').replace('{iterations}', String(result.iterations)) : t('toast.pdeltaUnstable');
      uiStore.toast(message, result.converged ? 'success' : 'error');
    } catch (error) { uiStore.toast(errText(error, 'toast.pdeltaError'), 'error'); }
  }

  async function handleModal3D() {
    if (blockedBySlidingJoints() || !await ensureWasmReady('handleModal3D')) return;
    const input = modelStore.buildSolverInput3D(uiStore.includeSelfWeight, uiStore.axisConvention3D === 'leftHand', { expandMemberOffsets: false });
    if (!input) { uiStore.toast(t('advanced.emptyModel'), 'error'); return; }
    const densities = new Map<number, number>();
    for (const [id, material] of modelStore.materials) densities.set(id, material.rho * 1000 / 9.81);
    try {
      const started = performance.now();
      const result = wasmModal3D(input, densities);
      const elapsed = performance.now() - started;
      if (typeof result === 'string') { uiStore.toast(result, 'error'); return; }
      resultsStore.setModalResult3D(result);
      const mass = ` | ΣMeff: X=${(result.cumulativeMassRatioX * 100).toFixed(0)}%, Y=${(result.cumulativeMassRatioY * 100).toFixed(0)}%, Z=${(result.cumulativeMassRatioZ * 100).toFixed(0)}%`;
      uiStore.toast(t('toast.modalSuccess').replace('{modes}', String(result.modes.length)).replace('{cumMass}', mass).replace('{rayleigh}', '').replace('{ms}', elapsed.toFixed(0)), 'success');
    } catch (error) { uiStore.toast(errText(error, 'toast.modalError'), 'error'); }
  }

  async function handleBuckling3D() {
    if (blockedBySlidingJoints() || !await ensureWasmReady('handleBuckling3D')) return;
    const input = modelStore.buildSolverInput3D(uiStore.includeSelfWeight, uiStore.axisConvention3D === 'leftHand', { expandMemberOffsets: false });
    if (!input) { uiStore.toast(t('advanced.emptyModel'), 'error'); return; }
    try {
      const started = performance.now();
      const result = wasmBuckling3D(input);
      const elapsed = performance.now() - started;
      if (typeof result === 'string') { uiStore.toast(result, 'error'); return; }
      resultsStore.setBucklingResult3D(result);
      uiStore.toast(t('toast.bucklingSuccess').replace('{factor}', result.modes[0]?.loadFactor.toFixed(2) ?? '—').replace('{nComp}', String(result.elementData.length)).replace('{ms}', elapsed.toFixed(0)), 'success');
    } catch (error) { uiStore.toast(errText(error, 'toast.bucklingError'), 'error'); }
  }

  function handleSolveCombinations() {
    if (is3D) {
      const result = modelStore.solveCombinations3D(uiStore.includeSelfWeight, uiStore.axisConvention3D === 'leftHand', isPro);
      if (typeof result === 'string') uiStore.toast(result, 'error');
      else if (result) { resultsStore.setCombinationResults3D(result.perCase, result.perCombo, result.envelope); uiStore.toast(t('toast.combinations3dSuccess').replace('{n}', String(result.perCombo.size)).replace('{cases}', String(result.perCase.size)), 'success'); }
      return;
    }
    const result = modelStore.solveCombinations(uiStore.includeSelfWeight, uiStore.drawPlane2D);
    if (typeof result === 'string') uiStore.toast(result, 'error');
    else if (result) { resultsStore.setCombinationResults(result.perCase, result.perCombo, result.envelope); uiStore.toast(t('toast.combinationsSuccess').replace('{n}', String(result.perCombo.size)).replace('{cases}', String(result.perCase.size)), 'success'); }
  }

  const analyses: Adv[] = [
    { key: 'kinematic', labelKey: 'advanced.kinematicAnalysis', active: uiStore.showKinematicPanel, close: () => { uiStore.showKinematicPanel = false; } },
    { key: 'despiece', labelKey: 'advanced.despiece', active: resultsStore.diagramType === 'despiece', close: () => { resultsStore.diagramType = 'none'; uiStore.despieceInspect = null; } },
    { key: 'stress', labelKey: 'advanced.sectionAnalysis', active: uiStore.currentTool === 'select' && uiStore.selectMode === 'stress', close: () => { uiStore.selectMode = 'elements'; resultsStore.stressQuery = null; } },
    { key: 'pdelta', labelKey: 'advanced.pdelta', active: !!(is3D ? resultsStore.pdeltaResult3D : resultsStore.pdeltaResult), close: () => { if (is3D) resultsStore.clearPDelta3D(); else resultsStore.clearPDelta(); } },
    { key: 'buckling', labelKey: 'advanced.buckling', active: !!(is3D ? resultsStore.bucklingResult3D : resultsStore.bucklingResult), close: () => { if (is3D) resultsStore.clearBuckling3D(); else resultsStore.clearBuckling(); } },
    { key: 'modal', labelKey: 'advanced.dynamic', active: !!(is3D ? resultsStore.modalResult3D : resultsStore.modalResult), close: () => { if (is3D) resultsStore.clearModal3D(); else resultsStore.clearModal(); } },
    { key: 'plastic', labelKey: 'advanced.plasticCollapse', active: !!resultsStore.plasticResult, close: () => resultsStore.clearPlastic() },
    { key: 'envelope', labelKey: 'advanced.envelope', active: resultsStore.activeView === 'envelope', close: () => { resultsStore.activeView = 'single'; } },
    { key: 'trainLoad', labelKey: 'advanced.trainLoad', active: !!resultsStore.movingLoadEnvelope || showTrainPanel, close: () => { resultsStore.clearMovingLoad(); setShowTrainPanel(false); setSelectedTrainIndex(''); } },
    { key: 'influenceLine', labelKey: 'advanced.influenceLine', active: uiStore.currentTool === 'influenceLine', close: () => { uiStore.currentTool = 'select'; resultsStore.setInfluenceLine(null); } },
    { key: 'whatif', labelKey: 'advanced.whatIf', active: uiStore.showWhatIf, close: () => { uiStore.showWhatIf = false; } },
    { key: 'dsm', labelKey: 'advanced.stepByStep', active: dsmStepsStore.isOpen, close: () => dsmStepsStore.close() },
  ];
  const active = analyses.find((analysis) => analysis.active) ?? null;
  const shown = (key: string) => !flat || active === null || active.key === key;
  const hiddenRunningButton = (key: string) => flat && active?.key === key;

  function togglePDelta() {
    if (is3D) {
      if (resultsStore.pdeltaResult3D) { resultsStore.clearPDelta3D(); const result = modelStore.solve3D(uiStore.includeSelfWeight, uiStore.axisConvention3D === 'leftHand', isPro); if (result && typeof result !== 'string') resultsStore.setResults3D(result); }
      else void handlePDelta3D();
    } else if (resultsStore.pdeltaResult) { resultsStore.clearPDelta(); const result = modelStore.solve(uiStore.includeSelfWeight, uiStore.drawPlane2D); if (result && typeof result !== 'string') resultsStore.setResults(result); }
    else handlePDelta();
  }

  function toggleBuckling() {
    if (is3D) { if (resultsStore.bucklingResult3D) resultsStore.clearBuckling3D(); else void handleBuckling3D(); }
    else if (resultsStore.bucklingResult) resultsStore.clearBuckling(); else handleBuckling();
  }

  function toggleModal() {
    if (is3D) { if (resultsStore.modalResult3D) resultsStore.clearModal3D(); else void handleModal3D(); }
    else if (resultsStore.modalResult) resultsStore.clearModal(); else handleModal();
  }

  function togglePlastic() {
    if (resultsStore.plasticResult) { resultsStore.clearPlastic(); const result = modelStore.solve(uiStore.includeSelfWeight, uiStore.drawPlane2D); if (result && typeof result !== 'string') resultsStore.setResults(result); }
    else handlePlastic();
  }

  function toggleEnvelope() {
    if (resultsStore.activeView === 'envelope') { resultsStore.activeView = 'single'; return; }
    if (!modelStore.model.combinations.length) { uiStore.toast(t('advanced.defineCombosFirst'), 'error'); return; }
    if (is3D ? !resultsStore.fullEnvelope3D : !resultsStore.fullEnvelope) handleSolveCombinations();
    if (is3D ? resultsStore.fullEnvelope3D : resultsStore.fullEnvelope) {
      resultsStore.activeView = 'envelope';
      if (resultsStore.diagramType === 'none' || resultsStore.diagramType === 'deformed') resultsStore.diagramType = is3D ? 'momentZ' : 'moment';
    }
  }

  function toggleDsm() {
    if (dsmStepsStore.isOpen) { dsmStepsStore.close(); setTimeout(() => window.dispatchEvent(new Event('stabileo-zoom-to-fit')), 100); return; }
    if (blockedBySlidingJoints()) return;
    if (uiStore.analysisMode === '3d') {
      const input = modelStore.buildSolverInput3D(uiStore.includeSelfWeight, uiStore.axisConvention3D === 'leftHand', { expandMemberOffsets: false });
      if (!input) { uiStore.toast(t('advanced.emptyModel'), 'error'); return; }
      try { dsmStepsStore.setStepData(solveDetailed3D(input)); dsmStepsStore.open(); }
      catch (error) { uiStore.toast(errText(error, 'toast.detailedSolver3dError'), 'error'); return; }
    } else {
      const input = modelStore.buildSolverInput(uiStore.includeSelfWeight);
      if (!input) { uiStore.toast(t('advanced.emptyModel'), 'error'); return; }
      try { dsmStepsStore.setStepData(solveDetailed(input)); dsmStepsStore.open(); }
      catch (error) { uiStore.toast(errText(error, 'toast.detailedSolverError'), 'error'); return; }
    }
    if (uiStore.isMobile) uiStore.rightDrawerOpen = true; else uiStore.rightSidebarOpen = true;
    setTimeout(() => window.dispatchEvent(new Event('stabileo-zoom-to-fit')), 100);
  }

  const pdResult = is3D ? resultsStore.pdeltaResult3D : resultsStore.pdeltaResult;
  const modalResult = is3D ? resultsStore.modalResult3D : resultsStore.modalResult;
  const bucklingResult = is3D ? resultsStore.bucklingResult3D : resultsStore.bucklingResult;

  const help = (key: string) => <HelpPanel helpKey={key} activeKey={advHelpKey} />;
  const helpButton = (key: string) => <HelpButton helpKey={key} activeKey={advHelpKey} toggle={toggleAdvHelp} />;

  return <div className={`toolbar-section react-toolbar-advanced${flat ? ' flat' : ''}`} data-tour="advanced-section">
    {!flat && <button className="section-toggle" onClick={() => setShowAdvanced((value) => !value)}>{showAdvanced ? '▾' : '▸'} {t('advanced.title')}</button>}
    {(flat || showAdvanced) && <>
      {flat && active && <div className="adv-running" data-testid="adv-running" data-adv={active.key}><span className="adv-running-name">{t(active.labelKey)}</span><button className="adv-running-close" onClick={() => active.close()} title={t('ribbon.close')} aria-label={t('ribbon.close')} data-testid="adv-close">×</button></div>}
      <div className="advanced-grid">
        {shown('kinematic') && !hiddenRunningButton('kinematic') && <><Row wide><button className={`adv-btn${uiStore.showKinematicPanel ? ' active' : ''}`} disabled={is3D} title={is3D ? t('advanced.only2d') : undefined} data-testid="adv-kinematic" onClick={() => { uiStore.showKinematicPanel = !uiStore.showKinematicPanel; }}>{t('advanced.kinematicAnalysis')}</button>{helpButton('kinematic')}</Row>{help('kinematic')}</>}

        {shown('despiece') && <>
          {!hiddenRunningButton('despiece') && <><Row wide><button className={`adv-btn${resultsStore.diagramType === 'despiece' ? ' active' : ''}`} onClick={() => { const hasResult = is3D ? resultsStore.results3D : resultsStore.results; if (!hasResult) { uiStore.toast(t('advanced.calculateFirst'), 'error'); return; } resultsStore.diagramType = resultsStore.diagramType === 'despiece' ? 'none' : 'despiece'; }}>{t('advanced.despiece')}</button>{helpButton('despiece')}</Row>{help('despiece')}</>}
          {resultsStore.diagramType === 'despiece' && <Row wide className="despiece-controls">
            <div className="adv-inline"><span>{t('despiece.vectors')}</span>{(['all', 'members', 'nodes'] as const).map((mode) => <button key={mode} className={`adv-btn${uiStore.despieceVectorMode === mode ? ' active' : ''}`} onClick={() => { uiStore.despieceVectorMode = mode; }}>{t(`despiece.v${mode === 'all' ? 'All' : mode === 'members' ? 'Members' : 'Nodes'}`)}</button>)}</div>
            <div className="adv-inline"><span>{t('despiece.basis')}</span>{(['local', 'global'] as const).map((basis) => <button key={basis} className={`adv-btn${uiStore.despieceBasis === basis ? ' active' : ''}`} onClick={() => { uiStore.despieceBasis = basis; }} title={t(`despiece.basis${basis === 'local' ? 'Local' : 'Global'}Hint`)}>{t(`despiece.basis${basis === 'local' ? 'Local' : 'Global'}`)}</button>)}</div>
            <label className="adv-range"><span>{t('despiece.vectorSize')}</span><input type="range" min="0.5" max="2" step="0.1" value={uiStore.despieceVectorSize} onChange={(event) => { uiStore.despieceVectorSize = Number(event.currentTarget.value); }} /></label>
            <label className="adv-range"><span>{t('despiece.labelSize')}</span><input type="range" min="0.6" max="2" step="0.1" value={uiStore.despieceLabelSize} onChange={(event) => { uiStore.despieceLabelSize = Number(event.currentTarget.value); }} /></label>
            <label className="adv-check"><input type="checkbox" checked={resultsStore.showReactions} onChange={(event) => { resultsStore.showReactions = event.currentTarget.checked; }} />{t('despiece.reactions')}</label>
            <div className="adv-inline"><span>{t('despiece.loads')}</span>{(['off', 'resultant', 'all'] as const).map((mode) => <button key={mode} className={`adv-btn${uiStore.despieceLoadMode === mode ? ' active' : ''}`} onClick={() => { uiStore.despieceLoadMode = mode; }}>{t(`despiece.loads${mode === 'off' ? 'Off' : mode === 'resultant' ? 'Resultant' : 'All'}`)}</button>)}</div>
            <label className="adv-check"><input type="checkbox" checked={uiStore.despieceCombineVectors} onChange={(event) => { uiStore.despieceCombineVectors = event.currentTarget.checked; }} />{t('despiece.combinedVectors')}</label>
          </Row>}
        </>}

        {shown('stress') && !hiddenRunningButton('stress') && <><Row wide><button className={`adv-btn${uiStore.currentTool === 'select' && uiStore.selectMode === 'stress' ? ' active' : ''}`} data-testid="adv-stress" onClick={() => {
          if (uiStore.currentTool === 'select' && uiStore.selectMode === 'stress') { uiStore.selectMode = 'elements'; resultsStore.stressQuery = null; return; }
          if (!resultsStore.results && !resultsStore.results3D) { uiStore.toast(t('advanced.calculateFirst'), 'error'); return; }
          uiStore.currentTool = 'select'; uiStore.selectMode = 'stress';
        }}>{t('advanced.sectionAnalysis')}</button>{helpButton('stress')}</Row>{help('stress')}</>}

        {shown('pdelta') && <>{!hiddenRunningButton('pdelta') && <Row><button className={`adv-btn${(is3D ? !!resultsStore.pdeltaResult3D : !!resultsStore.pdeltaResult) ? ' active' : ''}`} onClick={togglePDelta}>{t('advanced.pdelta')}</button>{helpButton('pdelta')}</Row>}{help('pdelta')}</>}
        {shown('buckling') && <>{!hiddenRunningButton('buckling') && <Row><button className={`adv-btn${(is3D ? !!resultsStore.bucklingResult3D : !!resultsStore.bucklingResult) ? ' active' : ''}`} onClick={toggleBuckling}>{t('advanced.buckling')}</button>{helpButton('buckling')}</Row>}{help('buckling')}</>}
        {shown('modal') && <>{!hiddenRunningButton('modal') && <Row><button className={`adv-btn${(is3D ? !!resultsStore.modalResult3D : !!resultsStore.modalResult) ? ' active' : ''}`} onClick={toggleModal}>{t('advanced.dynamic')}</button>{helpButton('modal')}</Row>}{help('modal')}</>}
        {shown('plastic') && !hiddenRunningButton('plastic') && <><Row wide><button className={`adv-btn${resultsStore.plasticResult ? ' active' : ''}`} disabled={is3D} title={is3D ? t('advanced.only2d') : undefined} onClick={togglePlastic}>{t('advanced.plasticCollapse')}</button>{helpButton('plastic')}</Row>{help('plastic')}</>}
        {shown('envelope') && !hiddenRunningButton('envelope') && <><Row wide><button className={`adv-btn${resultsStore.activeView === 'envelope' ? ' active' : ''}`} onClick={toggleEnvelope}>{t('advanced.envelope')}</button>{helpButton('envelope')}</Row>{help('envelope')}</>}

        {shown('trainLoad') && <>
          {!hiddenRunningButton('trainLoad') && <><Row wide><button className={`adv-btn${resultsStore.movingLoadEnvelope ? ' active' : ''}`} disabled={is3D} title={is3D ? t('advanced.only2d') : undefined} onClick={() => {
            if (resultsStore.movingLoadEnvelope) { resultsStore.clearMovingLoad(); const result = modelStore.solve(uiStore.includeSelfWeight, uiStore.drawPlane2D); if (result && typeof result !== 'string') resultsStore.setResults(result); setShowTrainPanel(false); }
            else setShowTrainPanel((value) => !value);
          }}>{flat ? '' : showTrainPanel ? '▾ ' : '▸ '}{t('advanced.trainLoad')}</button>{helpButton('trainLoad')}</Row>{help('trainLoad')}</>}
          {((flat && !is3D && active?.key === 'trainLoad') || (!flat && showTrainPanel)) && <div className="envelope-sub-panel span-two">
            {resultsStore.movingLoadRunning ? <div className="moving-load-progress"><div className="progress-bar-container"><div className="progress-bar-fill" style={{ width: `${resultsStore.movingLoadProgress ? resultsStore.movingLoadProgress.current / Math.max(resultsStore.movingLoadProgress.total, 1) * 100 : 0}%` }} /></div><div className="progress-info"><span className="progress-text">{resultsStore.movingLoadProgress?.current ?? 0}/{resultsStore.movingLoadProgress?.total ?? '?'} {t('advanced.positions')}</span><button className="cancel-btn" onClick={() => resultsStore.cancelMovingLoad()}>{t('advanced.cancelBtn')}</button></div></div>
              : <Row><select className="adv-select" value={selectedTrainIndex} onChange={(event) => { const value = event.currentTarget.value; setSelectedTrainIndex(value); if (value !== '') void handleMovingLoad(Number(value)); }}><option value="">{t('advanced.selectTrain')}</option>{getPredefinedTrains().map((train, index) => <option key={`${train.name}-${index}`} value={String(index)}>{train.name}</option>)}</select></Row>}
          </div>}
        </>}

        {shown('influenceLine') && !hiddenRunningButton('influenceLine') && <><Row wide><button className={`adv-btn${uiStore.currentTool === 'influenceLine' ? ' active' : ''}`} disabled={is3D} title={is3D ? t('advanced.only2d') : undefined} onClick={() => {
          if (uiStore.currentTool === 'influenceLine') { uiStore.currentTool = 'select'; return; }
          if (blockedBySlidingJoints()) return;
          if (!resultsStore.results && !resultsStore.results3D) { uiStore.toast(t('advanced.calculateFirstF5'), 'error'); return; }
          uiStore.currentTool = 'influenceLine';
        }}>{t('advanced.influenceLine')}</button>{helpButton('influenceLine')}</Row>{help('influenceLine')}</>}

        {shown('whatif') && !hiddenRunningButton('whatif') && <><Row wide><button className={`adv-btn${uiStore.showWhatIf ? ' active' : ''}`} onClick={() => { if (!uiStore.showWhatIf && blockedBySlidingJoints()) return; if (!resultsStore.results && !resultsStore.results3D) { uiStore.toast(t('advanced.calculateFirstF5'), 'error'); return; } uiStore.showWhatIf = !uiStore.showWhatIf; }}>{uiStore.showWhatIf ? `✕ ${t('advanced.closeExplorer')}` : t('advanced.whatIf')}</button>{helpButton('whatif')}</Row>{help('whatif')}</>}
        {shown('dsm') && !hiddenRunningButton('dsm') && <><Row wide><button className={`adv-btn${dsmStepsStore.isOpen ? ' active' : ''}`} onClick={toggleDsm}>{t('advanced.stepByStep')}</button>{helpButton('dsm')}</Row>{help('dsm')}</>}
      </div>

      {pdResult && <div className="adv-result-info compact">P-Δ: B₂ = {pdResult.b2Factor.toFixed(3)} | {pdResult.converged ? `${pdResult.iterations} iter` : 'no conv.'} | {pdResult.isStable ? t('advanced.stable') : t('advanced.unstable')}</div>}
      {modalResult && <><div className="adv-result-row"><button className={`adv-result-btn${resultsStore.diagramType === 'modeShape' ? ' active' : ''}`} onClick={() => { resultsStore.diagramType = 'modeShape'; }}>{t('advanced.dynamic')}</button><button className="small-btn" onClick={() => { if (resultsStore.activeModeIndex > 0) resultsStore.activeModeIndex--; }} disabled={resultsStore.activeModeIndex === 0}>◀</button><span className="adv-result-label">{resultsStore.activeModeIndex + 1}/{modalResult.modes.length}</span><button className="small-btn" onClick={() => { if (resultsStore.activeModeIndex < modalResult.modes.length - 1) resultsStore.activeModeIndex++; }} disabled={resultsStore.activeModeIndex >= modalResult.modes.length - 1}>▶</button></div>
        {modalResult.modes[resultsStore.activeModeIndex] && <><div className="adv-result-info">f = {modalResult.modes[resultsStore.activeModeIndex].frequency.toFixed(2)} Hz | T = {modalResult.modes[resultsStore.activeModeIndex].period.toFixed(3)} s</div><div className="adv-result-info compact muted">Meff: X={(modalResult.modes[resultsStore.activeModeIndex].massRatioX * 100).toFixed(1)}% Y={(modalResult.modes[resultsStore.activeModeIndex].massRatioY * 100).toFixed(1)}% | Σ: X={(modalResult.cumulativeMassRatioX * 100).toFixed(1)}% Y={(modalResult.cumulativeMassRatioY * 100).toFixed(1)}%</div></>}
      </>}
      {bucklingResult && <><div className="adv-result-row"><button className={`adv-result-btn${resultsStore.diagramType === 'bucklingMode' ? ' active' : ''}`} onClick={() => { resultsStore.diagramType = 'bucklingMode'; }}>{t('advanced.bucklingLabel')}</button><button className="small-btn" onClick={() => { if (resultsStore.activeBucklingMode > 0) resultsStore.activeBucklingMode--; }} disabled={resultsStore.activeBucklingMode === 0}>◀</button><span className="adv-result-label">{resultsStore.activeBucklingMode + 1}/{bucklingResult.modes.length}</span><button className="small-btn" onClick={() => { if (resultsStore.activeBucklingMode < bucklingResult.modes.length - 1) resultsStore.activeBucklingMode++; }} disabled={resultsStore.activeBucklingMode >= bucklingResult.modes.length - 1}>▶</button></div><div className="adv-result-info">λ_cr = {bucklingResult.modes[resultsStore.activeBucklingMode]?.loadFactor.toFixed(3) ?? '—'}</div>{bucklingResult.elementData.length > 0 && <div className="adv-result-info compact muted">Keff: {bucklingResult.elementData.slice(0, 3).map((item) => `E${item.elementId}=${item.kEffective.toFixed(2)}`).join(', ')}{bucklingResult.elementData.length > 3 ? '...' : ''}</div>}</>}
      {resultsStore.plasticResult && <><div className="adv-result-row"><button className={`adv-result-btn${resultsStore.diagramType === 'plasticHinges' ? ' active' : ''}`} onClick={() => { resultsStore.diagramType = 'plasticHinges'; }}>{t('advanced.plasticLabel')}</button><button className="small-btn" onClick={() => { if (resultsStore.plasticStep > 0) resultsStore.plasticStep--; }} disabled={resultsStore.plasticStep === 0}>◀</button><span className="adv-result-label">{resultsStore.plasticStep + 1}/{resultsStore.plasticResult.steps.length}</span><button className="small-btn" onClick={() => { if (resultsStore.plasticResult && resultsStore.plasticStep < resultsStore.plasticResult.steps.length - 1) resultsStore.plasticStep++; }} disabled={resultsStore.plasticStep >= resultsStore.plasticResult.steps.length - 1}>▶</button></div><div className="adv-result-info">λ = {resultsStore.plasticResult.steps[resultsStore.plasticStep]?.loadFactor.toFixed(3) ?? '—'} | {resultsStore.plasticResult.isMechanism ? t('advanced.mechanism') : t('advanced.noCollapse')} | GH = {resultsStore.plasticResult.redundancy}</div></>}
      {resultsStore.movingLoadEnvelope && <><div className="adv-result-row"><button className={`adv-result-btn${!resultsStore.movingLoadShowEnvelope ? ' active' : ''}`} onClick={() => { resultsStore.movingLoadShowEnvelope = false; resultsStore.diagramType = 'moment'; }}>{t('advanced.movingLoad')}</button><button className="small-btn" onClick={() => { if (resultsStore.activeMovingLoadPosition > 0) { resultsStore.activeMovingLoadPosition--; resultsStore.movingLoadShowEnvelope = false; } }} disabled={resultsStore.activeMovingLoadPosition === 0}>◀</button><span className="adv-result-label">{resultsStore.activeMovingLoadPosition + 1}/{resultsStore.movingLoadEnvelope.positions.length}</span><button className="small-btn" onClick={() => { if (resultsStore.movingLoadEnvelope && resultsStore.activeMovingLoadPosition < resultsStore.movingLoadEnvelope.positions.length - 1) { resultsStore.activeMovingLoadPosition++; resultsStore.movingLoadShowEnvelope = false; } }} disabled={resultsStore.activeMovingLoadPosition >= resultsStore.movingLoadEnvelope.positions.length - 1}>▶</button></div><div className="adv-result-info">{t('advanced.position')}: {resultsStore.movingLoadEnvelope.positions[resultsStore.activeMovingLoadPosition]?.refPosition.toFixed(2) ?? '—'} m</div>{resultsStore.movingLoadEnvelope.fullEnvelope && <button className={`adv-result-btn small${resultsStore.movingLoadShowEnvelope ? ' active' : ''}`} onClick={() => { resultsStore.movingLoadShowEnvelope = !resultsStore.movingLoadShowEnvelope; if (resultsStore.movingLoadShowEnvelope && !['moment', 'shear', 'axial'].includes(resultsStore.diagramType)) resultsStore.diagramType = 'moment'; }}>{resultsStore.movingLoadShowEnvelope ? '▾' : '▸'} {t('advanced.viewEnvelope')}</button>}</>}
    </>}
  </div>;
}
