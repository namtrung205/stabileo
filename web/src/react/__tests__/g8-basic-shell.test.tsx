import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('G8.2 native React Basic shell', () => {
  it('routes every editor URL to the React-only Basic shell', () => {
    const app = read('src/react/App.tsx');
    expect(app).toContain('<BasicEditorApp />');
    expect(app).not.toContain('ProEducationEditorApp');
    expect(app).not.toContain('LegacySvelteApp');
    expect(app).not.toContain('EditorChromePortals');
    expect(app).toContain('<KeyboardShortcuts />');
  });

  it('owns the complete Basic frame without Svelte slots or React portals', () => {
    const shell = read('src/react/editor/BasicEditorApp.tsx');
    for (const owner of [
      'BasicHeaderIdentity', 'TabBar', 'BasicHeaderActions', 'BasicRibbon',
      'ToolOptionsBarCore', 'BasicWorkspace', 'StatusBar', 'BasicPanelController',
      'SectionChangerEventHost', 'GlobalNotifications', 'CadImportEventHost',
      'IfcImportEventHost', 'ImportCoordinatesDialog', 'TourOverlay',
    ]) expect(shell).toContain(`<${owner}`);
    for (const slot of [
      'react-basic-header-identity-slot', 'react-basic-header-actions-slot',
      'react-basic-ribbon-slot', 'react-tool-options-slot', 'react-basic-workspace-slot',
    ]) {
      expect(shell).not.toContain(slot);
    }
    expect(existsSync(join(root, 'src/App.svelte'))).toBe(false);
    expect(existsSync(join(root, 'src/react/components/EditorChromePortals.tsx'))).toBe(false);
  });

  it('moves Basic startup, persistence, URL restore and solve lifecycle into React', () => {
    const lifecycle = read('src/react/editor/useBasicEditorLifecycle.ts');
    for (const contract of [
      "applyModeDefaults('basico')", 'initSolver()', 'refreshCanonicalSections()',
      'tabManager.init()', 'loadFromURLHash()', 'loadWorkspaceFromLocalStorage()',
      'tabManager.restoreSession', 'loadAutosave()', "requestAutosave('timer')",
      'saveWorkspaceToLocalStorage()', "window.addEventListener('stabileo-solve'",
      'runGlobalSolve()', 'runLiveCalc(', 'downloadCanvasPNG(canvas)',
      "window.addEventListener('resize'", "window.removeEventListener('resize'",
    ]) expect(lifecycle).toContain(contract);
  });

  it('preserves Basic deep links, examples, demo startup and autosave recovery', () => {
    const lifecycle = read('src/react/editor/useBasicEditorLifecycle.ts');
    for (const contract of [
      'startDemo(DEFAULT_DEMO)', "queryParams.get('example')", 'modelStore.loadExample(exampleId)',
      "window.dispatchEvent(new Event('stabileo-zoom-to-fit'))", 'openInspectFromUrl',
      'openKinematicFromUrl', 'pendingSolveFromURL', 'noteAxisConventionMigrationIfNeeded',
      'modelStore.restore(offer.data.snapshot)', 'clearAutosave()',
    ]) expect(lifecycle).toContain(contract);
  });

  it('normalizes editor route changes to the single Basic mode', () => {
    const routing = read('src/lib/editor/routing.ts');
    for (const contract of [
      "export type AppMode = 'basico'", "return '/app/basic'", "return 'basico'",
      'applyModeDefaults(target)', 'replaceEditorUrl(target',
      "window.dispatchEvent(new Event('stabileo-editor-route-change'))",
    ]) expect(routing).toContain(contract);
  });
});
