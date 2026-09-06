import { afterEach, describe, expect, it } from 'vitest';
import { uiStore } from '../ui';

describe('Basic-only mode compatibility', () => {
  afterEach(() => { uiStore.analysisMode = '2d'; });

  it('keeps the application in the Basic product mode', () => {
    uiStore.analysisMode = '3d';
    expect(uiStore.appMode).toBe('basico');
  });

  it('normalizes legacy PRO and Education project values', () => {
    uiStore.analysisMode = 'pro';
    expect(uiStore.analysisMode).toBe('3d');
    expect(uiStore.appMode).toBe('basico');

    uiStore.analysisMode = 'edu';
    expect(uiStore.analysisMode).toBe('2d');
    expect(uiStore.appMode).toBe('basico');
  });
});
