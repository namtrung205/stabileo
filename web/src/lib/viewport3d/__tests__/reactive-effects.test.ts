import { describe, expect, it, vi } from 'vitest';
import { makeReactObservable } from '../../store/react-external-store';
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
});
