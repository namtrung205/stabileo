import { describe, expect, it } from 'vitest';
import { clientToNdc, viewport3DCursor } from '../input-controller';

describe('3D viewport input controller', () => {
  it('maps canvas corners and centre to normalized device coordinates', () => {
    const rect = { left: 100, top: 50, width: 800, height: 600 };
    expect(clientToNdc(100, 50, rect)).toEqual({ x: -1, y: 1 });
    expect(clientToNdc(500, 350, rect)).toEqual({ x: 0, y: 0 });
    expect(clientToNdc(900, 650, rect)).toEqual({ x: 1, y: -1 });
  });

  it('preserves measure, stress, selection, creation and pan cursor states', () => {
    const base = { measureMode: false, selectMode: 'elements', currentTool: 'select', draggedNodeId: null, hoveredNodeId: null };
    expect(viewport3DCursor(base)).toBe('default');
    expect(viewport3DCursor({ ...base, measureMode: true })).toBe('crosshair');
    expect(viewport3DCursor({ ...base, selectMode: 'stress' })).toBe('crosshair');
    expect(viewport3DCursor({ ...base, draggedNodeId: 1 })).toBe('grabbing');
    expect(viewport3DCursor({ ...base, hoveredNodeId: 1 })).toBe('grab');
    expect(viewport3DCursor({ ...base, currentTool: 'node' })).toBe('crosshair');
    expect(viewport3DCursor({ ...base, currentTool: 'support' })).toBe('pointer');
    expect(viewport3DCursor({ ...base, currentTool: 'pan' })).toBe('grab');
  });
});
