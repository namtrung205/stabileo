import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import type { CentralCore, ResolvedSection, SectionStressResult, ShearFlowSegment } from '../../../lib/engine/section-stress';
import type { NeutralAxisInfo, PerpNAPoint, SectionStressResult3D } from '../../../lib/engine/section-stress-3d';
import type { TorsionFlow } from '../../../lib/engine/torsion-flow';
import type { DrawingGeometry } from '../../../lib/section/drawing';
import type { SectionShape } from '../../../lib/data/steel-profiles';
import { crossSectionPath } from '../../../lib/utils/section-drawing';
import { stressMapRamp, rampDirection } from '../../../lib/section/stress-map';
import { t } from '../../../lib/i18n/store';
import { fmt, stressColor } from '../../../components/stress/fmt';
import './CrossSectionDrawing.css';

export interface CrossSectionDrawingProps {
  canonicalGeometry?: DrawingGeometry | null;
  showCrossSection: boolean;
  onShowCrossSectionChange: (value: boolean) => void;
  showSigma: boolean;
  onShowSigmaChange: (value: boolean) => void;
  showShearOnDrawing: boolean;
  onShowShearOnDrawingChange: (value: boolean) => void;
  showTotalSigma: boolean;
  onShowTotalSigmaChange: (value: boolean) => void;
  showPerpNA: boolean;
  onShowPerpNAChange: (value: boolean) => void;
  showCentralCore: boolean;
  onShowCentralCoreChange: (value: boolean) => void;
  showPressureCenter: boolean;
  onShowPressureCenterChange: (value: boolean) => void;
  useGlobalScale: boolean;
  onUseGlobalScaleChange: (value: boolean) => void;
  fiberRatioY: number;
  onFiberRatioYChange: (value: number) => void;
  fiberRatioZ: number;
  onFiberRatioZChange: (value: number) => void;
  is3D: boolean;
  hasBending3D: boolean;
  hasBending2D: boolean;
  analysis2D: SectionStressResult | null;
  analysis3D: SectionStressResult3D | null;
  resolved: ResolvedSection | undefined;
  shearFlow: ShearFlowSegment[];
  isMassive: boolean;
  centralCore: CentralCore | null;
  perpNADist: PerpNAPoint[];
  perpNA: NeutralAxisInfo | null;
  pressureCenter: { y: number; z: number; insideCore: boolean } | null;
  globalScales: { maxSigmaY: number; maxSigmaZ: number; maxTauY: number } | null;
  sectionRotation?: number;
  showStressMap: boolean;
  onShowStressMapChange: (value: boolean) => void;
  stressField: { axial: number; ky: number; kz: number } | null;
  showEccentric: boolean;
  onShowEccentricChange: (value: boolean) => void;
  eccentricPoint: [number, number] | null;
  onEccentricPointChange: (value: [number, number] | null) => void;
  eccentricPointV: [number, number] | null;
  onEccentricPointVChange: (value: [number, number] | null) => void;
  hasParallelLoad: boolean;
  hasPerpendicularLoad: boolean;
  shearCentre: [number, number] | null;
  eccentricInsideKern: boolean;
  torsionFlow: TorsionFlow | null;
  showTorsionFlow: boolean;
  onShowTorsionFlowChange: (value: boolean) => void;
}

type ScaleProps = { strokeK: number; textK: number; glyphK: number };

export function CrossSectionDrawing(props: CrossSectionDrawingProps) {
  const {
    canonicalGeometry = null, resolved, is3D, analysis2D, analysis3D, sectionRotation = 0,
    showCrossSection, onShowCrossSectionChange, fiberRatioY, fiberRatioZ,
    onFiberRatioYChange, onFiberRatioZChange,
  } = props;
  const groupRef = useRef<SVGGElement>(null);
  const [dragging, setDragging] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [overlayBox, setOverlayBox] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [activeMarker, setActiveMarker] = useState<'n' | 'v'>('n');
  const [userPickedMarker, setUserPickedMarker] = useState(false);
  const gradientId = `ssp-stress-map-${useId().replace(/:/g, '')}`;
  const perpGradientId = `ssp-perp-map-${useId().replace(/:/g, '')}`;

  const canonicalScale = useMemo(() => {
    if (!canonicalGeometry) return null;
    const [yMin, zMin, yMax, zMax] = canonicalGeometry.bbox;
    return 80 / Math.max(Math.max(yMax - yMin, 1e-12), Math.max(zMax - zMin, 1e-12));
  }, [canonicalGeometry]);
  const outlinePath = useMemo(() => canonicalGeometry
    ? canonicalPath(canonicalGeometry)
    : resolved ? sectionPathFromResolved(resolved) : '', [canonicalGeometry, resolved]);

  useEffect(() => {
    if (!maximized) return;
    const host = document.querySelector('.viewport-container') as HTMLElement | null;
    if (!host) return;
    const measure = () => {
      const rect = host.getBoundingClientRect();
      setOverlayBox({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, [maximized]);

  useEffect(() => {
    if (!maximized) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setMaximized(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [maximized]);

  useEffect(() => {
    if (!userPickedMarker) setActiveMarker(props.hasParallelLoad && !props.hasPerpendicularLoad ? 'v' : 'n');
  }, [props.hasParallelLoad, props.hasPerpendicularLoad, userPickedMarker]);

  const pointerToSection = (event: ReactPointerEvent<SVGElement>): [number, number] | null => {
    if (!groupRef.current || canonicalScale === null) return null;
    const matrix = groupRef.current.getScreenCTM();
    if (!matrix) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return [point.x / canonicalScale, -point.y / canonicalScale];
  };
  const setPoint = (point: [number, number], marker = activeMarker) => {
    if (marker === 'v') props.onEccentricPointVChange(point);
    else props.onEccentricPointChange(point);
  };
  const startDrag = (event: ReactPointerEvent<SVGElement>, marker?: 'n' | 'v') => {
    const selected = marker ?? activeMarker;
    if (marker) { setActiveMarker(marker); setUserPickedMarker(true); }
    const point = pointerToSection(event);
    if (!point) return;
    setDragging(true);
    setPoint(point, selected);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  };
  const moveDrag = (event: ReactPointerEvent<SVGElement>) => {
    if (!dragging) return;
    const point = pointerToSection(event);
    if (point) setPoint(point);
  };
  const endDrag = (event: ReactPointerEvent<SVGElement>) => {
    setDragging(false);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const nudge = (event: ReactKeyboardEvent<SVGGElement>, marker: 'n' | 'v') => {
    const current = marker === 'v' ? props.eccentricPointV : props.eccentricPoint;
    if (!current || !canonicalGeometry) return;
    const [yMin, zMin, yMax, zMax] = canonicalGeometry.bbox;
    const step = Math.max(yMax - yMin, zMax - zMin) / 50;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step],
    };
    const delta = moves[event.key];
    if (!delta) return;
    setActiveMarker(marker);
    setUserPickedMarker(true);
    setPoint([current[0] + delta[0], current[1] + delta[1]], marker);
    event.preventDefault();
  };

  const scale: ScaleProps = { strokeK: maximized ? .4 : 1, textK: maximized ? .62 : 1, glyphK: maximized ? .5 : 1 };
  const overlayStyle: CSSProperties | undefined = maximized && overlayBox ? overlayBox : undefined;

  return <div className="react-cross-section">
    <button className="ssp-section-toggle" onClick={() => onShowCrossSectionChange(!showCrossSection)}>
      <span className="ssp-chevron">{showCrossSection ? '▾' : '▸'}</span>{t('stress.crossSection')}
    </button>
    {showCrossSection && resolved && <>
      <div className={`ssp-cross-wrap${maximized ? ' maximized' : ''}`} style={overlayStyle}>
        <DrawingToolbar {...props} maximized={maximized} onMaximizedChange={setMaximized} />
        <div className="ssp-svg-container">
          <svg viewBox="-90 -90 180 180" className="ssp-cross-svg">
            <g ref={groupRef} transform={`rotate(${sectionRotation})`}>
              {props.showStressMap && props.stressField && canonicalGeometry && canonicalScale !== null && <StressMap geometry={canonicalGeometry} canonicalScale={canonicalScale} stressField={props.stressField} gradientId={gradientId} {...scale} />}
              <path d={outlinePath} fill="none" stroke="var(--st-value)" strokeWidth={1.5 * scale.strokeK} fillRule="evenodd" />
              <CoreAndPressure resolved={resolved} centralCore={props.centralCore} showCentralCore={props.showCentralCore} showStressMap={props.showStressMap} pressureCenter={props.pressureCenter} showPressureCenter={props.showPressureCenter} {...scale} />
              {is3D && analysis3D
                ? <ThreeDimensionalDiagram analysis={analysis3D} showSigma={props.showSigma} showShear={props.showShearOnDrawing} showTotalSigma={props.showTotalSigma} showPerpNA={props.showPerpNA} perpNA={props.perpNA} perpNADist={props.perpNADist} useGlobalScale={props.useGlobalScale} globalScales={props.globalScales} fiberRatioY={fiberRatioY} fiberRatioZ={fiberRatioZ} perpGradientId={perpGradientId} {...scale} />
                : analysis2D && <TwoDimensionalDiagram analysis={analysis2D} showSigma={props.showSigma} showShear={props.showShearOnDrawing} showTotalSigma={props.showTotalSigma} showPerpNA={props.showPerpNA} useGlobalScale={props.useGlobalScale} globalScales={props.globalScales} shearFlow={props.shearFlow} isMassive={props.isMassive} fiberRatioY={fiberRatioY} {...scale} />}
              {props.showTorsionFlow && props.torsionFlow && <TorsionDiagram torsionFlow={props.torsionFlow} resolved={resolved} {...scale} />}
              {props.showEccentric && canonicalGeometry && canonicalScale !== null && <EccentricLayer {...props} canonicalScale={canonicalScale} dragging={dragging} activeMarker={activeMarker} onStartDrag={startDrag} onMoveDrag={moveDrag} onEndDrag={endDrag} onNudge={nudge} {...scale} />}
            </g>
          </svg>
        </div>
      </div>
      {is3D && analysis3D ? <>
        <FiberSlider label={t('stress.fiberY')} value={fiberRatioY} onChange={onFiberRatioYChange} display={fmt((-analysis3D.resolved.h / 2 + fiberRatioY * analysis3D.resolved.h) * 1000, 1)} />
        <FiberSlider label={t('stress.fiberZ')} value={fiberRatioZ} onChange={onFiberRatioZChange} display={fmt((-analysis3D.resolved.b / 2 + fiberRatioZ * analysis3D.resolved.b) * 1000, 1)} help={t('stress.fiberYZ3dHelp')} z />
      </> : analysis2D && <FiberSlider label={t('stress.fiberY')} value={fiberRatioY} onChange={onFiberRatioYChange} display={fmt((analysis2D.resolved.yMin + fiberRatioY * (analysis2D.resolved.yMax - analysis2D.resolved.yMin)) * 1000, 1)} help={t('stress.fiberY2dHelp')} />}
    </>}
  </div>;
}

function DrawingToolbar(props: CrossSectionDrawingProps & { maximized: boolean; onMaximizedChange: (value: boolean) => void }) {
  const button = (label: React.ReactNode, active: boolean, onClick: () => void, title: string, extra = '', disabled = false) =>
    <button className={`ssp-svg-toggle${extra ? ` ${extra}` : ''}${active ? ' active' : ''}${disabled ? ' disabled' : ''}`} onClick={onClick} title={title}>{label}</button>;
  return <div className="ssp-svg-toggles">
    {button('σ', props.showSigma, () => props.onShowSigmaChange(!props.showSigma), props.showSigma ? t('stress.sigmaOn') : t('stress.sigmaOff'), 'ssp-toggle-sigma')}
    {button('τ', props.showShearOnDrawing, () => props.onShowShearOnDrawingChange(!props.showShearOnDrawing), props.showShearOnDrawing ? t('stress.tauOn') : t('stress.tauOff'))}
    {button(<>σ<sub>{props.showTotalSigma ? 'T' : 'M'}</sub></>, props.showTotalSigma, () => props.showSigma && props.onShowTotalSigmaChange(!props.showTotalSigma), !props.showSigma ? t('stress.activateSigmaFirst') : props.showTotalSigma ? t('stress.totalSigmaOn') : t('stress.totalSigmaOff'), '', !props.showSigma)}
    {(props.hasBending3D || props.hasBending2D) && button('EN', props.showPerpNA, () => props.showSigma && props.onShowPerpNAChange(!props.showPerpNA), !props.showSigma ? t('stress.activateSigmaFirst') : props.showPerpNA ? (props.is3D ? t('stress.perpNA3dOn') : t('stress.perpNA2dOn')) : (props.is3D ? t('stress.perpNA3dOff') : t('stress.perpNA2dOff')), '', !props.showSigma)}
    {button('NC', props.showCentralCore, () => props.onShowCentralCoreChange(!props.showCentralCore), props.showCentralCore ? t('stress.centralCoreOn') : t('stress.centralCoreOff'))}
    {button('CP', props.showPressureCenter, () => props.onShowPressureCenterChange(!props.showPressureCenter), props.showPressureCenter ? t('stress.pressureCenterOn') : t('stress.pressureCenterOff'), 'ssp-toggle-cp')}
    {props.stressField && button('MAP', props.showStressMap, () => props.onShowStressMapChange(!props.showStressMap), props.showStressMap ? t('stress.stressMapOn') : t('stress.stressMapOff'), 'ssp-toggle-map')}
    {props.torsionFlow && button('T', props.showTorsionFlow, () => props.onShowTorsionFlowChange(!props.showTorsionFlow), props.showTorsionFlow ? t('stress.torsionFlowOn') : t('stress.torsionFlowOff'), 'ssp-toggle-tor')}
    {props.canonicalGeometry && button('CE', props.showEccentric, () => props.onShowEccentricChange(!props.showEccentric), props.showEccentric ? t('stress.eccentricOn') : t('stress.eccentricOff'), 'ssp-toggle-ecc')}
    {button(props.useGlobalScale ? 'G' : 'L', props.useGlobalScale, () => props.onUseGlobalScaleChange(!props.useGlobalScale), props.useGlobalScale ? t('stress.scaleGlobalOn') : t('stress.scaleGlobalOff'), 'ssp-toggle-scale')}
    <button className={`ssp-svg-toggle ssp-toggle-max${props.maximized ? ' active' : ''}`} onClick={() => props.onMaximizedChange(!props.maximized)} title={props.maximized ? t('stress.minimiseSection') : t('stress.maximiseSection')} aria-label={props.maximized ? t('stress.minimiseSection') : t('stress.maximiseSection')}>{props.maximized ? '⤡' : '⛶'}</button>
  </div>;
}

function StressMap({ geometry, canonicalScale, stressField, gradientId, strokeK, textK }: { geometry: DrawingGeometry; canonicalScale: number; stressField: { axial: number; ky: number; kz: number }; gradientId: string } & ScaleProps) {
  const ramp = stressMapRamp(stressField, geometry.bbox, canonicalScale, [...geometry.solids, ...geometry.holes].flat());
  const dir = rampDirection(ramp);
  const cx = (geometry.bbox[0] + geometry.bbox[2]) / 2 * canonicalScale;
  const cy = -(geometry.bbox[1] + geometry.bbox[3]) / 2 * canonicalScale;
  const span = Math.hypot(ramp.x2 - ramp.x1, ramp.y2 - ramp.y1);
  return <>
    <defs><linearGradient id={gradientId} gradientUnits={ramp.uniform ? undefined : 'userSpaceOnUse'} x1={ramp.uniform ? undefined : ramp.x1} y1={ramp.uniform ? undefined : ramp.y1} x2={ramp.uniform ? undefined : ramp.x2} y2={ramp.uniform ? undefined : ramp.y2}>
      {ramp.uniform ? <><stop offset="0" stopColor={stressColor(ramp.sigmaAt1, ramp.sMax)} /><stop offset="1" stopColor={stressColor(ramp.sigmaAt1, ramp.sMax)} /></> : mapStops(ramp.sigmaAt1, ramp.sigmaAt2, ramp.sMax).map((stop) => <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />)}
    </linearGradient></defs>
    <path d={canonicalPath(geometry)} fill={`url(#${gradientId})`} fillRule="evenodd" opacity="0.85" />
    {ramp.neutralInside && <><line x1={cx + dir.ux * ramp.neutralOffset - dir.uy * span / 2} y1={cy + dir.uy * ramp.neutralOffset + dir.ux * span / 2} x2={cx + dir.ux * ramp.neutralOffset + dir.uy * span / 2} y2={cy + dir.uy * ramp.neutralOffset - dir.ux * span / 2} stroke="var(--st-text-2)" strokeWidth={.9 * strokeK} strokeDasharray="4,2" opacity=".75" /><text x={cx + dir.ux * ramp.neutralOffset - dir.uy * span / 2} y={cy + dir.uy * ramp.neutralOffset + dir.ux * span / 2 - 2} fill="var(--st-text-2)" fontSize={4.5 * textK} opacity=".8">EN</text></>}
  </>;
}

function CoreAndPressure({ resolved, centralCore, showCentralCore, showStressMap, pressureCenter, showPressureCenter, strokeK, textK }: { resolved: ResolvedSection; centralCore: CentralCore | null; showCentralCore: boolean; showStressMap: boolean; pressureCenter: CrossSectionDrawingProps['pressureCenter']; showPressureCenter: boolean } & ScaleProps) {
  const scale = 80 / Math.max(resolved.h, resolved.b);
  const cpX = pressureCenter ? pressureCenter.z * scale : 0;
  const cpY = pressureCenter ? -pressureCenter.y * scale : 0;
  const x = Math.max(-82, Math.min(82, cpX));
  const y = Math.max(-82, Math.min(82, cpY));
  const clamped = Math.abs(x - cpX) > .5 || Math.abs(y - cpY) > .5;
  return <>
    {showCentralCore && centralCore && centralCore.vertices.length >= 3 && <><polygon points={centralCore.vertices.map((v) => `${v.ez * scale},${-v.ey * scale}`).join(' ')} fill={showStressMap ? 'none' : 'rgba(255, 140, 0, 0.15)'} stroke="var(--st-warn)" strokeWidth={(showStressMap ? 1.1 : .8) * strokeK} strokeDasharray="3,2" /><text x="0" y={-centralCore.eyMax * scale - 3} textAnchor="middle" fill="var(--st-warn)" fontSize={6 * textK} fontWeight="600" opacity=".85">NC</text></>}
    {showPressureCenter && pressureCenter && <>{pressureCenter.insideCore && <circle cx={x} cy={y} r="8" fill="rgba(42, 168, 105, 0.15)" stroke="var(--st-ok)" strokeWidth={.8 * strokeK} strokeDasharray="2,1" opacity=".9" />}<circle cx={x} cy={y} r="4" fill="none" stroke="var(--st-value)" strokeWidth={1.5 * strokeK} opacity=".95" /><line x1={x - 6} y1={y} x2={x + 6} y2={y} stroke="var(--st-value)" strokeWidth={1.2 * strokeK} opacity=".9" /><line x1={x} y1={y - 6} x2={x} y2={y + 6} stroke="var(--st-value)" strokeWidth={1.2 * strokeK} opacity=".9" /><text x={x + 8} y={y - 4} fill="var(--st-value)" fontSize={5.5 * textK} fontWeight="600">CP</text>{pressureCenter.insideCore && <text x={x + 8} y={y + 4} fill="var(--st-ok)" fontSize={3.5 * textK}>{t('stress.cpInKern')}</text>}{clamped && <text x={x + 8} y={y + (pressureCenter.insideCore ? 11 : 4)} fill="var(--st-value)" fontSize={3 * textK} opacity=".7">({t('stress.outOfView')})</text>}</>}
  </>;
}

function ThreeDimensionalDiagram({ analysis, showSigma, showShear, showTotalSigma, showPerpNA, perpNA, perpNADist, useGlobalScale, globalScales, fiberRatioY, fiberRatioZ, perpGradientId, strokeK, textK }: { analysis: SectionStressResult3D; showSigma: boolean; showShear: boolean; showTotalSigma: boolean; showPerpNA: boolean; perpNA: NeutralAxisInfo | null; perpNADist: PerpNAPoint[]; useGlobalScale: boolean; globalScales: CrossSectionDrawingProps['globalScales']; fiberRatioY: number; fiberRatioZ: number; perpGradientId: string } & ScaleProps) {
  const rs = analysis.resolved;
  const sc = 80 / Math.max(rs.h, rs.b);
  const sigmaN = rs.a > 1e-15 ? analysis.N / rs.a / 1000 : 0;
  const sigmasY = analysis.distributionY.map((point) => rs.iy > 1e-20 ? -analysis.My * point.y / rs.iy / 1000 : 0);
  const sigmasZ = analysis.distributionZ.map((point) => analysis.Iz > 1e-20 ? analysis.Mz * point.z / analysis.Iz / 1000 : 0);
  const maxY = Math.max(...sigmasY.map(Math.abs), ...(showTotalSigma ? analysis.distributionY.map((point) => Math.abs(point.sigma)) : []), 1e-6);
  const maxZ = Math.max(...sigmasZ.map(Math.abs), ...(showTotalSigma ? analysis.distributionZ.map((point) => Math.abs(point.sigma)) : []), 1e-6);
  const globalScale = globalScales ? Math.max(globalScales.maxSigmaY, globalScales.maxSigmaZ) : null;
  const scaleY = useGlobalScale && globalScale !== null ? globalScale : maxY;
  const scaleZ = useGlobalScale && globalScale !== null ? globalScale : maxZ;
  const xBase = rs.b / 2 * sc + 4;
  const yBase = rs.h / 2 * sc + 4;
  const yValues = showTotalSigma ? analysis.distributionY.map((point) => point.sigma) : sigmasY;
  const zValues = showTotalSigma ? analysis.distributionZ.map((point) => point.sigma) : sigmasZ;
  const neutralY = zeroCrossings(analysis.distributionY.map((point) => [point.y, point.sigma]));
  const neutralZ = zeroCrossings(analysis.distributionZ.map((point) => [point.z, point.sigma]));
  const yF = -rs.h / 2 + fiberRatioY * rs.h;
  const zF = -rs.b / 2 + fiberRatioZ * rs.b;
  return <>
    {showSigma && !showPerpNA && <>
      <line x1={xBase} y1={-rs.h / 2 * sc} x2={xBase} y2={rs.h / 2 * sc} stroke="var(--st-text-2)" strokeWidth={.4 * strokeK} opacity=".3" />
      {showTotalSigma && Math.abs(sigmaN) > .01 && <><line x1={xBase + sigmaN / scaleY * 30} y1={-rs.h / 2 * sc} x2={xBase + sigmaN / scaleY * 30} y2={rs.h / 2 * sc} stroke="var(--st-warn)" strokeWidth={.8 * strokeK} strokeDasharray="2,2" opacity=".5" /><text x={xBase + sigmaN / scaleY * 30} y={-rs.h / 2 * sc - 3} fill="var(--st-warn)" fontSize={3.5 * textK} textAnchor="middle">N/A</text></>}
      {analysis.distributionY.map((point, index) => { const width = yValues[index] / scaleY * 30; return <rect key={`y-${index}`} x={width >= 0 ? xBase : xBase + width} y={-point.y * sc - 1.5} width={Math.abs(width)} height="3" fill={stressColor(yValues[index], scaleY)} opacity=".8" />; })}
      <polyline points={analysis.distributionY.map((point, index) => `${xBase + yValues[index] / scaleY * 30},${-point.y * sc}`).join(' ')} fill="none" stroke="var(--st-text-2)" strokeWidth={.8 * strokeK} opacity=".5" />
      {showTotalSigma && neutralY.map((value, index) => <g key={`ny-${index}`}><line x1={xBase - 6} y1={-value * sc} x2={xBase + 6} y2={-value * sc} stroke="var(--st-value)" strokeWidth={strokeK} strokeDasharray="3,2" opacity=".8" /><text x={xBase + 8} y={-value * sc + 2} fill="var(--st-value)" fontSize={3.5 * textK}>EN</text></g>)}
      <text x={xBase} y={-rs.h / 2 * sc - (showTotalSigma ? 7 : 4)} fill={showTotalSigma ? 'var(--st-text-2)' : Math.abs(sigmaN) > .001 ? 'var(--st-warn)' : 'var(--st-text-2)'} fontSize={(showTotalSigma ? 4 : 4.5) * textK}>{showTotalSigma ? 'σ = N/A − My·y/Iy' : Math.abs(sigmaN) > .001 ? `+ N/A = ${fmt(sigmaN)} MPa` : '−My·y/Iy'}</text>
      <line x1={-rs.b / 2 * sc} y1={yBase} x2={rs.b / 2 * sc} y2={yBase} stroke="var(--st-text-2)" strokeWidth={.4 * strokeK} opacity=".3" />
      {showTotalSigma && Math.abs(sigmaN) > .01 && <line x1={-rs.b / 2 * sc} y1={yBase + sigmaN / scaleZ * 25} x2={rs.b / 2 * sc} y2={yBase + sigmaN / scaleZ * 25} stroke="var(--st-warn)" strokeWidth={.8 * strokeK} strokeDasharray="2,2" opacity=".5" />}
      {analysis.distributionZ.map((point, index) => { const height = zValues[index] / scaleZ * 25; return <rect key={`z-${index}`} x={point.z * sc - 1.5} y={height >= 0 ? yBase : yBase + height} width="3" height={Math.abs(height)} fill={stressColor(zValues[index], scaleZ)} opacity=".7" />; })}
      <polyline points={analysis.distributionZ.map((point, index) => `${point.z * sc},${yBase + zValues[index] / scaleZ * 25}`).join(' ')} fill="none" stroke="var(--st-text-2)" strokeWidth={.8 * strokeK} opacity=".5" />
      {showTotalSigma && neutralZ.map((value, index) => <line key={`nz-${index}`} x1={value * sc} y1={yBase - 6} x2={value * sc} y2={yBase + 6} stroke="var(--st-value)" strokeWidth={strokeK} strokeDasharray="3,2" opacity=".8" />)}
      {!showTotalSigma && Math.abs(sigmaN) > .001 && <text x={-rs.b / 2 * sc} y={yBase + 32} fill="var(--st-warn)" fontSize={4.5 * textK}>+ N/A = {fmt(sigmaN)} MPa</text>}
      <text x={rs.b / 2 * sc + 36} y="-60" fill="var(--st-text-2)" fontSize={7 * textK}>σ(y)</text><text x="0" y={rs.h / 2 * sc + 38} fill="var(--st-text-2)" fontSize={7 * textK} textAnchor="middle">σ(z)</text>
    </>}
    {showShear && !showPerpNA && <ShearBars3D analysis={analysis} useGlobalScale={useGlobalScale} globalScales={globalScales} {...{ strokeK, textK }} />}
    {showSigma && showPerpNA && perpNA?.exists && <NeutralAxis3D neutralAxis={perpNA} rs={rs} sc={sc} strokeK={strokeK} textK={textK} />}
    {showSigma && showPerpNA && perpNA && perpNADist.length > 0 && <PerpendicularDistribution points={perpNADist} neutralAxis={perpNA} rs={rs} sc={sc} showTotalSigma={showTotalSigma} gradientId={perpGradientId} strokeK={strokeK} textK={textK} />}
    <circle cx={zF * sc} cy={-yF * sc} r="3.5" fill="var(--st-warn)" opacity=".9" /><line x1={-rs.b / 2 * sc - 5} y1={-yF * sc} x2={rs.b / 2 * sc + 5} y2={-yF * sc} stroke="var(--st-warn)" strokeWidth={.8 * strokeK} strokeDasharray="3,2" opacity=".5" /><line x1={zF * sc} y1={-rs.h / 2 * sc - 5} x2={zF * sc} y2={rs.h / 2 * sc + 5} stroke="var(--st-warn)" strokeWidth={.8 * strokeK} strokeDasharray="3,2" opacity=".5" />
  </>;
}

function ShearBars3D({ analysis, useGlobalScale, globalScales, strokeK, textK }: { analysis: SectionStressResult3D; useGlobalScale: boolean; globalScales: CrossSectionDrawingProps['globalScales'] } & Pick<ScaleProps, 'strokeK' | 'textK'>) {
  const rs = analysis.resolved, sc = 80 / Math.max(rs.h, rs.b), xBase = -(rs.b / 2 * sc + 4);
  const max = useGlobalScale && globalScales ? globalScales.maxTauY : Math.max(...analysis.distributionY.map((point) => Math.abs(point.tauVz)), 1e-6);
  if (max <= .01) return null;
  return <>{analysis.distributionY.map((point, index) => { const width = Math.abs(point.tauVz) / max * 35; return width > .2 ? <rect key={index} x={xBase - width} y={-point.y * sc - 1.5} width={width} height="3" fill="var(--st-accent)" opacity=".5" /> : null; })}<polyline points={analysis.distributionY.map((point) => `${xBase - Math.abs(point.tauVz) / max * 35},${-point.y * sc}`).join(' ')} fill="none" stroke="var(--st-accent)" strokeWidth={1.2 * strokeK} opacity=".8" /><line x1={xBase} y1={-rs.h / 2 * sc} x2={xBase} y2={rs.h / 2 * sc} stroke="var(--st-accent)" strokeWidth={.4 * strokeK} opacity=".3" /><text x={xBase - 2} y={-rs.h / 2 * sc - 6} fill="var(--st-accent)" fontSize={5.5 * textK} textAnchor="end">τ(y)</text><text x={xBase - 2} y="1" fill="var(--st-accent)" fontSize={5 * textK} textAnchor="end">{fmt(max)} MPa</text></>;
}

function NeutralAxis3D({ neutralAxis, rs, sc, strokeK, textK }: { neutralAxis: NeutralAxisInfo; rs: ResolvedSection; sc: number } & Pick<ScaleProps, 'strokeK' | 'textK'>) {
  const points = neutralAxis.slope === Infinity ? [[Math.max(-rs.b / 2, Math.min(rs.b / 2, neutralAxis.intercept)), -rs.h / 2], [Math.max(-rs.b / 2, Math.min(rs.b / 2, neutralAxis.intercept)), rs.h / 2]] : clippedLine(neutralAxis, rs);
  return <>{points.length >= 2 && <line x1={points[0][0] * sc} y1={-points[0][1] * sc} x2={points[1][0] * sc} y2={-points[1][1] * sc} stroke="var(--st-value)" strokeWidth={2 * strokeK} opacity=".9" />}<text x={rs.b / 2 * sc + 2} y={-rs.h / 2 * sc - 6} fill="var(--st-value)" fontSize={6 * textK} fontWeight="bold" opacity=".9">EN</text></>;
}

function PerpendicularDistribution({ points, neutralAxis, rs, sc, showTotalSigma, gradientId, strokeK, textK }: { points: PerpNAPoint[]; neutralAxis: NeutralAxisInfo; rs: ResolvedSection; sc: number; showTotalSigma: boolean; gradientId: string } & Pick<ScaleProps, 'strokeK' | 'textK'>) {
  const max = Math.max(...points.map((point) => Math.abs(point.sigma)), 1e-6), length = neutralAxis.slope === Infinity ? 1 : Math.hypot(1, neutralAxis.slope);
  const px = neutralAxis.slope === Infinity ? 0 : 1 / length, py = neutralAxis.slope === Infinity ? -1 : -neutralAxis.slope / length, barScale = 35;
  const profile = points.map((point) => `${point.z * sc + point.sigma / max * barScale * px},${-point.y * sc + point.sigma / max * barScale * py}`).join(' ');
  const polygon = `${profile} ${points.slice().reverse().map((point) => `${point.z * sc},${-point.y * sc}`).join(' ')}`;
  const tension = points.reduce((best, point) => point.sigma > best.sigma ? point : best, points[0]);
  const compression = points.reduce((best, point) => point.sigma < best.sigma ? point : best, points[0]);
  const label = (point: PerpNAPoint, kind: 'max' | 'min') => { const len = point.sigma / max * barScale; const x = point.z * sc + len * px, y = -point.y * sc + len * py; return <text x={x + 3} y={y + (kind === 'max' ? -3 : 6)} fill={kind === 'max' ? 'var(--st-danger)' : 'var(--st-info)'} fontSize={5 * textK}>σ<tspan fontSize={3.5 * textK} dy="1.5">{kind}</tspan><tspan dy="-1.5"> = {point.sigma > 0 ? '+' : ''}{fmt(point.sigma)}</tspan></text>; };
  return <><defs><linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1={points[0].z * sc} y1={-points[0].y * sc} x2={points[points.length - 1].z * sc} y2={-points[points.length - 1].y * sc}><stop offset="0%" stopColor="var(--st-danger)" /><stop offset="50%" stopColor="var(--st-text-3)" /><stop offset="100%" stopColor="var(--st-info)" /></linearGradient></defs><polygon points={polygon} fill={`url(#${gradientId})`} opacity=".3" /><line x1={points[0].z * sc} y1={-points[0].y * sc} x2={points[points.length - 1].z * sc} y2={-points[points.length - 1].y * sc} stroke="var(--st-text-3)" strokeWidth={.8 * strokeK} strokeDasharray="3,2" opacity=".6" />{points.map((point, index) => { const len = point.sigma / max * barScale; return Math.abs(len) > .3 ? <line key={index} x1={point.z * sc} y1={-point.y * sc} x2={point.z * sc + len * px} y2={-point.y * sc + len * py} stroke={stressColor(point.sigma, max)} strokeWidth={2 * strokeK} opacity=".7" /> : null; })}<polyline points={profile} fill="none" stroke="var(--st-value)" strokeWidth={1.5 * strokeK} opacity=".9" />{tension.sigma > .001 && label(tension, 'max')}{compression.sigma < -.001 && label(compression, 'min')}<text x="0" y={rs.h / 2 * sc + 46} fill="var(--st-value)" fontSize={5.5 * textK} textAnchor="middle">{showTotalSigma ? 'σ total' : 'σ'} ⟂ EN</text></>;
}

function TwoDimensionalDiagram({ analysis, showSigma, showShear, showTotalSigma, showPerpNA, useGlobalScale, globalScales, shearFlow, isMassive, fiberRatioY, strokeK, textK, glyphK }: { analysis: SectionStressResult; showSigma: boolean; showShear: boolean; showTotalSigma: boolean; showPerpNA: boolean; useGlobalScale: boolean; globalScales: CrossSectionDrawingProps['globalScales']; shearFlow: ShearFlowSegment[]; isMassive: boolean; fiberRatioY: number } & ScaleProps) {
  const rs = analysis.resolved, sc = 80 / Math.max(rs.h, rs.b), xBase = rs.b / 2 * sc + 4;
  const sigmaN = rs.a > 1e-15 ? analysis.N / rs.a / 1000 : 0;
  const bending = analysis.distribution.map((point) => rs.iy > 1e-20 ? analysis.M * point.y / rs.iy / 1000 : 0);
  const values = showTotalSigma ? analysis.distribution.map((point) => point.sigma) : bending;
  const max = useGlobalScale && globalScales ? globalScales.maxSigmaY : Math.max(...values.map(Math.abs), ...bending.map(Math.abs), 1e-6);
  const fiberY = -(rs.yMin + fiberRatioY * (rs.yMax - rs.yMin)) * sc;
  return <>
    {showSigma && <><line x1={xBase} y1={-rs.h / 2 * sc} x2={xBase} y2={rs.h / 2 * sc} stroke="var(--st-text-2)" strokeWidth={.4 * strokeK} opacity=".3" />{showTotalSigma && Math.abs(sigmaN) > .01 && <><line x1={xBase + sigmaN / max * 30} y1={-rs.h / 2 * sc} x2={xBase + sigmaN / max * 30} y2={rs.h / 2 * sc} stroke="var(--st-warn)" strokeWidth={.8 * strokeK} strokeDasharray="2,2" opacity=".5" /><text x={xBase + sigmaN / max * 30} y={-rs.h / 2 * sc - 3} fill="var(--st-warn)" fontSize={3.5 * textK} textAnchor="middle">N/A</text></>}{analysis.distribution.map((point, index) => { const width = values[index] / max * 30; return <rect key={index} x={width >= 0 ? xBase : xBase + width} y={-point.y * sc - 1.5} width={Math.abs(width)} height="3" fill={stressColor(values[index], max)} opacity=".8" />; })}<polyline points={analysis.distribution.map((point, index) => `${xBase + values[index] / max * 30},${-point.y * sc}`).join(' ')} fill="none" stroke="var(--st-text-2)" strokeWidth={.8 * strokeK} opacity=".6" />{showTotalSigma && zeroCrossings(analysis.distribution.map((point) => [point.y, point.sigma])).map((value, index) => <g key={index}><line x1={xBase - 8} y1={-value * sc} x2={xBase + 8} y2={-value * sc} stroke="var(--st-value)" strokeWidth={strokeK} strokeDasharray="3,2" opacity=".8" /><text x={xBase + 10} y={-value * sc + 3} fill="var(--st-value)" fontSize={4 * textK}>EN</text></g>)}<text x={xBase} y={-rs.h / 2 * sc - (showTotalSigma ? 7 : 4)} fill="var(--st-text-2)" fontSize={(showTotalSigma ? 4 : 4.5) * textK}>{showTotalSigma ? 'σ = N/A + M·y/I' : 'M·y/I'}</text>{!showTotalSigma && Math.abs(sigmaN) > .001 && <text x={xBase} y={-rs.h / 2 * sc - 10} fill="var(--st-warn)" fontSize={4.5 * textK}>+ N/A = {fmt(sigmaN)} MPa</text>}</>}
    {showShear && (isMassive ? <MassiveShear analysis={analysis} useGlobalScale={useGlobalScale} globalScales={globalScales} textK={textK} /> : <ThinWallShear analysis={analysis} segments={shearFlow} useGlobalScale={useGlobalScale} globalScales={globalScales} strokeK={strokeK} textK={textK} glyphK={glyphK} />)}
    {showSigma && showPerpNA && <NeutralAxis2D analysis={analysis} showTotalSigma={showTotalSigma} strokeK={strokeK} textK={textK} />}
    <line x1={-rs.b / 2 * sc - 5} y1={fiberY} x2={rs.b / 2 * sc + 5} y2={fiberY} stroke="var(--st-warn)" strokeWidth={1.5 * strokeK} strokeDasharray="3,2" />{showSigma && <text x={rs.b / 2 * sc + 36} y="-60" fill="var(--st-text-2)" fontSize={8 * textK}>σ</text>}{showShear && <text x={-(rs.b / 2 * sc + 6)} y="-68" fill="var(--st-accent)" fontSize={6 * textK} textAnchor="end">{isMassive ? 'τ(y) Jourawski' : t('stress.shearFlow')}</text>}
  </>;
}

function MassiveShear({ analysis, useGlobalScale, globalScales, textK }: { analysis: SectionStressResult; useGlobalScale: boolean; globalScales: CrossSectionDrawingProps['globalScales'] } & Pick<ScaleProps, 'textK'>) {
  const rs = analysis.resolved, sc = 80 / Math.max(rs.h, rs.b), max = useGlobalScale && globalScales ? globalScales.maxTauY : Math.max(...analysis.distribution.map((point) => Math.abs(point.tau)), 1e-6);
  return <>{analysis.distribution.map((point, index) => { const width = Math.abs(point.tau) / max * 25; return width > .2 ? <rect key={index} x={-(rs.b / 2 * sc + 4 + width)} y={-point.y * sc - 1.5} width={width} height="3" fill="var(--st-accent)" opacity=".55" /> : null; })}<text x={-(rs.b / 2 * sc + 6)} y="1" fill="var(--st-accent)" fontSize={5.5 * textK} textAnchor="end">{fmt(max)} MPa</text></>;
}

function ThinWallShear({ analysis, segments, useGlobalScale, globalScales, strokeK, textK, glyphK }: { analysis: SectionStressResult; segments: ShearFlowSegment[]; useGlobalScale: boolean; globalScales: CrossSectionDrawingProps['globalScales'] } & ScaleProps) {
  if (!segments.length) return null;
  const rs = analysis.resolved, sc = 80 / Math.max(rs.h, rs.b), all = segments.flatMap((segment) => segment.points.map((point) => point.tau));
  const max = useGlobalScale && globalScales ? globalScales.maxTauY : Math.max(...all, 1e-6), tauScale = 20 / max, gap = 4, sign = analysis.V >= 0 ? 1 : -1;
  const peak = segments.flatMap((segment) => segment.points).reduce((best, point) => point.tau > best.tau ? point : best, { z: 0, y: 0, tau: 0 });
  return <>{segments.map((segment, index) => { const points = segment.points; if (points.length < 2) return null; const dz = points.at(-1)!.z - points[0].z, dy = points.at(-1)!.y - points[0].y, length = Math.hypot(dz, dy) || 1, midZ = (points[0].z + points.at(-1)!.z) / 2, midY = (points[0].y + points.at(-1)!.y) / 2, az = -dy / length, ay = dz / length, flip = (midZ + az) ** 2 + (midY + ay) ** 2 < (midZ - az) ** 2 + (midY - ay) ** 2, rawZ = flip ? -az : az, rawY = flip ? -ay : ay, vertical = Math.abs(dy) > Math.abs(dz) * 2, pz = vertical && rawZ > 0 ? -rawZ : rawZ, py = vertical && rawZ > 0 ? -rawY : rawY; const base = points.map((point) => `${point.z * sc + gap * pz},${-point.y * sc - gap * py}`); const profile = points.map((point) => `${point.z * sc + gap * pz + point.tau * tauScale * pz},${-point.y * sc - gap * py - point.tau * tauScale * py}`); const arrowIndex = Math.round(points.length * .55), point = points[arrowIndex], next = points[sign >= 0 ? Math.min(arrowIndex + 1, points.length - 1) : Math.max(arrowIndex - 1, 0)], adz = next.z - point.z || dz / length * .001, ady = next.y - point.y || dy / length * .001, alen = Math.hypot(adz, ady) || 1, ax = point.z * sc, ay2 = -point.y * sc, fw = adz / alen, fh = -ady / alen; return <g key={index}><polygon points={`${profile.join(' ')} ${base.slice().reverse().join(' ')}`} fill="rgba(229,72,42,.15)" /><polyline points={profile.join(' ')} fill="none" stroke="var(--st-accent)" strokeWidth={1.2 * strokeK} /><polyline points={base.join(' ')} fill="none" stroke="var(--st-accent)" strokeWidth={.4 * strokeK} opacity=".35" /><polygon points={`${ax + fw * 5.5 * glyphK},${ay2 + fh * 5.5 * glyphK} ${ax - fw * 2 * glyphK + fh * 3 * glyphK},${ay2 - fh * 2 * glyphK - fw * 3 * glyphK} ${ax - fw * 2 * glyphK - fh * 3 * glyphK},${ay2 - fh * 2 * glyphK + fw * 3 * glyphK}`} fill="var(--st-accent)" stroke="var(--st-surface-2)" strokeWidth={.5 * strokeK} opacity=".95" /></g>; })}{peak.tau > .01 && <><circle cx={peak.z * sc} cy={-peak.y * sc} r={2.5 * glyphK} fill="var(--st-accent)" opacity=".9" /><text x={peak.z * sc + (peak.z >= 0 ? 5 : -5)} y={-peak.y * sc - 4} fill="var(--st-accent)" fontSize={6.5 * textK} textAnchor={peak.z >= 0 ? 'start' : 'end'}>{peak.tau.toFixed(1)}</text></>}</>;
}

function NeutralAxis2D({ analysis, showTotalSigma, strokeK, textK }: { analysis: SectionStressResult; showTotalSigma: boolean } & Pick<ScaleProps, 'strokeK' | 'textK'>) {
  const rs = analysis.resolved, sc = 80 / Math.max(rs.h, rs.b), y = showTotalSigma && analysis.neutralAxisY !== null ? analysis.neutralAxisY : 0, inside = y >= rs.yMin && y <= rs.yMax;
  if (!inside) { const up = y > rs.yMax; return <text x={-rs.b / 2 * sc - 10} y={up ? -rs.h / 2 * sc + 3 : rs.h / 2 * sc + 3} fill="var(--st-value)" fontSize={5 * textK} textAnchor="end" opacity=".7">{t('stress.naOutside').replace('{arrow}', up ? '↑' : '↓')}</text>; }
  return <><line x1={-rs.b / 2 * sc - 8} y1={-y * sc} x2={rs.b / 2 * sc + 8} y2={-y * sc} stroke="var(--st-value)" strokeWidth={2 * strokeK} opacity=".9" /><text x={-rs.b / 2 * sc - 10} y={-y * sc + 3} fill="var(--st-value)" fontSize={6 * textK} fontWeight="bold" textAnchor="end">EN</text>{showTotalSigma && analysis.neutralAxisY !== null && Math.abs(y) > .0001 && <text x={rs.b / 2 * sc + 10} y={-y * sc + 3} fill="var(--st-value)" fontSize={4 * textK} opacity=".8">y = {fmt(y * 1000, 1)} mm</text>}</>;
}

function TorsionDiagram({ torsionFlow, resolved, strokeK, textK, glyphK }: { torsionFlow: TorsionFlow; resolved: ResolvedSection } & ScaleProps) {
  const sc = 80 / Math.max(resolved.h, resolved.b), peak = Math.max(torsionFlow.tauMax, 1e-9);
  return <>{torsionFlow.segments.map((segment, index) => segment.closed ? <g key={index}><polyline points={segment.points.map((point) => `${point.z * sc},${-point.y * sc}`).join(' ')} fill="none" stroke="var(--st-accent)" strokeWidth={1.6 * strokeK} opacity=".85" />{segment.points.slice(0, -1).map((point, pointIndex) => { const next = segment.points[pointIndex + 1], x = (point.z + next.z) / 2 * sc, y = -(point.y + next.y) / 2 * sc, angle = Math.atan2(-(next.y - point.y), next.z - point.z) * 180 / Math.PI; return <polygon key={pointIndex} points="0,-1.6 4,0 0,1.6" fill="var(--st-accent)" opacity=".9" transform={`translate(${x},${y}) rotate(${angle}) scale(${glyphK})`} />; })}</g> : <g key={index}><polyline points={segment.points.map((point) => `${point.z * sc},${-point.y * sc - point.tau / peak * 26}`).join(' ')} fill="none" stroke="var(--st-accent)" strokeWidth={1.2 * strokeK} opacity=".9" /><line x1={segment.points[0].z * sc} y1={-segment.points[0].y * sc} x2={segment.points.at(-1)!.z * sc} y2={-segment.points.at(-1)!.y * sc} stroke="var(--st-text-3)" strokeWidth={.4 * strokeK} opacity=".5" /></g>)}<text x="0" y="-84" fill="var(--st-accent)" fontSize={5 * textK} textAnchor="middle" opacity=".9">τ<tspan fontSize={3.6 * textK} dy={1.2 * textK}>T</tspan></text></>;
}

function EccentricLayer(props: CrossSectionDrawingProps & { canonicalScale: number; dragging: boolean; activeMarker: 'n' | 'v'; onStartDrag: (event: ReactPointerEvent<SVGElement>, marker?: 'n' | 'v') => void; onMoveDrag: (event: ReactPointerEvent<SVGElement>) => void; onEndDrag: (event: ReactPointerEvent<SVGElement>) => void; onNudge: (event: ReactKeyboardEvent<SVGGElement>, marker: 'n' | 'v') => void } & ScaleProps) {
  const sc = props.canonicalScale;
  const scx = props.shearCentre ? props.shearCentre[0] * sc : 0, scy = props.shearCentre ? -props.shearCentre[1] * sc : 0;
  return <>
    <rect x="-90" y="-90" width="180" height="180" fill="transparent" className="ssp-ecc-catch" role="button" tabIndex={-1} aria-label={t('stress.eccentricPlace')} onPointerDown={(event) => props.onStartDrag(event)} onPointerMove={props.onMoveDrag} onPointerUp={props.onEndDrag} onPointerCancel={props.onEndDrag} />
    <g opacity=".9"><circle cx="0" cy="0" r="2.2" fill="none" stroke="var(--st-text-2)" strokeWidth={.8 * props.strokeK} /><line x1="-3.6" y1="0" x2="3.6" y2="0" stroke="var(--st-text-2)" strokeWidth={.6 * props.strokeK} /><line x1="0" y1="-3.6" x2="0" y2="3.6" stroke="var(--st-text-2)" strokeWidth={.6 * props.strokeK} /><text x="4.5" y="-2.5" fill="var(--st-text-2)" fontSize={4 * props.textK}>G</text></g>
    {props.shearCentre && Math.hypot(...props.shearCentre) * sc > .5 && <><g opacity=".95"><circle cx={scx} cy={scy} r="2.6" fill="none" stroke="var(--st-accent)" strokeWidth={props.strokeK} strokeDasharray="1.5,1" /><circle cx={scx} cy={scy} r=".9" fill="var(--st-accent)" /><text x={scx + 4.5} y={scy + 1.5} fill="var(--st-accent)" fontSize={4 * props.textK}>CC</text></g>{props.eccentricPointV && props.hasParallelLoad && <line x1={scx} y1={scy} x2={props.eccentricPointV[0] * sc} y2={-props.eccentricPointV[1] * sc} stroke="var(--st-accent)" strokeWidth={.7 * props.strokeK} strokeDasharray="2,1.5" opacity=".7" />}</>}
    {props.eccentricPoint && <EccentricMarker marker="n" point={props.eccentricPoint} sc={sc} color={props.eccentricInsideKern ? 'var(--st-ok)' : 'var(--st-warn)'} square={false} inactive={props.hasParallelLoad && props.activeMarker !== 'n'} {...props} />}
    {props.eccentricPointV && props.hasParallelLoad && <EccentricMarker marker="v" point={props.eccentricPointV} sc={sc} color="var(--st-accent)" square inactive={props.activeMarker !== 'v'} {...props} />}
  </>;
}

function EccentricMarker(props: { marker: 'n' | 'v'; point: [number, number]; sc: number; color: string; square: boolean; inactive: boolean; dragging: boolean; activeMarker: 'n' | 'v'; strokeK: number; textK: number; onStartDrag: (event: ReactPointerEvent<SVGElement>, marker?: 'n' | 'v') => void; onMoveDrag: (event: ReactPointerEvent<SVGElement>) => void; onEndDrag: (event: ReactPointerEvent<SVGElement>) => void; onNudge: (event: ReactKeyboardEvent<SVGGElement>, marker: 'n' | 'v') => void }) {
  const x = props.point[0] * props.sc, y = -props.point[1] * props.sc;
  return <g className={`ssp-ecc-marker${props.dragging && props.activeMarker === props.marker ? ' dragging' : ''}${props.inactive ? ' inactive' : ''}`} role="button" tabIndex={0} aria-label={t(props.marker === 'n' ? 'stress.eccentricPointN' : 'stress.eccentricPointV')} onPointerDown={(event) => props.onStartDrag(event, props.marker)} onPointerMove={props.onMoveDrag} onPointerUp={props.onEndDrag} onPointerCancel={props.onEndDrag} onKeyDown={(event) => props.onNudge(event, props.marker)}>
    {props.square ? <><rect x={x - 6} y={y - 6} width="12" height="12" fill={props.color} opacity=".12" /><rect x={x - 3} y={y - 3} width="6" height="6" fill="none" stroke={props.color} strokeWidth={1.4 * props.strokeK} /><circle cx={x} cy={y} r="1" fill={props.color} /><text x={x + 5.5} y={y + 6} fill={props.color} fontSize={4.2 * props.textK} fontWeight="600">P∥</text></> : <><circle cx={x} cy={y} r="6.5" fill={props.color} opacity=".14" /><circle cx={x} cy={y} r="3.2" fill="none" stroke={props.color} strokeWidth={1.4 * props.strokeK} /><circle cx={x} cy={y} r="1" fill={props.color} /><text x={x + 5.5} y={y - 4} fill={props.color} fontSize={4.2 * props.textK} fontWeight="600">P⊥</text></>}
  </g>;
}

function FiberSlider({ label, value, onChange, display, help, z = false }: { label: string; value: number; onChange: (value: number) => void; display: string; help?: string; z?: boolean }) {
  return <div className="ssp-fiber-row"><span className="ssp-fiber-label">{label}</span><input type="range" className={`ssp-range${z ? ' ssp-range-z' : ''}`} min="0" max="1" step="0.02" value={value} onChange={(event) => onChange(+event.target.value)} /><span className="ssp-fiber-val">{display} mm</span>{help && <span className="ssp-help" title={help}>?</span>}</div>;
}

function zeroCrossings(points: Array<[number, number]>) {
  const values: number[] = [];
  points.forEach(([position, value], index) => {
    if (!index) return;
    const [previousPosition, previousValue] = points[index - 1];
    if (previousValue * value < 0) values.push(previousPosition + (position - previousPosition) * (-previousValue) / (value - previousValue));
  });
  return values;
}

function clippedLine(axis: NeutralAxisInfo, rs: ResolvedSection): Array<[number, number]> {
  const height = rs.h / 2 * 1.6, width = rs.b / 2 * 1.6, points: Array<[number, number]> = [];
  const add = (z: number, y: number) => { if (!points.some((point) => Math.abs(point[0] - z) < 1e-9 && Math.abs(point[1] - y) < 1e-9)) points.push([z, y]); };
  const y1 = axis.slope * -width + axis.intercept, y2 = axis.slope * width + axis.intercept;
  if (y1 >= -height && y1 <= height) add(-width, y1);
  if (y2 >= -height && y2 <= height) add(width, y2);
  if (Math.abs(axis.slope) > 1e-12) { const z1 = (-height - axis.intercept) / axis.slope, z2 = (height - axis.intercept) / axis.slope; if (z1 >= -width && z1 <= width) add(z1, -height); if (z2 >= -width && z2 <= width) add(z2, height); }
  return points;
}

function mapStops(low: number, high: number, scale: number) {
  return Array.from({ length: 11 }, (_, index) => { const offset = index / 10; return { offset, color: stressColor(low + offset * (high - low), scale) }; });
}

function canonicalPath(geometry: DrawingGeometry) {
  const [yMin, zMin, yMax, zMax] = geometry.bbox, scale = 80 / Math.max(Math.max(yMax - yMin, 1e-12), Math.max(zMax - zMin, 1e-12));
  const ring = (polygon: Array<[number, number]>) => `${polygon.map(([y, z], index) => `${index ? 'L' : 'M'}${(y * scale).toFixed(3)} ${(-z * scale).toFixed(3)}`).join(' ')} Z`;
  return [...geometry.solids, ...geometry.holes].map(ring).join(' ');
}

function sectionPathFromResolved(rs: { shape: SectionShape; h: number; b: number; tw: number; tf: number; t: number; tl?: number }) {
  return crossSectionPath({ shape: rs.shape, h: rs.h, b: rs.b, tw: rs.tw, tf: rs.tf, t: rs.t, tl: rs.tl });
}
