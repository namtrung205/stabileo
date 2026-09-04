import type { ReactExternalStore } from '../store/react-external-store';

type UiViewportState = ReactExternalStore & {
  currentTool: string;
  elementMode: string;
  nodeMode: string;
  selectMode: string;
  liveCalc: boolean;
  despieceInspect: unknown;
  clearSelectedSupports(): void;
  clearSelectedLoads(): void;
};

type ResultsViewportState = ReactExternalStore & {
  diagramType: string;
  results: unknown;
  stressQuery: unknown;
};

type CoordinatorOptions = {
  stores: { model: ReactExternalStore; ui: UiViewportState; results: ResultsViewportState };
  invalidate(): void;
  updateAnimation(): void;
  resetPendingElement(): void;
  resetDiagramProbe(): void;
  beginDespieceAnimation(now: number): void;
  now?(): number;
};

type Snapshot = {
  currentTool: string;
  elementMode: string;
  selectMode: string;
  diagramType: string;
  results: unknown;
};

/** Framework-neutral bridge from editor stores to the 2D render lifecycle. */
export function createViewportStateCoordinator(options: CoordinatorOptions) {
  const { model, ui, results } = options.stores;
  const read = (): Snapshot => ({
    currentTool: ui.currentTool,
    elementMode: ui.elementMode,
    selectMode: ui.selectMode,
    diagramType: results.diagramType,
    results: results.results,
  });
  let previous = read();
  let syncing = false;
  let rerun = false;
  let started = false;
  let unsubscribers: Array<() => void> = [];

  const synchronize = (initial = false) => {
    if (syncing) { rerun = true; return; }
    do {
      rerun = false;
      syncing = true;
      const next = read();
      if (initial || next.currentTool !== previous.currentTool) {
        if (next.currentTool !== 'element') {
          options.resetPendingElement();
          if (ui.elementMode !== 'create') ui.elementMode = 'create';
        }
        if (next.currentTool !== 'node' && ui.nodeMode !== 'create') ui.nodeMode = 'create';
        if (next.currentTool !== 'select') {
          ui.clearSelectedSupports();
          ui.clearSelectedLoads();
        }
      }
      if ((initial || next.elementMode !== previous.elementMode) && next.elementMode === 'hinge') {
        options.resetPendingElement();
      }
      if (initial || next.diagramType !== previous.diagramType || next.results !== previous.results) {
        options.resetDiagramProbe();
      }
      if (ui.selectMode !== 'stress' && results.stressQuery !== null) results.stressQuery = null;
      if (!results.results && ui.selectMode === 'stress' && !ui.liveCalc) {
        ui.selectMode = 'elements';
        if (results.stressQuery !== null) results.stressQuery = null;
      }
      if ((initial || next.diagramType !== previous.diagramType) && next.diagramType === 'despiece') {
        options.beginDespieceAnimation((options.now ?? performance.now.bind(performance))());
      } else if (results.diagramType !== 'despiece' && ui.despieceInspect) {
        ui.despieceInspect = null;
      }
      previous = read();
      options.updateAnimation();
      options.invalidate();
      syncing = false;
      initial = false;
    } while (rerun);
  };

  return {
    start() {
      if (started) return;
      started = true;
      const notify = () => synchronize();
      unsubscribers = [model.reactSubscribe(notify), ui.reactSubscribe(notify), results.reactSubscribe(notify)];
      synchronize(true);
    },
    dispose() {
      if (!started) return;
      started = false;
      for (const unsubscribe of unsubscribers) unsubscribe();
      unsubscribers = [];
    },
  };
}
