import { describe, expect, it } from 'vitest';
import {
  isAppRoute,
  isDemoRoute,
  modeToPath,
  pathToMode,
  slugifyTabName,
} from '../routing';

describe('editor route contract', () => {
  it('maps every legacy editor URL to the single Basic mode', () => {
    expect(modeToPath('basico')).toBe('/app/basic');
    expect(pathToMode('/app/basic')).toBe('basico');
    expect(pathToMode('/app/basic/')).toBe('basico');
    expect(pathToMode('/app/education')).toBe('basico');
    expect(pathToMode('/app/pro/')).toBe('basico');
  });

  it('keeps the Basic aliases and editor route boundary explicit', () => {
    for (const path of ['/app', '/app/', '/app/basic', '/app/pro']) expect(isAppRoute(path)).toBe(true);
    expect(isAppRoute('/blog/app/basic')).toBe(false);
    expect(isDemoRoute('/demo')).toBe(true);
    expect(isDemoRoute('/demo/')).toBe(true);
    expect(isDemoRoute('/demo/basic')).toBe(false);
  });

  it('normalizes tab names without changing the persisted model name', () => {
    expect(slugifyTabName('Pórtico Principal 01')).toBe('portico-principal-01');
    expect(slugifyTabName('  A / B  ')).toBe('a-b');
    expect(slugifyTabName('')).toBe('new-structure');
  });
});
