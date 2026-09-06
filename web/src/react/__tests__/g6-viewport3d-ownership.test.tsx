import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('G6.1 React 3D viewport shell ownership', () => {
  it('mounts the 3D route directly in the native React workspace', () => {
    const workspace = read('src/react/components/BasicWorkspace.tsx');
    expect(workspace).toContain('<Viewport3D />');
    expect(workspace).not.toContain('createPortal');
    expect(existsSync(join(process.cwd(), 'src/App.svelte'))).toBe(false);
    expect(existsSync(join(process.cwd(), 'src/react/components/EditorChromePortals.tsx'))).toBe(false);
  });

  it('gives React ownership of wrapper, camera controls and native pointer listeners', () => {
    const react = read('src/react/components/Viewport3D.tsx');
    expect(react).toContain('className="viewport3d-wrapper"');
    expect(react).toContain('ref={setRenderCanvas} className="viewport3d-canvas"');
    expect(react).toContain('<ViewportControls');
    expect(react).toContain('bindViewport3DInteractions(renderCanvas, controller, cursor)');
  });

  it('uses a framework-neutral scene controller with explicit readiness cleanup', () => {
    const controller = read('src/components/Viewport3DController.ts');
    expect(controller).toContain('createViewport3DController');
    expect(controller).toContain('createStoreEffectScope');
    expect(controller).toContain('new THREE.WebGLRenderer({ canvas,');
    expect(controller).not.toContain('container.appendChild(renderer.domElement)');
    expect(controller).toContain('effectScope.start({ deferInitial: true, initialBatchSize: 1 })');
    expect(controller).not.toContain('// Initial sync');
    expect(controller).toContain('onready({');
    expect(controller).toContain('onready(null)');
    expect(controller).not.toMatch(/\$effect\s*\(/);
    expect(controller).not.toMatch(/\$state\s*(?:<|\()/);
    expect(existsSync(join(process.cwd(), 'src/components/Viewport3D.svelte'))).toBe(false);
    expect(existsSync(join(process.cwd(), 'src/components/ViewportControlsHost.svelte'))).toBe(false);
    expect(read('src/react/components/Viewport3DOverlays.tsx')).toContain('CoordinateNodeDialog3D');
  });

  it('gives React ownership of every 3D overlay and the axis gizmo', () => {
    const viewport = read('src/react/components/Viewport3D.tsx');
    const overlays = read('src/react/components/Viewport3DOverlays.tsx');
    expect(viewport).toContain('className="axis-gizmo"');
    expect(viewport).not.toContain('LegacySvelteSurface');
    expect(viewport).toContain('<ShellContourLegend />');
    for (const surface of [
      'Viewport3DStoreOverlays', 'CoordinateNodeDialog3D', 'Viewport3DInteractionOverlays',
      'shell-legend', 'perf-hud', 'box-select-rect', 'hover-tooltip',
    ]) expect(`${viewport}\n${overlays}`).toContain(surface);
    expect(existsSync(join(process.cwd(), 'src/components/viewport/ShellContourLegend.svelte'))).toBe(false);
  });
});
