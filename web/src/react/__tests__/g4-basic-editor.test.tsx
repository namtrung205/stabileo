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

  it('limits the Svelte leaf bridge to advanced reports outside G4', () => {
    const panel = read('src/react/components/BasicPanel.tsx');
    expect(panel).toContain('LegacySvelteSurface');
    for (const leaf of ['KinematicPanel', 'WhatIfPanel', 'SectionStressPanel', 'StepWizard']) expect(panel).toContain(`component={${leaf}}`);
    for (const migrated of ['ToolbarProject', 'ToolbarConfig', 'ToolbarResults', 'ToolbarAdvanced', 'DataTable', 'SelectionPanel']) expect(panel).toContain(`<${migrated}`);
  });
});
