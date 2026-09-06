import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('G4 Basic editor React ownership', () => {
  it('owns the Basic header identity and actions in React', () => {
    const app = read('src/react/App.tsx');
    const shell = read('src/react/editor/BasicEditorApp.tsx');
    const header = read('src/react/components/BasicHeader.tsx');
    expect(shell).toContain('<BasicHeaderIdentity />');
    expect(shell).toContain('<BasicHeaderActions />');
    for (const behavior of [
      'stabileo-navigate', 'OFFERED_LOCALES.map', 'data-testid="basic-mode-label"',
      'tabManager.updateDefaultNames()', "openBasicPanel('settings')", '<Icon name="settings"',
    ]) expect(header).toContain(behavior);
    expect(header).not.toContain('switchEditorMode');
    expect(app).not.toContain('react-basic-header-identity-slot');
    expect(app).not.toContain('react-basic-header-actions-slot');
    expect(app).not.toContain('class:on={basicPanel');
  });

  it('owns Basic panel state and its legacy event bridge outside the Svelte shell', () => {
    const app = read('src/react/App.tsx');
    const shell = read('src/react/editor/BasicEditorApp.tsx');
    const controller = read('src/react/components/BasicPanelController.tsx');
    const store = read('src/lib/store/basic-panel.ts');
    const ribbon = read('src/react/components/BasicRibbon.tsx');
    const panel = read('src/react/components/BasicPanel.tsx');
    expect(shell).toContain('<BasicPanelController />');
    expect(app).not.toContain('let basicPanel = $state');
    expect(app).not.toContain('let basicDataTab = $state');
    expect(app).not.toContain('publishBasicPanelState');
    expect(controller).toContain("window.addEventListener('stabileo-open-basic-panel'");
    expect(controller).toContain("openBasicPanel('data', { toggle: false })");
    expect(store).toContain('syncModelTabWithResults(state.activePanel, state.activeDataTab)');
    expect(store).toMatch(/closeBasicPanel[\s\S]{0,400}selectMode = 'elements'/);
    expect(ribbon).toContain('basicPanelStore.subscribe');
    expect(panel).toContain('basicPanelStore.subscribe');
  });

  it('composes the full Basic command strip and workspace natively in React', () => {
    const app = read('src/react/App.tsx');
    const shell = read('src/react/editor/BasicEditorApp.tsx');
    const workspace = read('src/react/components/BasicWorkspace.tsx');
    for (const slot of ['react-basic-ribbon-slot', 'react-tool-options-slot']) {
      expect(app).not.toContain(slot);
    }
    expect(app).not.toContain('react-basic-workspace-slot');
    expect(existsSync(join(root, 'src/react/components/EditorChromePortals.tsx'))).toBe(false);
    expect(shell).toContain('<BasicRibbon />');
    expect(shell).toContain('<ToolOptionsBarCore />');
    expect(shell).toContain('<BasicWorkspace />');
    for (const owner of ['Viewport2D', 'Viewport3D', 'BasicPanel', 'BasicMobileShell', 'MobileResultsPanel']) {
      expect(workspace).toContain(`<${owner}`);
    }
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
      'src/components/stress/CrossSectionDrawing.svelte',
      'src/components/stress/CrossSectionDrawingReactBridge.svelte',
      'src/components/SectionChanger.svelte',
      'src/components/SectionChangerEventHost.svelte',
      'src/components/TourOverlay.svelte',
      'src/components/AiDrawer.svelte',
      'src/components/toolbar/ToolbarAiReview.svelte',
      'src/components/SectionShapeBuilder.svelte',
      'src/components/FeedbackWidget.svelte',
      'src/components/CadImportWizard.svelte',
      'src/components/IfcImportDialog.svelte',
      'src/react/LegacySvelteSurface.tsx',
    ];
    for (const file of removed) expect(existsSync(join(root, file)), file).toBe(false);
  });

  it('keeps property mutations observable to React and both 2D/3D result branches present', () => {
    const store = read('src/lib/store/model.ts');
    const node = read('src/react/components/NodeDetails.tsx');
    const element = read('src/react/components/ElementDetails.tsx');
    for (const method of ['updateElementLocalY', 'setElementOffset', 'setElementsOffset', 'updateSupport', 'updateLoad', 'toggleHinge']) expect(store).toContain(`'${method}'`);
    for (const helper of ['getDisplacement3D', 'getReaction3D', 'getDisplacement', 'getReaction']) expect(node).toContain(helper);
    for (const helper of ['getElementForces3D', 'getElementForces', 'computeElementStress']) expect(element).toContain(helper);
  });

  it('owns every Basic advanced report root in React', () => {
    const panel = read('src/react/components/BasicPanel.tsx');
    const app = read('src/react/App.tsx');
    const workspace = read('src/react/components/BasicWorkspace.tsx');
    expect(panel).not.toContain('LegacySvelteSurface');
    expect(panel).toContain('<KinematicPanel docked />');
    expect(panel).not.toContain('component={KinematicPanel}');
    expect(workspace).toContain('<KinematicPanel />');
    expect(app).not.toContain("KinematicPanel.svelte");
    expect(panel).toContain('<WhatIfPanel docked />');
    expect(panel).not.toContain('component={WhatIfPanel}');
    expect(workspace).toContain('<WhatIfPanel />');
    expect(app).not.toContain("WhatIfPanel.svelte");
    expect(panel).toContain('<DSMStepWizard />');
    expect(panel).not.toContain('component={StepWizard}');
    const mobileShell = read('src/react/components/BasicMobileShell.tsx');
    expect(app).not.toContain('react-dsm-sidebar-wizard-slot');
    expect(panel).toContain('<DSMStepWizard />');
    expect(mobileShell).toContain('<DSMStepWizard />');
    expect(app).not.toContain("dsm/StepWizard.svelte");
    expect(panel).toContain('<SectionStressPanel docked />');
    expect(panel).not.toContain("SectionStressPanel.svelte");
    expect(workspace).toContain('<SectionStressPanel />');
    expect(app).not.toContain("SectionStressPanel.svelte");
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

  it('owns the interactive cross-section SVG directly in React', () => {
    const rootPanel = read('src/react/components/SectionStressPanel.tsx');
    const drawing = read('src/react/components/stress/CrossSectionDrawing.tsx');
    expect(rootPanel).toContain('<CrossSectionDrawing');
    expect(rootPanel).not.toContain('SvelteSurface');
    for (const behavior of ['stressMapRamp', 'NeutralAxis3D', 'PerpendicularDistribution', 'ThinWallShear', 'MassiveShear', 'TorsionDiagram', 'EccentricLayer', 'setPointerCapture', "event.key === 'Escape'", 'ResizeObserver']) expect(drawing).toContain(behavior);
    for (const callback of ['onShowSigmaChange', 'onShowShearOnDrawingChange', 'onFiberRatioYChange', 'onEccentricPointChange', 'onEccentricPointVChange']) expect(rootPanel).toContain(callback);
  });

  it('owns the section catalogue, custom builder and event host directly in React', () => {
    const app = read('src/react/App.tsx');
    const shell = read('src/react/editor/BasicEditorApp.tsx');
    const changer = read('src/react/components/SectionChanger.tsx');
    expect(app).not.toContain('SectionChangerEventHost.svelte');
    expect(shell).toContain('<SectionChangerEventHost />');
    for (const behavior of [
      'stabileo-open-section-changer', 'profileToSection', 'familiesForCode',
      'computeSectionProperties', 'generateSectionName', 'onProfileSelect',
      'onShapeSelect', 'onAmorphousSelect', "event.key === 'Escape'",
    ]) expect(changer).toContain(behavior);
  });

  it('owns the guided Basic walkthrough overlay and its polling lifecycle in React', () => {
    const app = read('src/react/App.tsx');
    const shell = read('src/react/editor/BasicEditorApp.tsx');
    const overlay = read('src/react/components/TourOverlay.tsx');
    const store = read('src/lib/store/tour.ts');
    expect(app).not.toContain('TourOverlay.svelte');
    expect(shell).toContain('<TourOverlay />');
    for (const behavior of [
      'tourStore.updateTargetRect()', 'requestAnimationFrame(tick)', 'setInterval(poll, 300)',
      'autoAdvanceArmed.current', 'tourStore.armedForTest', "event.key === 'Escape'",
      "event.key === 'ArrowRight'", 'step.actionButton', 'step.multiAction',
      'dangerouslySetInnerHTML', 'tour-active',
    ]) expect(overlay).toContain(behavior);
    expect(store).toContain('makeReactObservable(createTourStore()');
  });

  it('owns global toasts and the live-calculation recovery banner in React', () => {
    const app = read('src/react/App.tsx');
    const shell = read('src/react/editor/BasicEditorApp.tsx');
    const notifications = read('src/react/components/GlobalNotifications.tsx');
    expect(app).not.toContain('{#if uiStore.toasts.length');
    expect(app).not.toContain('{#if uiStore.liveCalcError');
    expect(shell).toContain('<GlobalNotifications />');
    for (const behavior of [
      'uiStore.toasts.map', "toast.actionId === 'kinematic'", 'uiStore.dismissToast',
      'uiStore.showKinematicPanel = true', 'uiStore.liveCalc = false',
      'uiStore.liveCalcError = null', 'historyStore.undo()', 'role="alert"',
    ]) expect(notifications).toContain(behavior);
  });

  it('owns the Basic coordinate-import event and modal in React', () => {
    const app = read('src/react/App.tsx');
    const shell = read('src/react/editor/BasicEditorApp.tsx');
    const dialog = read('src/react/components/ImportCoordinatesDialog.tsx');
    expect(app).not.toContain('showImportDialog');
    expect(shell).toContain('<ImportCoordinatesDialog />');
    for (const behavior of [
      'stabileo-import-coords', "split(/[,;\\t\\s]+/)", 'modelStore.addNode',
      'resultsStore.clear()', "uiStore.toast(t('app.nodesImported')", "event.key === 'Escape'",
    ]) expect(dialog).toContain(behavior);
  });

  it('owns the Basic mobile drawers and bottom navigation in one React shell', () => {
    const app = read('src/react/App.tsx');
    const workspace = read('src/react/components/BasicWorkspace.tsx');
    const shell = read('src/react/components/BasicMobileShell.tsx');
    expect(app).not.toContain('react-basic-mobile-shell-slot');
    expect(workspace).toContain('<BasicMobileShell />');
    for (const legacySlot of ['react-mobile-drawer-toolbar-slot', 'react-property-panel-slot', 'react-drawer-data-table-slot', 'react-dsm-drawer-wizard-slot']) expect(app).not.toContain(legacySlot);
    for (const owner of ['<MobileToolbar />', '<PropertyPanel />', '<DataTable />', '<DSMStepWizard />']) expect(shell).toContain(owner);
    for (const behavior of ['uiStore.leftDrawerOpen', 'uiStore.rightDrawerOpen', 'uiStore.showDataTable', "uiStore.appMode !== 'basico'"]) {
      expect(app + shell).toContain(behavior);
    }
  });

  it('owns IFC file selection, parsing, mapping preview and model import in React', () => {
    const app = read('src/react/App.tsx');
    const shell = read('src/react/editor/BasicEditorApp.tsx');
    const dialog = read('src/react/components/IfcImportDialog.tsx');
    expect(app).not.toContain('IfcImportDialog.svelte');
    expect(shell).toContain('<IfcImportEventHost />');
    for (const behavior of [
      'stabileo-import-ifc', "accept=\".ifc\"", "import('../../lib/ifc/ifc-parser')",
      'mapIfcToModel', 'snapTolerance', 'historyStore.pushState()', 'modelStore.clear()',
      'modelStore.addNode', 'modelStore.addMaterial', 'modelStore.addSection',
      'modelStore.addElement', "uiStore.analysisMode = '3d'", "event.key === 'Escape'",
    ]) expect(dialog).toContain(behavior);
  });

  it('owns the Basic AI build and review drawer directly in React', () => {
    const app = read('src/react/App.tsx');
    const workspace = read('src/react/components/BasicWorkspace.tsx');
    const drawer = read('src/react/components/AiDrawer.tsx');
    expect(app).not.toContain('AiDrawer.svelte');
    expect(workspace).toContain('<AiDrawer />');
    for (const behavior of [
      'reviewModel(', 'buildModel(', 'validateSnapshot', 'normalizeSnapshotReleases',
      'historyStore.pushState()', 'historyStore.undo()', 'runGlobalSolve()',
      'lastSolverDiagnostics', 'AbortController', 'uiStore.setSelection',
    ]) expect(drawer).toContain(behavior);
  });

  it('owns the 2D DXF file route and 3D CAD-to-RC wizard directly in React', () => {
    const app = read('src/react/App.tsx');
    const shell = read('src/react/editor/BasicEditorApp.tsx');
    const wizard = read('src/react/components/CadImportWizard.tsx');
    expect(app).not.toContain('CadImportWizard.svelte');
    expect(app).not.toContain('dxfFileInput');
    expect(shell).toContain('<CadImportEventHost />');
    for (const behavior of [
      'stabileo-import-dxf', 'stabileo-dxf-drop', 'stabileo-open-dxf-dialog',
      'parseCadDxf', 'suggestLayerMappings', 'extractArchPlan',
      'drawCadPreview', 'drawSemanticPreview', 'drawDraftPreview',
      'zoomAround', 'panView', 'cropDoc', 'densestPlanWindow',
      'validateFloorRanges', 'diagnoseDraft', 'buildDraft',
      'historyStore.pushState()', 'modelStore.restore(draft.snapshot)',
    ]) expect(wizard).toContain(behavior);
  });
});
