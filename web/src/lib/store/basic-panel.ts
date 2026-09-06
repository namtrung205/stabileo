import { resultsStore } from './results';
import { uiStore } from './ui';
import { syncModelTabWithResults } from './view-mode';

export type BasicPanelId = 'selection' | 'results' | 'settings' | 'project' | 'data' | 'advanced';
export type BasicDataTab = 'nodes' | 'elements' | 'supports' | 'loads' | 'materials' | 'sections';
export type BasicPanelState = Readonly<{ activePanel: BasicPanelId | null; activeDataTab: BasicDataTab }>;
export type BasicPanelOptions = { toggle?: boolean; dataTab?: BasicDataTab | string };

let state: BasicPanelState = { activePanel: null, activeDataTab: 'nodes' };
const listeners = new Set<() => void>();

function isPanel(value: unknown): value is BasicPanelId {
  return ['selection', 'results', 'settings', 'project', 'data', 'advanced'].includes(String(value));
}

function isDataTab(value: unknown): value is BasicDataTab {
  return ['nodes', 'elements', 'supports', 'loads', 'materials', 'sections'].includes(String(value));
}

function publish(next: BasicPanelState): void {
  if (next.activePanel === state.activePanel && next.activeDataTab === state.activeDataTab) return;
  state = next;
  syncModelTabWithResults(state.activePanel, state.activeDataTab);
  for (const listener of listeners) listener();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('stabileo-basic-panel-state', { detail: state }));
  }
}

export const basicPanelStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): BasicPanelState {
    return state;
  },
};

export function openBasicPanel(panel: BasicPanelId, options: BasicPanelOptions = {}): void {
  const activeDataTab = isDataTab(options.dataTab) ? options.dataTab : state.activeDataTab;
  const activePanel = options.toggle !== false && state.activePanel === panel ? null : panel;
  publish({ activePanel, activeDataTab });
}

export function closeBasicPanel(): void {
  publish({ ...state, activePanel: null });
  if (uiStore.selectMode === 'stress') {
    uiStore.selectMode = 'elements';
    resultsStore.stressQuery = null;
  }
}

export function setBasicDataTab(tab: BasicDataTab): void {
  publish({ ...state, activeDataTab: tab });
}

export function handleBasicPanelRequest(detail: unknown): void {
  if (!detail || typeof detail !== 'object') return;
  const request = detail as { panel?: unknown; opts?: BasicPanelOptions };
  if (request.panel === null) closeBasicPanel();
  else if (isPanel(request.panel)) openBasicPanel(request.panel, request.opts);
}
