import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('G4 Basic editor React ownership', () => {
  it('routes the Basic ribbon, mobile toolbar, right panel, data and property panels through React portals', () => {
    const app = read('src/App.svelte');
    const portals = read('src/react/components/EditorChromePortals.tsx');
    for (const slot of ['react-basic-ribbon-slot', 'react-basic-panel-slot', 'react-mobile-sidebar-toolbar-slot', 'react-mobile-drawer-toolbar-slot', 'react-property-panel-slot']) {
      expect(app).toContain(slot);
      expect(portals).toContain(slot);
    }
    for (const owner of ['BasicRibbon', 'BasicPanel', 'MobileToolbar', 'DataTable', 'PropertyPanel']) expect(portals).toContain(`<${owner}`);
  });

  it('has removed every legacy Svelte component that belonged to the G4 surface', () => {
    const removed = [
      'src/components/Toolbar.svelte', 'src/components/PropertyPanel.svelte', 'src/components/ribbon/BasicPanel.svelte',
      'src/components/tables/NodesTable.svelte', 'src/components/tables/ElementsTable.svelte', 'src/components/tables/SupportsTable.svelte',
      'src/components/tables/LoadsTable.svelte', 'src/components/tables/MaterialsTable.svelte', 'src/components/tables/SectionsTable.svelte', 'src/components/tables/ResultsTable.svelte',
      'src/components/property/NodeDetails.svelte', 'src/components/property/ElementDetails.svelte', 'src/components/property/SupportDetails.svelte', 'src/components/property/MemberOffsetEditor.svelte',
      'src/components/toolbar/ToolbarProject.svelte', 'src/components/toolbar/ToolbarConfig.svelte', 'src/components/toolbar/ToolbarResults.svelte', 'src/components/toolbar/ToolbarAdvanced.svelte',
      'src/components/KinematicPanel.svelte',
      'src/components/WhatIfPanel.svelte',
      'src/components/dsm/StepWizard.svelte',
      'src/components/dsm/Step7Solution.svelte',
      'src/components/dsm/Step8Reactions.svelte',
      'src/components/dsm/Step4Assembly.svelte',
      'src/components/dsm/Step5LoadVector.svelte',
      'src/components/dsm/Step6Partitioning.svelte',
      'src/components/dsm/Step1DOFNumbering.svelte',
      'src/components/dsm/Step2LocalMatrices.svelte',
      'src/components/dsm/Step3Transformation.svelte',
      'src/components/dsm/Step9InternalForces.svelte',
      'src/components/dsm/MatrixDisplay.svelte',
      'src/components/dsm/MatrixExplorer.svelte',
      'src/components/dsm/MathEquation.svelte',
      'src/components/dsm/VectorDisplay.svelte',
      'src/components/SectionStressPanel.svelte',
      'src/components/stress/CentralCoreDetails.svelte',
      'src/components/stress/GeometricPropertyWorking.svelte',
      'src/components/stress/MohrCircleDisplay.svelte',
      'src/components/stress/StressStateDetails.svelte',
      'src/components/stress/StressTensorDetails.svelte',
      'src/components/stress/TorsionDetails.svelte',
    ];
    for (const file of removed) expect(existsSync(join(root, file)), file).toBe(false);
  });

  it('keeps property mutations observable to React and both 2D/3D result branches present', () => {
    const store = read('src/lib/store/model.svelte.ts');
    const node = read('src/react/components/NodeDetails.tsx');
    const element = read('src/react/components/ElementDetails.tsx');
    for (const method of ['updateElementLocalY', 'setElementOffset', 'setElementsOffset', 'updateSupport', 'updateLoad', 'toggleHinge']) expect(store).toContain(`'${method}'`);
    for (const helper of ['getDisplacement3D', 'getReaction3D', 'getDisplacement', 'getReaction']) expect(node).toContain(helper);
    for (const helper of ['getElementForces3D', 'getElementForces', 'computeElementStress']) expect(element).toContain(helper);
  });

  it('owns every Basic advanced report root in React', () => {
    const panel = read('src/react/components/BasicPanel.tsx');
    const app = read('src/App.svelte');
    const portals = read('src/react/components/EditorChromePortals.tsx');
    expect(panel).not.toContain('LegacySvelteSurface');
    expect(panel).toContain('<KinematicPanel docked />');
    expect(panel).not.toContain('component={KinematicPanel}');
    expect(app).toContain('react-kinematic-panel-slot');
    expect(app).not.toContain("KinematicPanel.svelte");
    expect(portals).toContain('createPortal(<KinematicPanel />');
    expect(panel).toContain('<WhatIfPanel docked />');
    expect(panel).not.toContain('component={WhatIfPanel}');
    expect(app).toContain('react-what-if-panel-slot');
    expect(app).not.toContain("WhatIfPanel.svelte");
    expect(portals).toContain('createPortal(<WhatIfPanel />');
    expect(panel).toContain('<DSMStepWizard />');
    expect(panel).not.toContain('component={StepWizard}');
    for (const slot of ['react-dsm-sidebar-wizard-slot', 'react-dsm-drawer-wizard-slot']) {
      expect(app).toContain(slot);
      expect(portals).toContain(slot);
    }
    expect(app).not.toContain("dsm/StepWizard.svelte");
    expect(portals).toContain('createPortal(<DSMStepWizard />');
    expect(panel).toContain('<SectionStressPanel docked />');
    expect(panel).not.toContain("SectionStressPanel.svelte");
    expect(app).toContain('react-section-stress-panel-slot');
    expect(app).not.toContain("SectionStressPanel.svelte");
    expect(portals).toContain('createPortal(<SectionStressPanel />');
    for (const migrated of ['ToolbarProject', 'ToolbarConfig', 'ToolbarResults', 'ToolbarAdvanced', 'DataTable', 'SelectionPanel']) expect(panel).toContain(`<${migrated}`);
  });

  it('keeps the React kinematic report behavior and visual contract intact', () => {
    const panel = read('src/react/components/KinematicPanel.tsx');
    const styles = read('src/react/components/KinematicPanel.css');
    for (const behavior of ['generateKinematicReport', 'buildSolverInput(false)', 'releaseI?.slide', 'releaseJ?.slide', "event.key === 'Escape'", 'rankRetries.current < 40', '250']) expect(panel).toContain(behavior);
    for (const visual of ['kp-panel', 'kp-header', 'kp-quick-btn', 'kp-section-toggle', 'kp-elem-card', 'kp-footer']) {
      expect(panel).toContain(visual);
      expect(styles).toContain(`.${visual}`);
    }
  });

  it('keeps the React What-if trial, restore and solver behavior intact', () => {
    const panel = read('src/react/components/WhatIfPanel.tsx');
    const styles = read('src/react/components/WhatIfPanel.css');
    for (const behavior of ['modelStore.snapshot()', 'modelStore.restore', 'loadFactorsRef', 'get2DDisplayNodalLoadVertical', 'solve3D', 'setResults3D', 'setResults(solve(input))', '60']) expect(panel).toContain(behavior);
    for (const visual of ['wif-panel', 'wif-header', 'wif-reset', 'wif-slider-row', 'wif-range', 'wif-current']) {
      expect(panel).toContain(visual);
      expect(styles).toContain(`.${visual}`);
    }
  });

  it('owns DSM navigation in React while isolating the remaining step bodies', () => {
    const wizard = read('src/react/components/DSMStepWizard.tsx');
    const styles = read('src/react/components/DSMStepWizard.css');
    for (const behavior of ['nextStep()', 'prevStep()', 'goToStep(step)', "event.key === 'Escape'", 'stabileo-zoom-to-fit', 'showExplorer']) expect(wizard).toContain(behavior);
    expect(wizard).toContain('<MatrixExplorer data={data} editable={dsmStepsStore.quizMode} />');
    expect(wizard).not.toContain('LegacySvelteSurface');
    expect(wizard).toContain('<Step1DOFNumbering data={data} />');
    expect(wizard).toContain('<Step2LocalMatrices data={data} editable={editable} />');
    expect(wizard).toContain('<Step3Transformation data={data} editable={editable} />');
    expect(wizard).toContain('<Step4Assembly data={data} editable={editable} />');
    expect(wizard).toContain('<Step5LoadVector data={data} />');
    expect(wizard).toContain('<Step6Partitioning data={data} editable={editable} />');
    expect(wizard).toContain('<Step7Solution data={data} />');
    expect(wizard).toContain('<Step8Reactions data={data} />');
    expect(wizard).toContain('<Step9InternalForces data={data} />');
    expect(wizard).not.toContain('component={Step7Solution}');
    expect(wizard).not.toContain('component={Step8Reactions}');
    expect(styles).toContain('.react-dsm-wizard .step-dot.active');
    expect(styles).toContain('.react-dsm-wizard .mode-3d');
  });

  it('renders DSM assembly through reaction steps natively in React', () => {
    const step1 = read('src/react/components/dsm/Step1DOFNumbering.tsx');
    const step2 = read('src/react/components/dsm/Step2LocalMatrices.tsx');
    const step3 = read('src/react/components/dsm/Step3Transformation.tsx');
    const step4 = read('src/react/components/dsm/Step4Assembly.tsx');
    const step5 = read('src/react/components/dsm/Step5LoadVector.tsx');
    const step6 = read('src/react/components/dsm/Step6Partitioning.tsx');
    const step7 = read('src/react/components/dsm/Step7Solution.tsx');
    const step8 = read('src/react/components/dsm/Step8Reactions.tsx');
    const vector = read('src/react/components/dsm/VectorDisplay.tsx');
    const step9 = read('src/react/components/dsm/Step9InternalForces.tsx');
    const matrix = read('src/react/components/dsm/MatrixDisplay.tsx');
    const explorer = read('src/react/components/dsm/MatrixExplorer.tsx');
    expect(step1).toContain('data.dofNumbering');
    expect(step1).toContain('dofs.map');
    expect(step2).toContain('element.kLocal');
    expect(step3).toContain('element.kGlobal');
    expect(step4).toContain('data.K');
    expect(step4).toContain('selectedElemForStep');
    expect(step5).toContain('data.loadContributions');
    expect(step6).toContain('data.Kff');
    expect(step6).toContain('data.FfMod');
    expect(step7).toContain('data.uFree');
    expect(step7).toContain('data.uAll');
    expect(step8).toContain('data.reactionsRaw');
    expect(step8).toContain('data.restrDofLabels');
    expect(step9).toContain('data.elementForces');
    expect(step9).toContain('fLocalFinal');
    expect(vector).toContain('<tbody>');
    expect(vector).toContain('toExponential');
    expect(matrix).toContain('checkAnswer');
    expect(matrix).toContain('highlightRows');
    expect(explorer).toContain("useState<MatrixTab>('kLocal')");
    expect(explorer).toContain('showGlobalK');
  });

  it('preserves the section-stress detail contracts under their React root', () => {
    const rootPanel = read('src/react/components/SectionStressPanel.tsx');
    const panelModel = read('src/react/components/stress/sectionStressPanelModel.ts');
    const mohr = read('src/react/components/stress/MohrCircleDisplay.tsx');
    const core = read('src/react/components/stress/CentralCoreDetails.tsx');
    const state = read('src/react/components/stress/StressStateDetails.tsx');
    const tensors = read('src/react/components/stress/StressTensorDetails.tsx');
    const geometry = read('src/react/components/stress/GeometricPropertyWorking.tsx');
    const torsion = read('src/react/components/stress/TorsionDetails.tsx');
    for (const token of ['mohrData.center', 'mohrData.radius', 'mohrData.sigma1', 'mohrData.sigma2', 'mohrSigma', 'mohrTau']) expect(mohr).toContain(token);
    for (const token of ['centralCore.eyMax', 'centralCore.ezMax', 'kern.z', 'kern.y', 'stress.ccRectNote', 'stress.ccIHNote', 'stress.ccCHSNote']) expect(core).toContain(token);
    for (const token of ['sigmaAtFiber', 'tauVyAtFiber', 'tauVzAtFiber', 'tauTorsion', 'vonMises', 'ratioTresca', 'ratioRankine', 'neutralAxis']) expect(state).toContain(token);
    for (const token of ['tensorRows(tensors.stress)', 'tensorRows(tensors.strain)', 'tensors.invariants.j2', 'volumetricStrain', 'principalStress']) expect(tensors).toContain(token);
    for (const token of ['centroidWorking(resolved)', 'shearCentreWorking(resolved)', 'work.parts.map', 'work.totalArea', 'engineShearCentre']) expect(geometry).toContain(token);
    for (const token of ['computeTorsionFlow', 'closedVersusOpen', 'compareTorsionTheories', 'warpingProperties', 'warpingResponse', 'saintVenantShare']) expect(torsion).toContain(token);
    for (const owner of ['StressStateDetails', 'TorsionDetails', 'StressTensorDetails', 'MohrCircleDisplay', 'GeometricPropertyWorking', 'CentralCoreDetails']) expect(rootPanel).toContain(`<${owner}`);
    for (const behavior of ['canonicalPanelResult', 'canonicalStressState', 'resolveEccentric', 'crossCheckShearPeak', 'suggestCriticalSections3D']) expect(panelModel).toContain(behavior);
  });

  it('isolates the sole remaining Basic Svelte UI leaf to the cross-section SVG', () => {
    const rootPanel = read('src/react/components/SectionStressPanel.tsx');
    const adapter = read('src/components/stress/CrossSectionDrawingReactBridge.svelte');
    expect(rootPanel).toContain('UpdatingSvelteSurface');
    expect(rootPanel).toContain('CrossSectionDrawingReactBridge.svelte');
    expect(adapter).toContain("CrossSectionDrawing.svelte");
    expect(adapter).toContain('export function updateProps');
    expect(adapter).toContain('bind:eccentricPoint');
  });
});
