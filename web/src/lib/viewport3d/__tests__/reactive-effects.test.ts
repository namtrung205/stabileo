import { describe, expect, it, vi } from 'vitest';
import { makeReactObservable } from '../../store/react-external-store';
import { resultsStore } from '../../store/results';
import { uiStore } from '../../store/ui';
import { createStoreEffectScope } from '../reactive-effects';

describe('3D reactive effect scope', () => {
  it('tracks properties and batches only affected effects', async () => {
    const store = makeReactObservable({ camera: 'iso', grid: true });
    const cameraEffect = vi.fn(() => { store.camera; });
    const gridEffect = vi.fn(() => { store.grid; });
    const scope = createStoreEffectScope([store]);
    scope.effect(cameraEffect);
    scope.effect(gridEffect);
    scope.start();
    cameraEffect.mockClear(); gridEffect.mockClear();

    store.camera = 'top';
    store.camera = 'side';
    await Promise.resolve();
    expect(cameraEffect).toHaveBeenCalledTimes(1);
    expect(gridEffect).not.toHaveBeenCalled();
  });

  it('refreshes dynamic dependencies and stops after disposal', async () => {
    const store = makeReactObservable({ mode: 'a', a: 1, b: 2 });
    const effect = vi.fn(() => store.mode === 'a' ? store.a : store.b);
    const scope = createStoreEffectScope([store]);
    scope.effect(effect); scope.start(); effect.mockClear();
    store.mode = 'b'; await Promise.resolve(); effect.mockClear();
    store.a = 3; await Promise.resolve();
    expect(effect).not.toHaveBeenCalled();
    store.b = 4; await Promise.resolve();
    expect(effect).toHaveBeenCalledTimes(1);
    scope.dispose(); effect.mockClear();
    store.b = 5; await Promise.resolve();
    expect(effect).not.toHaveBeenCalled();
  });

  it('does not treat a high-frequency method notification as a full store mutation', async () => {
    let pointerX = 0;
    const store = makeReactObservable({
      modelVersion: 1,
      get pointerX() { return pointerX; },
      setPointerX(value: number) { pointerX = value; },
    }, ['setPointerX'], { setPointerX: 'pointerPosition' });
    const sceneEffect = vi.fn(() => { store.modelVersion; });
    const scope = createStoreEffectScope([store]);
    scope.effect(sceneEffect);
    scope.start();
    sceneEffect.mockClear();

    store.setPointerX(42);
    await Promise.resolve();

    expect(store.pointerX).toBe(42);
    expect(sceneEffect).not.toHaveBeenCalled();
    scope.dispose();
  });

  it('routes a closure-backed method to only the affected properties', async () => {
    let selectedNodes = new Set<number>();
    let selectedElements = new Set<number>();
    const store = makeReactObservable({
      modelVersion: 1,
      get selectedNodes() { return selectedNodes; },
      get selectedElements() { return selectedElements; },
      selectNode(id: number) {
        selectedNodes = new Set([id]);
        selectedElements = new Set();
      },
    }, ['selectNode'], { selectNode: ['selectedNodes', 'selectedElements'] });
    const modelEffect = vi.fn(() => { store.modelVersion; });
    const selectionEffect = vi.fn(() => { store.selectedNodes; store.selectedElements; });
    const scope = createStoreEffectScope([store]);
    scope.effect(modelEffect);
    scope.effect(selectionEffect);
    scope.start();
    modelEffect.mockClear();
    selectionEffect.mockClear();

    store.selectNode(7);
    await Promise.resolve();

    expect(modelEffect).not.toHaveBeenCalled();
    expect(selectionEffect).toHaveBeenCalledTimes(1);
    expect([...store.selectedNodes]).toEqual([7]);
    scope.dispose();
  });

  it('keeps the real UI pointer stream out of unrelated 3D effects', async () => {
    const sceneEffect = vi.fn(() => { uiStore.renderMode3D; });
    const scope = createStoreEffectScope([uiStore]);
    scope.effect(sceneEffect);
    scope.start();
    sceneEffect.mockClear();

    uiStore.setMouse(10, 20, 1.5, 2.5);
    await Promise.resolve();

    expect(sceneEffect).not.toHaveBeenCalled();
    scope.dispose();
  });

  it('does not publish colour-scale updates as full results-store mutations', () => {
    const notifications: Array<PropertyKey | undefined> = [];
    const unsubscribe = resultsStore.reactSubscribe((property) => notifications.push(property));

    resultsStore.setColourScale(null);

    unsubscribe();
    expect(notifications).toEqual(['colourScale']);
  });

  it('can yield between initial effects without losing startup changes', async () => {
    const store = makeReactObservable({ first: 0, second: 0 });
    const firstEffect = vi.fn(() => { store.first; });
    const secondEffect = vi.fn(() => { store.second; });
    const scheduled: Array<() => void> = [];
    const scope = createStoreEffectScope([store]);
    scope.effect(firstEffect);
    scope.effect(secondEffect);
    scope.start({
      deferInitial: true,
      initialBatchSize: 1,
      scheduleInitial: (run) => {
        scheduled.push(run);
        return scheduled.length as unknown as ReturnType<typeof setTimeout>;
      },
      cancelInitial: vi.fn(),
    });

    expect(firstEffect).not.toHaveBeenCalled();
    expect(secondEffect).not.toHaveBeenCalled();
    store.second = 1;
    await Promise.resolve();
    expect(secondEffect).not.toHaveBeenCalled();

    scheduled.shift()?.();
    expect(firstEffect).toHaveBeenCalledTimes(1);
    expect(secondEffect).not.toHaveBeenCalled();
    scheduled.shift()?.();
    expect(secondEffect).toHaveBeenCalledTimes(1);

    store.second = 2;
    await Promise.resolve();
    expect(secondEffect).toHaveBeenCalledTimes(2);
    scope.dispose();
  });

  it('cancels deferred startup when the 3D viewport unmounts', () => {
    const store = makeReactObservable({ value: 0 });
    const effect = vi.fn(() => { store.value; });
    const scheduled: Array<() => void> = [];
    const cancelInitial = vi.fn();
    const scope = createStoreEffectScope([store]);
    scope.effect(effect);
    scope.start({
      deferInitial: true,
      scheduleInitial: (run) => {
        scheduled.push(run);
        return 7 as unknown as ReturnType<typeof setTimeout>;
      },
      cancelInitial,
    });

    scope.dispose();
    expect(cancelInitial).toHaveBeenCalledWith(7);
    scheduled.shift()?.();
    expect(effect).not.toHaveBeenCalled();
  });
});
