import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { t } from '../../lib/i18n';
import { localeExternalStore } from '../../lib/i18n/store';
import { openBasicPanel } from '../../lib/store/basic-panel';
import {
  clearAutosave,
  downloadCanvasPNG,
  loadAutosave,
  loadWorkspaceFromLocalStorage,
  noteAxisConventionMigrationIfNeeded,
  saveWorkspaceToLocalStorage,
  type DedalFile,
} from '../../lib/store/file';
import { requestAutosave } from '../../lib/store/autosave-service';
import { modelStore, resultsStore, tabManager, uiStore } from '../../lib/store';
import { runGlobalSolve, runLiveCalc } from '../../lib/engine/live-calc';
import { loadFromURLHash } from '../../lib/utils/url-sharing';
import { DEFAULT_DEMO, startDemo } from '../../lib/tour/demos';
import {
  applyModeDefaults,
  isDemoRoute,
  modeToPath,
  replaceEditorUrl,
  slugifyTabName,
} from '../../lib/editor/routing';
import { useStoreRevision } from '../store/useStoreRevision';

export interface BasicAutosaveOffer {
  data: DedalFile;
  timestamp: string | null;
  older: boolean;
}

function findTabBySlug(tabSlug: string | null) {
  if (!tabSlug) return null;
  return tabManager.tabs.find((tab) => slugifyTabName(tab.name) === tabSlug) ?? null;
}

function openInspectFromUrl(params: URLSearchParams, schedule: (run: () => void, delay: number) => void): void {
  const elementId = Number(params.get('inspect'));
  if (!params.has('inspect') || !Number.isInteger(elementId)) return;
  const requested = Number(params.get('t') ?? '0.5');
  const station = Number.isFinite(requested) ? Math.min(1, Math.max(0, requested)) : 0.5;
  let tries = 0;
  const open = () => {
    const element = modelStore.elements.get(elementId);
    const solved = resultsStore.results !== null || resultsStore.results3D !== null;
    if (element && solved) {
      const a = modelStore.nodes.get(element.nodeI);
      const b = modelStore.nodes.get(element.nodeJ);
      if (!a || !b) return;
      resultsStore.stressQuery = {
        elementId,
        t: station,
        worldX: a.x + (b.x - a.x) * station,
        worldY: a.y + (b.y - a.y) * station,
        worldZ: (a.z ?? 0) + ((b.z ?? 0) - (a.z ?? 0)) * station,
      };
      if (!uiStore.isMobile) openBasicPanel('advanced', { toggle: false });
      return;
    }
    if (tries++ < 60) schedule(open, 120);
  };
  open();
}

function openKinematicFromUrl(params: URLSearchParams): void {
  if (params.get('kin') !== '1') return;
  uiStore.showKinematicPanel = true;
  if (!uiStore.isMobile) openBasicPanel('advanced', { toggle: false });
}

export function useBasicEditorLifecycle() {
  const modelRevision = useStoreRevision(modelStore);
  const uiRevision = useStoreRevision(uiStore);
  useStoreRevision(resultsStore);
  const localeRevision = useSyncExternalStore(
    localeExternalStore.subscribe,
    localeExternalStore.getSnapshot,
    localeExternalStore.getSnapshot,
  );
  const initialPath = useRef(window.location.pathname);
  const liveCalcTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousModelVersion = useRef(-1);
  const previousAnalysisMode = useRef('');
  const [offer, setOffer] = useState<BasicAutosaveOffer | null>(null);
  const [autosaveDismissed, setAutosaveDismissed] = useState(false);

  const cancelPendingLiveCalc = useCallback(() => {
    if (liveCalcTimer.current) clearTimeout(liveCalcTimer.current);
    liveCalcTimer.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const schedule = (run: () => void, delay: number) => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (!cancelled) run();
      }, delay);
      timers.add(timer);
    };

    applyModeDefaults('basico');
    void import('../../lib/engine/wasm-solver')
      .then((module) => module.initSolver())
      .then(() => { if (!cancelled) modelStore.refreshCanonicalSections(); })
      .catch(() => console.warn('WASM solver unavailable, using JS fallback'));
    tabManager.init();

    if (isDemoRoute(initialPath.current)) {
      history.replaceState(null, '', modeToPath('basico'));
      schedule(() => startDemo(DEFAULT_DEMO), 600);
    }

    const hashMode = loadFromURLHash();
    const queryParams = new URLSearchParams(location.search);
    if (hashMode === 'embed' || queryParams.has('embed')) uiStore.embedMode = true;

    const exampleId = queryParams.get('example');
    if (exampleId) {
      schedule(() => {
        void modelStore.loadExample(exampleId).then(() => {
          if (cancelled) return;
          resultsStore.clear();
          resultsStore.clear3D();
          window.dispatchEvent(new Event('stabileo-solve'));
          const tryFit = (attempt: number) => {
            const canvas = document.querySelector('.viewport-container canvas') as HTMLCanvasElement | null;
            if (canvas && canvas.width > 0 && canvas.height > 0) {
              window.dispatchEvent(new Event('stabileo-zoom-to-fit'));
              return;
            }
            if (attempt < 40) schedule(() => tryFit(attempt + 1), 60);
          };
          tryFit(0);
          openInspectFromUrl(queryParams, schedule);
          openKinematicFromUrl(queryParams);
        }).catch((error) => console.error(`[stabileo] example "${exampleId}" failed to load:`, error));
      }, 80);
    }

    if (hashMode) {
      schedule(() => {
        const canvas = document.querySelector('.viewport-container canvas') as HTMLCanvasElement | null;
        if (canvas && modelStore.nodes.size > 0) {
          uiStore.zoomToFit(modelStore.nodes.values(), canvas.width, canvas.height);
        }
      }, 100);
      if (uiStore.pendingSolveFromURL) {
        const pendingDiagram = uiStore.pendingSolveFromURL;
        uiStore.pendingSolveFromURL = null;
        schedule(() => {
          window.dispatchEvent(new Event('stabileo-solve'));
          schedule(() => {
            if (resultsStore.results !== null || resultsStore.results3D !== null) {
              resultsStore.diagramType = pendingDiagram as typeof resultsStore.diagramType;
            }
          }, 200);
        }, 200);
      }
    } else {
      const savedWorkspace = loadWorkspaceFromLocalStorage();
      if (savedWorkspace?.tabs.length) {
        tabManager.restoreSession(savedWorkspace.tabs, savedWorkspace.activeTabId);
        const requestedTab = findTabBySlug(queryParams.get('tab'));
        if (requestedTab && requestedTab.id !== tabManager.activeTabId) tabManager.switchTab(requestedTab.id);
        replaceEditorUrl('basico', modelStore.model.name);
      } else {
        void loadAutosave().then((result) => {
          if (!cancelled && result.value?.snapshot.nodes.length) {
            setOffer({ data: result.value, timestamp: result.timestamp, older: result.rejected.length > 0 });
          }
        });
      }
    }

    const autosaveInterval = setInterval(() => {
      void requestAutosave('timer');
      saveWorkspaceToLocalStorage();
    }, 30_000);

    uiStore.windowWidth = window.innerWidth;
    const onResize = () => { uiStore.windowWidth = window.innerWidth; };
    const exportPng = () => {
      const canvas = document.querySelector('.viewport-container canvas') as HTMLCanvasElement | null;
      if (canvas) downloadCanvasPNG(canvas);
    };
    const solve = () => {
      cancelPendingLiveCalc();
      runGlobalSolve();
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('stabileo-export-png', exportPng);
    window.addEventListener('stabileo-solve', solve);

    return () => {
      cancelled = true;
      for (const timer of timers) clearTimeout(timer);
      clearInterval(autosaveInterval);
      cancelPendingLiveCalc();
      saveWorkspaceToLocalStorage();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('stabileo-export-png', exportPng);
      window.removeEventListener('stabileo-solve', solve);
    };
  }, [cancelPendingLiveCalc]);

  useEffect(() => {
    document.documentElement.lang = t('file.htmlLang');
  }, [localeRevision]);

  useEffect(() => {
    replaceEditorUrl('basico', modelStore.model.name);
  }, [modelRevision, uiRevision]);

  const modelVersion = modelStore.modelVersion;
  const liveCalc = uiStore.liveCalc;
  const analysisMode = uiStore.analysisMode;
  useEffect(() => {
    if (tabManager.isTabSwitching) return;
    const modelChanged = modelVersion !== previousModelVersion.current
      || analysisMode !== previousAnalysisMode.current;
    previousModelVersion.current = modelVersion;
    previousAnalysisMode.current = analysisMode;
    const previousDiagram = resultsStore.diagramType;
    uiStore.liveCalcError = null;
    if (modelChanged && (resultsStore.results || resultsStore.results3D)) resultsStore.clear();
    if (liveCalc) {
      cancelPendingLiveCalc();
      liveCalcTimer.current = setTimeout(() => {
        liveCalcTimer.current = null;
        runLiveCalc(analysisMode, uiStore.axisConvention3D, previousDiagram);
      }, analysisMode === '2d' ? 120 : 200);
    }
    return cancelPendingLiveCalc;
  }, [analysisMode, cancelPendingLiveCalc, liveCalc, modelVersion]);

  const savedMode = offer?.data.appMode ?? 'basico';
  const showAutosave = Boolean(
    offer
    && !autosaveDismissed
    && savedMode === 'basico'
    && !(modelStore.nodes.size > 0 && modelStore.model.name !== offer.data.name),
  );

  const restoreAutosave = useCallback(() => {
    if (!offer) return;
    modelStore.restore(offer.data.snapshot);
    modelStore.model.name = offer.data.name;
    noteAxisConventionMigrationIfNeeded(offer.data.snapshot, offer.data.analysisMode);
    if (offer.data.analysisMode) uiStore.analysisMode = offer.data.analysisMode;
    if (offer.data.axisConvention3D) uiStore.axisConvention3D = offer.data.axisConvention3D;
    if (offer.data.viewportPresentation3D) uiStore.viewportPresentation3D = offer.data.viewportPresentation3D;
    replaceEditorUrl('basico', modelStore.model.name);
    resultsStore.clear();
    setAutosaveDismissed(true);
  }, [offer]);

  const discardAutosave = useCallback(() => {
    void clearAutosave();
    setAutosaveDismissed(true);
  }, []);

  return { offer, showAutosave, restoreAutosave, discardAutosave };
}
