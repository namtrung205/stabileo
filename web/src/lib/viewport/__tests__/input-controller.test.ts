import { describe, expect, it } from 'vitest';
import { canvasPoint, gestureMetrics, updatePinchTransform, viewportCursor, zoomAroundPoint } from '../input-controller';

describe('2D viewport input controller geometry', () => {
  it('normalises client coordinates against the canvas rectangle', () => {
    expect(canvasPoint(150, 90, { left: 40, top: 20 })).toEqual({ x: 110, y: 70 });
  });

  it('keeps the world point beneath the pointer fixed during zoom', () => {
    const point = { x: 500, y: 250 };
    const before = { zoom: 50, panX: 400, panY: 300 };
    const worldBefore = { x: (point.x - before.panX) / before.zoom, y: -(point.y - before.panY) / before.zoom };
    const after = zoomAroundPoint(before, point, 1.1);
    expect((point.x - after.panX) / after.zoom).toBeCloseTo(worldBefore.x);
    expect(-(point.y - after.panY) / after.zoom).toBeCloseTo(worldBefore.y);
  });

  it('combines pinch scaling with two-finger panning', () => {
    const previous = gestureMetrics({ x: 0, y: 0 }, { x: 100, y: 0 });
    const current = gestureMetrics({ x: 20, y: 10 }, { x: 140, y: 10 });
    expect(updatePinchTransform({ zoom: 50, panX: 400, panY: 300 }, previous, current)).toEqual({
      zoom: 60, panX: 494, panY: 368,
    });
  });
});

describe('2D viewport cursor contract', () => {
  const base = { currentTool: 'select', isPanning: false, draggedNodeId: null, selectMode: 'elements', nodeMode: 'create' };
  it('preserves pan, stress, drag, node, and creation cursors', () => {
    expect(viewportCursor({ ...base, currentTool: 'pan' })).toBe('grab');
    expect(viewportCursor({ ...base, currentTool: 'pan', isPanning: true })).toBe('grabbing');
    expect(viewportCursor({ ...base, draggedNodeId: 3 })).toBe('grabbing');
    expect(viewportCursor({ ...base, selectMode: 'stress' })).toBe('crosshair');
    expect(viewportCursor({ ...base, currentTool: 'node', nodeMode: 'hinge' })).toBe('pointer');
    expect(viewportCursor({ ...base, currentTool: 'element' })).toBe('crosshair');
  });
});
