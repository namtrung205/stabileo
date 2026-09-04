import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import CrossSectionDrawingBridge from '../../components/stress/CrossSectionDrawingReactBridge.svelte';
import { localeExternalStore, t } from '../../lib/i18n/store.svelte';
import { modelStore, resultsStore, tourStore, uiStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';
import { UpdatingSvelteSurface } from '../LegacySvelteSurface';
import { fmtForce } from '../../components/stress/fmt';
import { StressStateDetails } from './stress/StressStateDetails';
import { TorsionDetails } from './stress/TorsionDetails';
import { StressTensorDetails } from './stress/StressTensorDetails';
import { MohrCircleDisplay } from './stress/MohrCircleDisplay';
import { GeometricPropertyWorking } from './stress/GeometricPropertyWorking';
import { CentralCoreDetails } from './stress/CentralCoreDetails';
import { buildSectionStressPanelModel, type EccentricSource } from './stress/sectionStressPanelModel';
import './SectionStressPanel.css';

type Props = { docked?: boolean };
type DrawingChange = {
  showCrossSection: boolean; showSigma: boolean; showShearOnDrawing: boolean;
  showTotalSigma: boolean; showPerpNA: boolean; showCentralCore: boolean;
  showPressureCenter: boolean; useGlobalScale: boolean; fiberRatioY: number;
  fiberRatioZ: number; showStressMap: boolean; showEccentric: boolean;
  eccentricPoint: [number, number] | null; eccentricPointV: [number, number] | null;
  showTorsionFlow: boolean;
};

export function SectionStressPanel({ docked = false }: Props) {
  const modelRevision = useStoreRevision(modelStore);
  const resultsRevision = useStoreRevision(resultsStore);
  const uiRevision = useStoreRevision(uiStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const [fiberRatioY, setFiberRatioY] = useState(1);
  const [fiberRatioZ, setFiberRatioZ] = useState(.5);
  const [showCrossSection, setShowCrossSection] = useState(true);
  const [showTensional, setShowTensional] = useState(false);
  const [showMohr, setShowMohr] = useState(false);
  const [showCritical, setShowCritical] = useState(false);
  const [showSigma, setShowSigma] = useState(true);
  const [showShearOnDrawing, setShowShearOnDrawing] = useState(false);
  const [showTotalSigma, setShowTotalSigma] = useState(false);
  const [showPerpNA, setShowPerpNA] = useState(false);
  const [showCentralCore, setShowCentralCore] = useState(false);
  const [showPressureCenter, setShowPressureCenter] = useState(false);
  const [showCentralCoreInfo, setShowCentralCoreInfo] = useState(false);
  const [useGlobalScale, setUseGlobalScale] = useState(true);
  const [showTensors, setShowTensors] = useState(false);
  const [showTorsion, setShowTorsion] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('open') === 'torsion');
  const [showCentroidWork, setShowCentroidWork] = useState(false);
  const [showShearCentreWork, setShowShearCentreWork] = useState(false);
  const [showStressMap, setShowStressMap] = useState(false);
  const [showEccentric, setShowEccentric] = useState(false);
  const [showTorsionFlow, setShowTorsionFlow] = useState(false);
  const [eccentricPoint, setEccentricPoint] = useState<[number, number] | null>([0, 0]);
  const [eccentricPointV, setEccentricPointV] = useState<[number, number] | null>([0, 0]);
  const [eccSource, setEccSource] = useState<EccentricSource>('model');
  const [eccCustom, setEccCustom] = useState({ n: 0, vy: 0, vz: 0 });

  const view = useMemo(() => buildSectionStressPanelModel({
    fiberRatioY, fiberRatioZ, showTotalSigma, showPerpNA, showPressureCenter,
    showEccentric, eccentricPoint, eccentricPointV, eccSource, eccCustom,
    useGlobalScale,
  }), [modelRevision, resultsRevision, uiRevision, fiberRatioY, fiberRatioZ, showTotalSigma, showPerpNA, showPressureCenter, showEccentric, eccentricPoint, eccentricPointV, eccSource, eccCustom, useGlobalScale]);

  const close = () => { resultsStore.stressQuery = null; if (uiStore.selectMode === 'stress') uiStore.selectMode = 'elements'; };
  const goToT = (elementId: number, station: number) => {
    const element = modelStore.elements.get(elementId), ni = element ? modelStore.getNode(element.nodeI) : null, nj = element ? modelStore.getNode(element.nodeJ) : null;
    if (!element || !ni || !nj) return;
    resultsStore.stressQuery = { elementId, t: station, worldX: ni.x + station * (nj.x - ni.x), worldY: ni.y + station * (nj.y - ni.y), worldZ: view.is3D ? (ni.z ?? 0) + station * ((nj.z ?? 0) - (ni.z ?? 0)) : undefined };
  };
  const onDrawingChange = useCallback((change: DrawingChange) => {
    setShowCrossSection(change.showCrossSection); setShowSigma(change.showSigma);
    setShowShearOnDrawing(change.showShearOnDrawing); setShowTotalSigma(change.showTotalSigma);
    setShowPerpNA(change.showPerpNA); setShowCentralCore(change.showCentralCore);
    setShowPressureCenter(change.showPressureCenter); setUseGlobalScale(change.useGlobalScale);
    setFiberRatioY(change.fiberRatioY); setFiberRatioZ(change.fiberRatioZ);
    setShowStressMap(change.showStressMap); setShowEccentric(change.showEccentric);
    setEccentricPoint(change.eccentricPoint); setEccentricPointV(change.eccentricPointV);
    setShowTorsionFlow(change.showTorsionFlow);
  }, []);
  const drawingProps = useMemo(() => ({
    canonicalGeometry: view.canonicalGeometry, showCrossSection, showSigma, showShearOnDrawing,
    showTotalSigma, showPerpNA, showCentralCore, showPressureCenter, useGlobalScale,
    fiberRatioY, fiberRatioZ, is3D: view.uses3DPath, hasBending3D: view.hasBending3D,
    hasBending2D: view.hasBending2D, analysis2D: view.analysis2D, analysis3D: view.analysis3D,
    resolved: view.resolved, shearFlow: view.shearFlow, isMassive: view.isMassive,
    centralCore: view.centralCore, perpNADist: view.perpNADist, perpNA: view.perpNA,
    pressureCenter: view.pressureCenter, globalScales: view.globalScales,
    sectionRotation: view.is3D ? 0 : view.querySec?.rotation ?? 0, showStressMap,
    stressField: view.activeState?.field ?? null, showEccentric, eccentricPoint, eccentricPointV,
    hasParallelLoad: view.eccentricHasParallel, hasPerpendicularLoad: Math.abs(view.eccentricComponents.n) > 1e-12,
    shearCentre: view.shearCentreClean, eccentricInsideKern: view.eccentricInsideKern,
    torsionFlow: view.torsionFlow, showTorsionFlow,
  }), [view, showCrossSection, showSigma, showShearOnDrawing, showTotalSigma, showPerpNA, showCentralCore, showPressureCenter, useGlobalScale, fiberRatioY, fiberRatioZ, showStressMap, showEccentric, eccentricPoint, eccentricPointV, showTorsionFlow]);

  const mobileStyle = uiStore.isMobile && tourStore.isActive ? { bottom: 'auto', top: uiStore.floatingToolsTopOffset, maxHeight: `calc(100vh - ${uiStore.floatingToolsTopOffset}px - 45vh - 16px)` } : undefined;
  if (view.query && view.hasAnalysis) return <div className={`react-section-stress ssp-panel${docked ? ' docked' : ''}`} style={mobileStyle}>
    <div className="ssp-header"><span className="ssp-title">{t('stress.panelTitle')} {view.is3D ? '3D ' : ''}{view.isRotated2D ? `${t('stress.rotSuffix').replace('{angle}', String(view.querySec?.rotation))} ` : ''}</span><button className="ssp-close" onClick={close} title={t('stress.close')}>×</button></div>
    <div className="ssp-body">
      {view.canonicalState?.shearCentre && (Math.abs(view.canonicalState.shearCentre[0]) > 1e-4 || Math.abs(view.canonicalState.shearCentre[1]) > 1e-4) && <Notice className="ssp-shearcentre" icon="⊗" head={t('stress.shearCentre')}><>{t('stress.shearCentreMsg')}<span className="ssp-sc-nums">y = {(view.canonicalState.shearCentre[0] * 1000).toFixed(1)} mm · z = {(view.canonicalState.shearCentre[1] * 1000).toFixed(1)} mm</span></></Notice>}
      {view.deviation && <Notice className="ssp-deviation" icon="≠" head={t('stress.devTitle')}><>{t('stress.devBody')}<span className="ssp-dev-nums">A {(view.deviation.a * 100).toFixed(1)}% · Iy {(view.deviation.iy * 100).toFixed(1)}% · Iz {(view.deviation.iz * 100).toFixed(1)}%</span></></Notice>}
      <div className="ssp-info"><span className="ssp-elem">{t('results.elemLabel').replace('{id}', String(view.query.elementId))}</span><span className="ssp-pos">x/L = {(view.query.t * 100).toFixed(1)}%</span></div>
      <div className="ssp-slider-row" data-tour="ssp-sliders"><span className="ssp-slider-label">I</span><input type="range" className="ssp-slider-xl" min="0" max="1" step="0.005" value={view.query.t} onInput={(event) => goToT(view.query!.elementId, +(event.target as HTMLInputElement).value)} title={t('stress.moveAlongElem')} /><span className="ssp-slider-label">J</span></div>
      <Forces view={view} />
      <UpdatingSvelteSurface component={CrossSectionDrawingBridge} props={{ initial: drawingProps, onChange: onDrawingChange }} />
      {showEccentric && view.eccentric && eccentricPoint && <EccentricEditor view={view} eccentricPoint={eccentricPoint} eccentricPointV={eccentricPointV} source={eccSource} custom={eccCustom} onSource={setEccSource} onCustom={setEccCustom} onReset={() => { setEccentricPoint([0, 0]); setEccentricPointV([0, 0]); }} />}
      <StressStateDetails showTensional={showTensional} onShowTensionalChange={setShowTensional} is3D={view.uses3DPath} isMassive={view.isMassive} analysis2D={view.analysis2D} analysis3D={view.analysis3D} />
      {view.shearCheck && !view.shearCheck.agrees && <div className="ssp-shear-warn" role="alert"><span className="ssp-shear-warn-icon" aria-hidden="true">⚠</span><div><p className="ssp-shear-warn-text">{t('stress.shearMismatch')}</p><p className="ssp-shear-warn-nums">{t('stress.shearDiagram')}: {fmtForce(view.shearCheck.closedForm)} MPa · {t('stress.shearSolved')}: {fmtForce(view.shearCheck.solved)} MPa</p></div></div>}
      <TorsionDetails showTorsion={showTorsion} onShowTorsionChange={setShowTorsion} torque={view.activeTorque} resolved={view.resolved} length={view.queryElementLength} e={view.stateInputs?.elastic?.e} nu={view.stateInputs?.elastic?.nu ?? .3} />
      <StressTensorDetails showTensors={showTensors} onShowTensorsChange={setShowTensors} tensors={view.activeState?.tensors ?? null} fy={view.stateInputs?.fy} />
      <MohrCircleDisplay showMohr={showMohr} onShowMohrChange={setShowMohr} mohrData={view.mohrData} mohrSigma={view.mohrSigma} mohrTau={view.mohrTau} />
      <GeometricPropertyWorking showCentroidWork={showCentroidWork} onShowCentroidWorkChange={setShowCentroidWork} showShearCentreWork={showShearCentreWork} onShowShearCentreWorkChange={setShowShearCentreWork} resolved={view.resolved} engineShearCentre={view.canonicalState?.shearCentre ? view.shearCentreClean : null} />
      <CentralCoreDetails showCentralCoreInfo={showCentralCoreInfo} onShowCentralCoreInfoChange={setShowCentralCoreInfo} centralCore={view.centralCore} resolved={view.resolved} kern={view.kern} />
      <button className="ssp-section-toggle" onClick={() => setShowCritical((value) => !value)}><span className="ssp-chevron">{showCritical ? '▾' : '▸'}</span>{t('stress.criticalSections')}<span className="ssp-help ssp-help-inline" title={t('stress.criticalSectionsHelp')}>?</span></button>
      {showCritical && view.criticalSections.length > 0 && <div className="ssp-critical">{view.criticalSections.map((section) => <button className={`ssp-critical-chip${Math.abs(section.t - view.query!.t) < .02 ? ' active' : ''}`} onClick={() => goToT(view.query!.elementId, section.t)} key={`${section.t}-${section.reason}`}>{section.reason}<span className="ssp-critical-t">({(section.t * 100).toFixed(0)}%)</span></button>)}</div>}
    </div>
  </div>;
  if (view.query && view.isAmorphous) return <div className={`react-section-stress ssp-panel ssp-amorphous-warning${docked ? ' docked' : ''}`} style={uiStore.isMobile && tourStore.isActive ? { bottom: 'auto', top: uiStore.floatingToolsTopOffset } : undefined}>
    <div className="ssp-header"><span className="ssp-title">{t('stress.panelTitle')}</span><button className="ssp-close" onClick={close}>×</button></div>
    <div className="ssp-amorph-msg"><span className="ssp-amorph-icon">⚠</span>{view.unavailableReason?.kind === 'noGeometryData' ? <><p>{t('stress.noGeomMsg1a')}<strong>{view.unavailableReason.name}</strong>{t('stress.noGeomMsg1b')}</p><p>{t('stress.noGeomMsg2')}</p><p>{t('stress.noGeomMsg3')}</p></> : <><p dangerouslySetInnerHTML={{ __html: t('stress.amorphMsg1') }} /><p>{t('stress.amorphMsg2')}</p><p>{t('stress.amorphMsg3')}</p></>}</div>
  </div>;
  return null;
}

function Notice({ className, icon, head, children }: { className: string; icon: string; head: string; children: React.ReactNode }) { return <div className={className}><span className={className === 'ssp-deviation' ? 'ssp-dev-icon' : 'ssp-sc-icon'}>{icon}</span><div><div className={className === 'ssp-deviation' ? 'ssp-dev-head' : 'ssp-sc-head'}>{head}</div><div className={className === 'ssp-deviation' ? 'ssp-dev-body' : 'ssp-sc-body'}>{children}</div></div></div>; }

function Forces({ view }: { view: ReturnType<typeof buildSectionStressPanelModel> }) {
  if (view.analysis3D && view.is3D) return <><ForceRow help={t('stress.forces3dHelp')} entries={[[<>N</>, view.analysis3D.N, 'kN'], [<>V<sub>y</sub></>, view.analysis3D.Vy, 'kN'], [<>V<sub>z</sub></>, view.analysis3D.Vz, 'kN']]} /><ForceRow moments help={t('stress.moments3dHelp')} entries={[[<>M<sub>x</sub></>, -view.analysis3D.Mx, 'kN·m'], [<>M<sub>y</sub></>, -view.analysis3D.My, 'kN·m'], [<>M<sub>z</sub></>, -view.analysis3D.Mz, 'kN·m']]} /></>;
  if (view.analysis3D && view.isRotated2D) return <><ForceRow help={t('stress.rotDecompHelp').replace('{angle}', String(view.querySec?.rotation ?? 0))} entries={[[<>N</>, view.analysis3D.N, 'kN'], [<>V<sub>y</sub></>, view.analysis3D.Vy, 'kN'], [<>V<sub>z</sub></>, view.analysis3D.Vz, 'kN']]} /><ForceRow moments help={t('stress.rotMomentHelp').replace('{angle}', String(view.querySec?.rotation ?? 0))} entries={[[<>M<sub>y</sub></>, -view.analysis3D.My, 'kN·m'], [<>M<sub>z</sub></>, -view.analysis3D.Mz, 'kN·m']]} /></>;
  if (view.analysis2D) return <ForceRow help={t('stress.forces2dHelp')} entries={[[<>N</>, view.analysis2D.N, 'kN'], [<>V</>, view.analysis2D.V, 'kN'], [<>M</>, -view.analysis2D.M, 'kN·m']]} />;
  return null;
}
function ForceRow({ entries, help, moments = false }: { entries: Array<[React.ReactNode, number, string]>; help: string; moments?: boolean }) { return <div className={`ssp-forces${moments ? ' ssp-forces-moments' : ''}`}>{entries.map(([label, value, unit], index) => <div className="ssp-force" key={index}><span className="ssp-force-label">{label}</span><span className="ssp-force-value">{fmtForce(value)} {unit}</span></div>)}<span className="ssp-help" title={help}>?</span></div>; }

function EccentricEditor({ view, eccentricPoint, eccentricPointV, source, custom, onSource, onCustom, onReset }: { view: ReturnType<typeof buildSectionStressPanelModel>; eccentricPoint: [number, number]; eccentricPointV: [number, number] | null; source: EccentricSource; custom: { n: number; vy: number; vz: number }; onSource: (source: EccentricSource) => void; onCustom: (custom: { n: number; vy: number; vz: number }) => void; onReset: () => void }) {
  const set = (key: 'n' | 'vy' | 'vz', value: number) => onCustom({ ...custom, [key]: value });
  return <div className="ssp-ecc"><div className="ssp-ecc-head"><span>{t('stress.eccentricTitle')}</span><button className="ssp-ecc-reset" onClick={onReset} title={t('stress.eccentricResetHelp')}>{t('stress.eccentricReset')}</button></div>
    <div className="ssp-ecc-src">{(['model', 'custom', 'isolated'] as const).map((mode) => <button className={`ssp-ecc-tab${source === mode ? ' active' : ''}`} onClick={() => onSource(mode)} title={t(mode === 'model' ? 'stress.eccentricFromModelHelp' : mode === 'custom' ? 'stress.eccentricCustomHelp' : 'stress.eccentricIsolatedHelp')} key={mode}>{t(mode === 'model' ? 'stress.eccentricFromModel' : mode === 'custom' ? 'stress.eccentricCustom' : 'stress.eccentricIsolated')}</button>)}</div>
    <p className="ssp-ecc-explain">{t(source === 'model' ? 'stress.eccentricFromModelHelp' : source === 'custom' ? 'stress.eccentricCustomHelp' : 'stress.eccentricIsolatedHelp')}</p>
    {source === 'isolated' && <p className="ssp-ecc-note ssp-ecc-flag">{t('stress.eccentricIsolatedWarn')}</p>}
    <div className="ssp-ecc-fields"><EccField label={<>N <em>{t('stress.eccentricPerp')}</em></>} value={view.eccentricComponents.n} custom={source === 'custom'} onChange={(value) => set('n', value)} /><EccField label={<>V<sub>y</sub> <em>{t('stress.eccentricParH')}</em></>} value={view.eccentricComponents.vy} custom={source === 'custom'} onChange={(value) => set('vy', value)} /><EccField label={<>V<sub>z</sub> <em>{t('stress.eccentricParV')}</em></>} value={view.eccentricComponents.vz} custom={source === 'custom'} onChange={(value) => set('vz', value)} /></div>
    <div className="ssp-ecc-row"><span className="ssp-ecc-label">P<sub>⊥</sub> <em className="ssp-ecc-ref">{t('stress.eccentricRefG')}</em></span><span className="ssp-ecc-val">y {fmtForce(eccentricPoint[0] * 1000)} · z {fmtForce(eccentricPoint[1] * 1000)} mm</span></div>
    {view.eccentricHasParallel && eccentricPointV && <div className="ssp-ecc-row"><span className="ssp-ecc-label">P<sub>∥</sub> <em className="ssp-ecc-ref">{t('stress.eccentricRefCC')}</em></span><span className="ssp-ecc-val">y {fmtForce(eccentricPointV[0] * 1000)} · z {fmtForce(eccentricPointV[1] * 1000)} mm</span></div>}
    {view.eccentricNothingToMove ? <p className="ssp-ecc-note ssp-ecc-flag">{t('stress.eccentricNothingToMove')}</p> : view.eccentricNoAxial ? <p className="ssp-ecc-note ssp-ecc-flag">{t('stress.eccentricNoAxialNote')}</p> : null}
    <div className="ssp-ecc-sep">{t('stress.eccentricProduces')}</div><div className="ssp-ecc-row"><span className="ssp-ecc-label">ΔM<sub>y</sub> / ΔM<sub>z</sub></span><span className="ssp-ecc-val">{fmtForce(view.eccentric!.effect.myFromN)} / {fmtForce(view.eccentric!.effect.mzFromN)} kN·m</span></div><div className={`ssp-ecc-row${Math.abs(view.eccentric!.effect.tFromShear) > 1e-6 ? ' ssp-ecc-warn' : ''}`}><span className="ssp-ecc-label">ΔT</span><span className="ssp-ecc-val">{fmtForce(view.eccentric!.effect.tFromShear)} kN·m</span></div>
    {!view.is3D && Math.abs(view.eccentric!.forces.mz) > 1e-9 && <p className="ssp-ecc-note ssp-ecc-flag">{t('stress.eccentricBiaxialNote')}</p>}<p className="ssp-ecc-note">{view.eccentricInsideKern ? t('stress.eccentricInKern') : t('stress.eccentricOutKern')}</p>{Math.hypot(...view.shearCentreClean) > 1e-9 && <p className="ssp-ecc-note">{t('stress.eccentricShearCentreNote')}</p>}
  </div>;
}
function EccField({ label, value, custom, onChange }: { label: React.ReactNode; value: number; custom: boolean; onChange: (value: number) => void }) { return <div className="ssp-ecc-field"><span className="ssp-ecc-flabel">{label}</span>{custom ? <input type="number" step="1" value={value} onChange={(event) => onChange(+event.target.value)} /> : <span className="ssp-ecc-fixed">{fmtForce(value)}</span>}<span className="ssp-ecc-unit">kN</span></div>; }
