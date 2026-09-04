import { modelStore, resultsStore, uiStore } from '../../../lib/store';
import { propertyDeviation } from '../../../lib/section/state';
import { canonicalStressState } from '../../../lib/section/stress-state';
import { supportsDetailedAnalysis } from '../../../lib/section/drawing';
import { canonicalPanelResult, stationForces2D, stationForces3D } from '../../../lib/section/panel';
import {
  analyzeSectionStress,
  suggestCriticalSections,
  computeShearFlowPaths,
  isMassiveSection,
  computeCentralCore,
} from '../../../lib/engine/section-stress';
import type { SectionStressResult, ShearFlowSegment, CentralCore } from '../../../lib/engine/section-stress';
import {
  analyzeSectionStress3D,
  analyzeSectionStressFromForces,
  suggestCriticalSections3D,
  computePerpNADistribution,
  computeNeutralAxisMomentsOnly,
} from '../../../lib/engine/section-stress-3d';
import type { SectionStressResult3D, PerpNAPoint } from '../../../lib/engine/section-stress-3d';
import { computeDiagramValueAt } from '../../../lib/engine/diagrams';
import { isPointInConvexPolygon } from '../../../components/stress/fmt';
import { resolveEccentric, snapShearCentre, kernLimits } from '../../../lib/section/eccentric';
import { computeTorsionFlow } from '../../../lib/engine/torsion-flow';
import { crossCheckShearPeak } from '../../../lib/section/shear-crosscheck';

export type EccentricSource = 'model' | 'custom' | 'isolated';
export type SectionStressPanelInputs = {
  fiberRatioY: number;
  fiberRatioZ: number;
  showTotalSigma: boolean;
  showPerpNA: boolean;
  showPressureCenter: boolean;
  showEccentric: boolean;
  eccentricPoint: [number, number] | null;
  eccentricPointV: [number, number] | null;
  eccSource: EccentricSource;
  eccCustom: { n: number; vy: number; vz: number };
  useGlobalScale: boolean;
};

/**
 * Framework-neutral projection used by the React panel.
 *
 * Keep the dependency order explicit: canonical geometry and its base state
 * are resolved before eccentricity; eccentricity chooses the 2D/biaxial path;
 * every diagram and readout is then derived from that single active path.
 */
export function buildSectionStressPanelModel(input: SectionStressPanelInputs) {
  const {
    fiberRatioY, fiberRatioZ, showTotalSigma, showPerpNA, showPressureCenter,
    showEccentric, eccentricPoint, eccentricPointV, eccSource, eccCustom,
    useGlobalScale,
  } = input;
  const is3D = uiStore.analysisMode === '3d' || uiStore.analysisMode === 'pro';
  const query = resultsStore.stressQuery;
  const queryElement = query ? modelStore.elements.get(query.elementId) : undefined;
  const querySec = queryElement ? modelStore.sections.get(queryElement.sectionId) ?? null : null;
  const isRotated2D = !is3D && (querySec?.rotation ?? 0) !== 0;
  const isAmorphous = Boolean(querySec && !supportsDetailedAnalysis(querySec));
  const unavailableReason = !querySec || supportsDetailedAnalysis(querySec) ? null : {
    kind: querySec.canonical?.kind === 'properties-only' && querySec.canonical.reason.kind !== 'noGeometry' ? 'noGeometryData' as const : 'amorphous' as const,
    name: querySec.name || '—',
  };
  const deviation = querySec ? propertyDeviation(querySec) : null;

  const canonical = (() => {
    if (!query || !queryElement || !querySec || !supportsDetailedAnalysis(querySec)) return null;
    if (is3D) {
      const forces = resultsStore.getElementForces3D(query.elementId);
      return forces ? canonicalPanelResult(querySec, stationForces3D(forces, query.t)) : null;
    }
    const forces = resultsStore.getElementForces(query.elementId);
    return forces ? canonicalPanelResult(querySec, stationForces2D(forces, query.t)) : null;
  })();
  const canonicalGeometry = canonical?.ok ? canonical.geometry : null;

  const stateInputs = (() => {
    if (!query || !queryElement || !canonical?.ok) return null;
    const sec = modelStore.sections.get(queryElement.sectionId);
    const mat = modelStore.materials.get(queryElement.materialId);
    if (!sec) return null;
    const [yMin, zMin, yMax, zMax] = canonical.geometry.bbox;
    const point: [number, number] = [yMin + fiberRatioZ * (yMax - yMin), zMin + fiberRatioY * (zMax - zMin)];
    const forces = canonical.forces as { n: number; my: number; mz: number; vy?: number; vz?: number; tx?: number };
    return {
      sec,
      fy: mat?.fy,
      elastic: mat && mat.e > 0 ? { e: mat.e, nu: mat.nu ?? .3 } : undefined,
      point,
      forces: { n: forces.n, my: forces.my, mz: forces.mz, vy: forces.vy, vz: forces.vz, t: forces.tx },
      bending: canonical.bending,
    };
  })();

  const canonicalState = (() => {
    if (!stateInputs) return null;
    const result = canonicalStressState(stateInputs.sec, stateInputs.forces, stateInputs.point, stateInputs.fy, { elastic: stateInputs.elastic, bending: stateInputs.bending });
    return result.ok ? result.state : null;
  })();
  const shearCentreClean: [number, number] = (() => {
    if (!canonical?.ok) return [0, 0];
    const [yMin, zMin, yMax, zMax] = canonical.geometry.bbox;
    return snapShearCentre(canonicalState?.shearCentre, Math.max(yMax - yMin, zMax - zMin));
  })();
  const eccentricComponents = eccSource === 'model'
    ? { n: stateInputs?.forces.n ?? 0, vy: stateInputs?.forces.vy ?? 0, vz: stateInputs?.forces.vz ?? 0 }
    : eccCustom;
  const eccentricHasParallel = Math.abs(eccentricComponents.vy) > 1e-12 || Math.abs(eccentricComponents.vz) > 1e-12;
  const eccentricNothingToMove = eccSource === 'model' && Math.abs(eccentricComponents.n) < 1e-9 && Math.abs(eccentricComponents.vy) < 1e-9 && Math.abs(eccentricComponents.vz) < 1e-9;
  const eccentricNoAxial = Math.abs(eccentricComponents.n) < 1e-12 && !eccentricNothingToMove;

  const eccentric = (() => {
    if (!showEccentric || !eccentricPoint || !stateInputs) return null;
    const own = stateInputs.forces;
    const source = eccSource === 'model' ? { n: own.n, vy: own.vy ?? 0, vz: own.vz ?? 0 } : eccCustom;
    const base = eccSource === 'isolated'
      ? { n: 0, my: 0, mz: 0, vy: 0, vz: 0, t: 0 }
      : { n: own.n, my: own.my, mz: own.mz, vy: own.vy ?? 0, vz: own.vz ?? 0, t: own.t ?? 0 };
    const normal = resolveEccentric({ n: source.n, at: eccentricPoint }, shearCentreClean);
    const parallel = resolveEccentric({ vy: source.vy, vz: source.vz, at: eccentricPointV ?? [0, 0] }, shearCentreClean);
    const effect = { myFromN: normal.effect.myFromN, mzFromN: normal.effect.mzFromN, tFromShear: parallel.effect.tFromShear, shearArm: parallel.effect.shearArm };
    if (eccSource === 'model') return { forces: { ...base, my: base.my + effect.myFromN, mz: base.mz + effect.mzFromN, t: base.t + effect.tFromShear }, effect };
    return { forces: { n: base.n + source.n, my: base.my + effect.myFromN, mz: base.mz + effect.mzFromN, vy: base.vy + source.vy, vz: base.vz + source.vz, t: base.t + effect.tFromShear }, effect };
  })();
  const eccentricHasEffect = Boolean(eccentric && (
    Math.abs(eccentric.effect.myFromN) > 1e-9 || Math.abs(eccentric.effect.mzFromN) > 1e-9 || Math.abs(eccentric.effect.tFromShear) > 1e-9 ||
    (eccSource !== 'model' && (Math.abs(eccCustom.n) > 1e-12 || Math.abs(eccCustom.vy) > 1e-12 || Math.abs(eccCustom.vz) > 1e-12))
  ));
  const eccentricActive = showEccentric && eccentric !== null && eccentricHasEffect;

  const analysis2D: SectionStressResult | null = (() => {
    if (eccentricActive || is3D || isRotated2D || !query || !resultsStore.results || isAmorphous || !queryElement) return null;
    const sec = modelStore.sections.get(queryElement.sectionId);
    const mat = modelStore.materials.get(queryElement.materialId);
    const forces = resultsStore.getElementForces(query.elementId);
    if (!sec || !mat || !forces) return null;
    const first = analyzeSectionStress(forces, sec, mat.fy, query.t);
    const yFiber = first.resolved.yMin + fiberRatioY * (first.resolved.yMax - first.resolved.yMin);
    return analyzeSectionStress(forces, sec, mat.fy, query.t, yFiber);
  })();

  const analysis3D: SectionStressResult3D | null = (() => {
    if (isAmorphous || !query || !queryElement) return null;
    const sec = modelStore.sections.get(queryElement.sectionId);
    const mat = modelStore.materials.get(queryElement.materialId);
    if (!sec || !mat) return null;
    if (eccentricActive && eccentric && stateInputs) {
      const [py, pz] = stateInputs.point;
      const forces = eccentric.forces;
      return analyzeSectionStressFromForces(forces.n, forces.vy, forces.vz, forces.t, -forces.my, -forces.mz, sec, mat.fy, pz, py);
    }
    if (is3D) {
      if (!resultsStore.results3D) return null;
      const forces = resultsStore.getElementForces3D(query.elementId);
      if (!forces) return null;
      const halfH = forces.length > 0 ? (sec.h ?? Math.sqrt(12 * (sec.iy ?? sec.iz) / sec.a)) / 2 : .1;
      const halfB = (sec.b ?? sec.h ?? Math.sqrt(12 * sec.iz / sec.a)) / 2;
      return analyzeSectionStress3D(forces, sec, mat.fy, query.t, -halfH + fiberRatioY * halfH * 2, -halfB + fiberRatioZ * halfB * 2);
    }
    if (!isRotated2D || !resultsStore.results) return null;
    const forces = resultsStore.getElementForces(query.elementId);
    if (!forces) return null;
    const moment = computeDiagramValueAt('moment', query.t, forces);
    const shear = computeDiagramValueAt('shear', query.t, forces);
    const axial = computeDiagramValueAt('axial', query.t, forces);
    const alpha = (sec.rotation ?? 0) * Math.PI / 180;
    const cos = Math.cos(alpha), sin = Math.sin(alpha);
    const halfH = (sec.h ?? Math.sqrt(12 * (sec.iy ?? sec.iz) / sec.a)) / 2;
    const halfB = (sec.b ?? sec.h ?? Math.sqrt(12 * sec.iz / sec.a)) / 2;
    return analyzeSectionStressFromForces(axial, shear * sin, shear * cos, 0, -moment * cos, moment * sin, sec, mat.fy, -halfH + fiberRatioY * halfH * 2, -halfB + fiberRatioZ * halfB * 2);
  })();

  const uses3DPath = is3D || isRotated2D || eccentricActive;
  const hasAnalysis = uses3DPath ? analysis3D !== null : analysis2D !== null;
  const resolved = uses3DPath ? analysis3D?.resolved : analysis2D?.resolved;
  const shearFlow: ShearFlowSegment[] = analysis2D ? computeShearFlowPaths(analysis2D.V, analysis2D.resolved) : [];
  const isMassive = resolved ? isMassiveSection(resolved.shape) : false;
  const hasBending3D = uses3DPath && analysis3D !== null && (Math.abs(analysis3D.My) > .01 || Math.abs(analysis3D.Mz) > .01);
  const hasBending2D = !uses3DPath && analysis2D !== null && Math.abs(analysis2D.M) > .01;
  const centralCore: CentralCore | null = resolved ? computeCentralCore(resolved) : null;
  const eccentricInsideKern = !eccentricPoint || !centralCore || centralCore.vertices.length < 3 || isPointInConvexPolygon(eccentricPoint[0], eccentricPoint[1], centralCore.vertices);

  const perpNA = !showPerpNA || !uses3DPath || !analysis3D || (Math.abs(analysis3D.My) < .01 && Math.abs(analysis3D.Mz) < .01)
    ? null
    : showTotalSigma ? analysis3D.neutralAxis : computeNeutralAxisMomentsOnly(analysis3D.Mz, analysis3D.My, analysis3D.Iz, analysis3D.resolved.iy);
  const perpNADist: PerpNAPoint[] = perpNA?.exists && analysis3D
    ? computePerpNADistribution(showTotalSigma ? analysis3D.N : 0, analysis3D.Mz, analysis3D.My, analysis3D.resolved.a, analysis3D.Iz, analysis3D.resolved.iy, perpNA, analysis3D.resolved)
    : [];
  const pressureCenter = (() => {
    if (!showPressureCenter) return null;
    if (uses3DPath && analysis3D && Math.abs(analysis3D.N) >= .01) {
      const y = -analysis3D.My / analysis3D.N, z = analysis3D.Mz / analysis3D.N;
      return { y, z, insideCore: centralCore ? isPointInConvexPolygon(z, y, centralCore.vertices) : false };
    }
    if (!is3D && analysis2D && Math.abs(analysis2D.N) >= .01) {
      const y = analysis2D.M / analysis2D.N;
      return { y, z: 0, insideCore: centralCore ? isPointInConvexPolygon(0, y, centralCore.vertices) : false };
    }
    return null;
  })();
  const eccentricState = (() => {
    if (!eccentric || !stateInputs) return null;
    const result = canonicalStressState(stateInputs.sec, eccentric.forces, stateInputs.point, stateInputs.fy, { elastic: stateInputs.elastic });
    return result.ok ? result.state : null;
  })();
  const activeState = showEccentric ? eccentricState ?? canonicalState : canonicalState;
  const activeTorque = eccentricActive ? eccentric?.forces.t ?? 0 : stateInputs?.forces.t ?? 0;
  const torsionFlow = resolved ? computeTorsionFlow(activeTorque, resolved) : null;
  const mohrData = activeState?.mohr ?? (uses3DPath ? analysis3D?.mohr ?? null : analysis2D?.mohr ?? null);
  const mohrSigma = activeState?.sigma ?? (uses3DPath ? analysis3D?.sigmaAtFiber ?? 0 : analysis2D?.sigmaAtY ?? 0);
  const mohrTau = activeState?.tau ?? (uses3DPath ? analysis3D?.tauTotal ?? 0 : analysis2D?.tauAtY ?? 0);
  const queryElementLength = (() => {
    if (!queryElement) return 0;
    const ni = modelStore.getNode(queryElement.nodeI), nj = modelStore.getNode(queryElement.nodeJ);
    return ni && nj ? Math.hypot(nj.x - ni.x, nj.y - ni.y, (nj.z ?? 0) - (ni.z ?? 0)) : 0;
  })();
  const kern = (() => {
    if (!canonical?.ok || !stateInputs || stateInputs.sec.canonical?.kind !== 'geometry-backed') return null;
    const section = stateInputs.sec.canonical;
    const [yMin, zMin, yMax, zMax] = canonical.geometry.bbox;
    return kernLimits(section.a, section.iy, section.iz, section.iyz, { zMax, zMin, yMax, yMin });
  })();
  const shearCheck = (() => {
    if (!shearFlow.length || !canonical?.ok || !stateInputs || stateInputs.sec.canonical?.kind !== 'geometry-backed') return null;
    const peak = Math.max(...shearFlow.flatMap((segment) => segment.points.map((point) => Math.abs(point.tau))), 0);
    return crossCheckShearPeak(stateInputs.sec.canonical.geometry, peak, stateInputs.forces.vy ?? 0, stateInputs.forces.vz ?? 0);
  })();
  const criticalSections = (() => {
    if (!query) return [];
    if (is3D && resultsStore.results3D) {
      const forces = resultsStore.getElementForces3D(query.elementId);
      return forces ? suggestCriticalSections3D(forces).map((section) => ({ t: section.t, reason: section.reason })) : [];
    }
    if (!is3D && resultsStore.results) {
      const forces = resultsStore.getElementForces(query.elementId);
      return forces ? suggestCriticalSections(forces) : [];
    }
    return [];
  })();
  const globalScales = (() => {
    if (!useGlobalScale || !query || !queryElement) return null;
    const sec = modelStore.sections.get(queryElement.sectionId), mat = modelStore.materials.get(queryElement.materialId);
    if (!sec || !mat) return null;
    let maxSigmaY = 1e-6, maxSigmaZ = 1e-6, maxTauY = 1e-6;
    if (is3D) {
      const forces = resultsStore.getElementForces3D(query.elementId);
      if (!forces) return null;
      for (const critical of suggestCriticalSections3D(forces)) {
        const result = analyzeSectionStress3D(forces, sec, mat.fy, critical.t);
        for (const point of result.distributionY) { maxSigmaY = Math.max(maxSigmaY, Math.abs(point.sigma)); maxTauY = Math.max(maxTauY, Math.abs(point.tauVz)); }
        for (const point of result.distributionZ) maxSigmaZ = Math.max(maxSigmaZ, Math.abs(point.sigma));
      }
    } else if (isRotated2D) {
      const forces = resultsStore.getElementForces(query.elementId);
      if (!forces) return null;
      const alpha = (sec.rotation ?? 0) * Math.PI / 180, cos = Math.cos(alpha), sin = Math.sin(alpha);
      for (const critical of suggestCriticalSections(forces)) {
        const moment = computeDiagramValueAt('moment', critical.t, forces), shear = computeDiagramValueAt('shear', critical.t, forces), axial = computeDiagramValueAt('axial', critical.t, forces);
        const result = analyzeSectionStressFromForces(axial, shear * sin, shear * cos, 0, -moment * cos, moment * sin, sec, mat.fy);
        for (const point of result.distributionY) { maxSigmaY = Math.max(maxSigmaY, Math.abs(point.sigma)); maxTauY = Math.max(maxTauY, Math.abs(point.tauVz)); }
        for (const point of result.distributionZ) maxSigmaZ = Math.max(maxSigmaZ, Math.abs(point.sigma));
      }
    } else {
      const forces = resultsStore.getElementForces(query.elementId);
      if (!forces) return null;
      for (const critical of suggestCriticalSections(forces)) {
        const result = analyzeSectionStress(forces, sec, mat.fy, critical.t);
        for (const point of result.distribution) { maxSigmaY = Math.max(maxSigmaY, Math.abs(point.sigma)); maxTauY = Math.max(maxTauY, Math.abs(point.tau)); }
        if (!isMassiveSection(result.resolved.shape)) for (const segment of computeShearFlowPaths(result.V, result.resolved)) for (const point of segment.points) maxTauY = Math.max(maxTauY, point.tau);
      }
    }
    return { maxSigmaY, maxSigmaZ, maxTauY };
  })();
  return {
    is3D, query, querySec, isRotated2D, isAmorphous, unavailableReason, deviation,
    canonicalGeometry, canonicalState, stateInputs, shearCentreClean,
    eccentricComponents, eccentricHasParallel, eccentricNothingToMove, eccentricNoAxial,
    eccentric, eccentricActive, eccentricInsideKern,
    analysis2D, analysis3D, uses3DPath, hasAnalysis, resolved, shearFlow, isMassive,
    hasBending3D, hasBending2D, centralCore, perpNA, perpNADist, pressureCenter,
    activeState, activeTorque, torsionFlow, mohrData, mohrSigma, mohrTau,
    queryElementLength, kern, shearCheck, criticalSections, globalScales,
  };
}
