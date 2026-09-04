import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('G5.1 React 2D viewport ownership', () => {
  it('mounts the 2D route through the React portal instead of a Svelte viewport element', () => {
    const app = read('src/App.svelte');
    const portals = read('src/react/components/EditorChromePortals.tsx');
    expect(app).not.toContain("import Viewport from './components/Viewport.svelte'");
    expect(app).not.toContain('<Viewport />');
    expect(app).toContain('react-viewport-2d-slot');
    expect(portals).toContain('createPortal(<Viewport2D />');
  });

  it('gives React ownership of canvas, controls, native listeners and cleanup', () => {
    const react = read('src/react/components/Viewport2D.tsx');
    expect(react).toContain('<canvas ref={setCanvas}');
    expect(react).toContain('<ViewportControls mode="2d"');
    for (const event of ['mousedown','mousemove','mouseup','mouseleave','dblclick','wheel','contextmenu','touchstart','touchmove','touchend','dragover','drop']) {
      expect(react).toContain(`addEventListener('${event}'`);
      expect(react).toContain(`removeEventListener('${event}'`);
    }
    expect(react).toContain('{ passive: false }');
  });

  it('uses a framework-neutral controller with explicit React disposal', () => {
    const react = read('src/react/components/Viewport2D.tsx');
    const controller = read('src/components/ViewportController.ts');
    expect(react).toContain('createViewport2DController(canvas)');
    expect(react).toContain('next.dispose()');
    expect(react).not.toContain('LegacySvelteSurface');
    expect(controller).not.toContain("from 'svelte'");
    expect(controller).toContain('export function createViewport2DController');
    expect(controller).toContain('const dispose = start()');
  });
});
