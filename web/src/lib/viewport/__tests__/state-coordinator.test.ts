import { describe, expect, it, vi } from 'vitest';
import { createViewportStateCoordinator } from '../state-coordinator';

function observable<T extends object>(state: T) {
  const listeners = new Set<() => void>();
  return Object.assign(state, {
    reactSubscribe(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); },
    reactSnapshot: () => 0,
    reactNotify() { for (const listener of listeners) listener(); },
  });
}

function harness() {
  const model = observable({});
  const ui = observable({
    currentTool: 'element', elementMode: 'create', nodeMode: 'create', selectMode: 'elements', liveCalc: false,
    despieceInspect: null as unknown, clearSelectedSupports: vi.fn(), clearSelectedLoads: vi.fn(),
  });
  const results = observable({ diagramType: 'none', results: null as unknown, stressQuery: null as unknown });
  const callbacks = {
    invalidate: vi.fn(), updateAnimation: vi.fn(), resetPendingElement: vi.fn(), resetDiagramProbe: vi.fn(),
    beginDespieceAnimation: vi.fn(), now: () => 42,
  };
  const coordinator = createViewportStateCoordinator({ stores: { model, ui, results }, ...callbacks });
  return { model, ui, results, callbacks, coordinator };
}

describe('2D viewport state coordinator', () => {
  it('invalidates for every store and stops after disposal', () => {
    const { model, ui, results, callbacks, coordinator } = harness();
    coordinator.start(); callbacks.invalidate.mockClear();
    model.reactNotify(); ui.reactNotify(); results.reactNotify();
    expect(callbacks.invalidate).toHaveBeenCalledTimes(3);
    coordinator.dispose(); model.reactNotify();
    expect(callbacks.invalidate).toHaveBeenCalledTimes(3);
  });

  it('applies tool and result transition resets', () => {
    const { ui, results, callbacks, coordinator } = harness();
    coordinator.start();
    callbacks.resetPendingElement.mockClear(); callbacks.resetDiagramProbe.mockClear();
    ui.currentTool = 'pan'; ui.elementMode = 'hinge'; ui.nodeMode = 'hinge'; ui.reactNotify();
    expect(callbacks.resetPendingElement).toHaveBeenCalled();
    expect(ui.elementMode).toBe('create'); expect(ui.nodeMode).toBe('create');
    expect(ui.clearSelectedSupports).toHaveBeenCalled();
    results.results = {}; results.reactNotify();
    expect(callbacks.resetDiagramProbe).toHaveBeenCalled();
  });

  it('starts despiece animation and exits invalid stress selection', () => {
    const { ui, results, callbacks, coordinator } = harness();
    coordinator.start();
    ui.selectMode = 'stress'; results.stressQuery = {}; ui.reactNotify();
    expect(ui.selectMode).toBe('elements'); expect(results.stressQuery).toBeNull();
    results.diagramType = 'despiece'; results.reactNotify();
    expect(callbacks.beginDespieceAnimation).toHaveBeenCalledWith(42);
  });
});
