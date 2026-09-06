import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('G5.1 React 2D viewport ownership', () => {
  it('mounts the 2D route directly in the native React workspace', () => {
    const workspace = read('src/react/components/BasicWorkspace.tsx');
    expect(workspace).toContain('<Viewport2D />');
    expect(workspace).not.toContain('createPortal');
    expect(existsSync(join(process.cwd(), 'src/App.svelte'))).toBe(false);
    expect(existsSync(join(process.cwd(), 'src/react/components/EditorChromePortals.tsx'))).toBe(false);
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
