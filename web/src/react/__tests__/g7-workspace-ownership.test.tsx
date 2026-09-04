import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('G7 workspace React ownership', () => {
  it('moves PRO project open/save controls to React without changing contracts', () => {
    const panel = read('src/components/pro/ProPanel.svelte');
    const portals = read('src/react/components/EditorChromePortals.tsx');
    const actions = read('src/react/components/ProProjectFileActions.tsx');
    expect(panel).toContain('react-pro-project-file-actions-slot');
    expect(panel).not.toContain('<ProProjectFileActions');
    expect(portals).toContain('<ProProjectFileActions variant="mobile" />');
    for (const contract of [
      'pro-project-open', 'pro-project-save', 'project-open-file', '.ded,.json',
      "result.type === 'session'", "key === 'S'", "key === 'O'",
    ]) expect(actions).toContain(contract);
    expect(existsSync(join(process.cwd(), 'src/components/pro/ProProjectFileActions.svelte'))).toBe(false);
  });

  it('moves the complete PRO nodes table to React', () => {
    const panel = read('src/components/pro/ProPanel.svelte');
    const portals = read('src/react/components/EditorChromePortals.tsx');
    const nodes = read('src/react/components/ProNodesTab.tsx');
    expect(panel).toContain('react-pro-nodes-tab-slot');
    expect(panel).not.toContain('<ProNodesTab');
    expect(portals).toContain('createPortal(<ProNodesTab />');
    for (const contract of [
      'modelStore.addNode', 'modelStore.updateNode', 'modelStore.removeNode',
      'uiStore.setSelection', 'onPaste={handlePaste}', "event.key !== 'Enter'",
      'TWO_D_VERTICAL_AXIS_LABEL', 'pro-nodes-table',
    ]) expect(nodes).toContain(contract);
    expect(existsSync(join(process.cwd(), 'src/components/pro/ProNodesTab.svelte'))).toBe(false);
  });

  it('moves the complete PRO elements editor to React', () => {
    const panel = read('src/components/pro/ProPanel.svelte');
    const portals = read('src/react/components/EditorChromePortals.tsx');
    const elements = read('src/react/components/ProElementsTab.tsx');
    expect(panel).toContain('react-pro-elements-tab-slot');
    expect(panel).not.toContain('<ProElementsTab');
    expect(portals).toContain('createPortal(<ProElementsTab />');
    for (const contract of [
      'modelStore.addElement', 'modelStore.updateElement', 'modelStore.removeElement',
      'modelStore.updateElementMaterial', 'modelStore.updateElementSection',
      'modelStore.toggleHinge', 'arcPolyline', 'uiStore.setSelection',
      'onPaste={handlePaste}', 'react-pro-member-offset-slot',
    ]) expect(elements).toContain(contract);
    expect(existsSync(join(process.cwd(), 'src/components/pro/ProElementsTab.svelte'))).toBe(false);
  });

  it('moves the complete PRO supports editor to React', () => {
    const panel = read('src/components/pro/ProPanel.svelte');
    const portals = read('src/react/components/EditorChromePortals.tsx');
    const supports = read('src/react/components/ProSupportsTab.tsx');
    expect(panel).toContain('react-pro-supports-tab-slot');
    expect(panel).not.toContain('<ProSupportsTab');
    expect(portals).toContain('createPortal(<ProSupportsTab />');
    for (const contract of [
      'modelStore.addSupport', 'modelStore.updateSupport', 'modelStore.removeSupport',
      "newType === 'custom3d'", "newType === 'spring3d'", 'uiStore.selectSupport',
      'dofRestraints', 'krx', 'kry', 'krz',
    ]) expect(supports).toContain(contract);
    expect(existsSync(join(process.cwd(), 'src/components/pro/ProSupportsTab.svelte'))).toBe(false);
  });

  it('moves the complete PRO materials editor to React', () => {
    const panel = read('src/components/pro/ProPanel.svelte');
    const portals = read('src/react/components/EditorChromePortals.tsx');
    const materials = read('src/react/components/ProMaterialsTab.tsx');
    expect(panel).toContain('react-pro-materials-tab-slot');
    expect(panel).not.toContain('<ProMaterialsTab');
    expect(portals).toContain('createPortal(<ProMaterialsTab />');
    for (const contract of [
      'searchPresets', 'modelStore.addMaterial', 'modelStore.updateMaterial', 'modelStore.removeMaterial',
      "regulationsStore.noteChange('detailingSpec')", 'DAGG_MIN_MM', 'DAGG_MAX_MM',
      'mat-aggregate-error', 'margin-error',
    ]) expect(materials).toContain(contract);
    expect(existsSync(join(process.cwd(), 'src/components/pro/ProMaterialsTab.svelte'))).toBe(false);
  });

  it('moves the profile catalogue and section builder to React', () => {
    const panel = read('src/components/pro/ProPanel.svelte');
    const portals = read('src/react/components/EditorChromePortals.tsx');
    const sections = read('src/react/components/ProSectionsTab.tsx');
    expect(panel).toContain('react-pro-sections-tab-slot');
    expect(panel).not.toContain('<ProSectionsTab');
    expect(portals).toContain('createPortal(<ProSectionsTab />');
    for (const contract of [
      'searchProfiles', 'profileOutline', 'crossSectionPath', 'computeSectionProperties',
      'generateSectionName', 'modelStore.addSection', 'modelStore.removeSection',
      "uiStore.toast(t('table.cannotDeleteSection'), 'error')",
    ]) expect(sections).toContain(contract);
    expect(existsSync(join(process.cwd(), 'src/components/pro/ProSectionsTab.svelte'))).toBe(false);
  });
});
