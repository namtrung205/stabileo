<script lang="ts">
  import CrossSectionDrawing from './CrossSectionDrawing.svelte';

  type DrawingProps = Parameters<typeof CrossSectionDrawing>[0] extends infer P ? P : Record<string, unknown>;
  type Change = {
    showCrossSection: boolean; showSigma: boolean; showShearOnDrawing: boolean;
    showTotalSigma: boolean; showPerpNA: boolean; showCentralCore: boolean;
    showPressureCenter: boolean; useGlobalScale: boolean; fiberRatioY: number;
    fiberRatioZ: number; showStressMap: boolean; showEccentric: boolean;
    eccentricPoint: [number, number] | null; eccentricPointV: [number, number] | null;
    showTorsionFlow: boolean;
  };
  let { initial, onChange }: { initial: DrawingProps; onChange: (change: Change) => void } = $props();
  const seed = () => initial;
  let current = $state(seed());
  let showCrossSection = $state(seed().showCrossSection);
  let showSigma = $state(seed().showSigma);
  let showShearOnDrawing = $state(seed().showShearOnDrawing);
  let showTotalSigma = $state(seed().showTotalSigma);
  let showPerpNA = $state(seed().showPerpNA);
  let showCentralCore = $state(seed().showCentralCore);
  let showPressureCenter = $state(seed().showPressureCenter);
  let useGlobalScale = $state(seed().useGlobalScale);
  let fiberRatioY = $state(seed().fiberRatioY);
  let fiberRatioZ = $state(seed().fiberRatioZ);
  let showStressMap = $state(seed().showStressMap);
  let showEccentric = $state(seed().showEccentric);
  let eccentricPoint = $state(seed().eccentricPoint);
  let eccentricPointV = $state(seed().eccentricPointV);
  let showTorsionFlow = $state(seed().showTorsionFlow);

  export function updateProps(next: DrawingProps) {
    current = next;
    showCrossSection = next.showCrossSection; showSigma = next.showSigma;
    showShearOnDrawing = next.showShearOnDrawing; showTotalSigma = next.showTotalSigma;
    showPerpNA = next.showPerpNA; showCentralCore = next.showCentralCore;
    showPressureCenter = next.showPressureCenter; useGlobalScale = next.useGlobalScale;
    fiberRatioY = next.fiberRatioY; fiberRatioZ = next.fiberRatioZ;
    showStressMap = next.showStressMap; showEccentric = next.showEccentric;
    eccentricPoint = next.eccentricPoint; eccentricPointV = next.eccentricPointV;
    showTorsionFlow = next.showTorsionFlow;
  }

  $effect(() => onChange({ showCrossSection, showSigma, showShearOnDrawing, showTotalSigma,
    showPerpNA, showCentralCore, showPressureCenter, useGlobalScale, fiberRatioY,
    fiberRatioZ, showStressMap, showEccentric, eccentricPoint, eccentricPointV,
    showTorsionFlow }));
</script>

<CrossSectionDrawing
  canonicalGeometry={current.canonicalGeometry}
  bind:showCrossSection bind:showSigma bind:showShearOnDrawing bind:showTotalSigma
  bind:showPerpNA bind:showCentralCore bind:showPressureCenter bind:useGlobalScale
  bind:fiberRatioY bind:fiberRatioZ
  is3D={current.is3D} hasBending3D={current.hasBending3D} hasBending2D={current.hasBending2D}
  analysis2D={current.analysis2D} analysis3D={current.analysis3D} resolved={current.resolved}
  shearFlow={current.shearFlow} isMassive={current.isMassive} centralCore={current.centralCore}
  perpNADist={current.perpNADist} perpNA={current.perpNA} pressureCenter={current.pressureCenter}
  globalScales={current.globalScales} sectionRotation={current.sectionRotation}
  bind:showStressMap stressField={current.stressField} bind:showEccentric bind:eccentricPoint
  bind:eccentricPointV hasParallelLoad={current.hasParallelLoad}
  hasPerpendicularLoad={current.hasPerpendicularLoad} shearCentre={current.shearCentre}
  eccentricInsideKern={current.eccentricInsideKern} torsionFlow={current.torsionFlow}
  bind:showTorsionFlow
/>
