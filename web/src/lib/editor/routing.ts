import { modelStore, resultsStore, uiStore } from '../store';

export type AppMode = 'basico';

export function isAppRoute(pathname: string): boolean {
  return pathname === '/app' || pathname === '/app/' || pathname.startsWith('/app/');
}

export function isDemoRoute(pathname: string): boolean {
  return pathname === '/demo' || pathname === '/demo/';
}

export function slugifyTabName(name: string): string {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'new-structure';
}

export function modeToPath(mode: AppMode): string {
  void mode;
  return '/app/basic';
}

export function pathToMode(pathname: string): AppMode {
  void pathname;
  return 'basico';
}

export function replaceEditorUrl(mode: AppMode, tabName?: string): void {
  const url = new URL(location.href);
  url.pathname = modeToPath(mode);
  if (tabName) url.searchParams.set('tab', slugifyTabName(tabName));
  else url.searchParams.delete('tab');
  history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}

export function applyModeDefaults(mode: AppMode): void {
  void mode;
  uiStore.analysisMode = '2d';
  resultsStore.showReactions = true;
}

/** Switch modes without losing the model owned by either editor shell. */
export function switchEditorMode(target: AppMode): void {
  applyModeDefaults(target);
  replaceEditorUrl(target, modelStore.model.name);
  window.dispatchEvent(new Event('stabileo-editor-route-change'));
}
