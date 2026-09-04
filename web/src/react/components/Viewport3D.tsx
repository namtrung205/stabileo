import { useCallback, useEffect, useState } from 'react';
import {
  createViewport3DController,
  type Viewport3DControllerApi,
} from '../../components/Viewport3DController';
import { uiStore } from '../../lib/store';
import { bindViewport3DInteractions } from '../../lib/viewport3d/interaction-binding';
import { useStoreRevision } from '../store/useStoreRevision';
import { ViewportControls } from './ViewportControls';
import {
  CoordinateNodeDialog3D,
  ShellContourLegend,
  Viewport3DInteractionOverlays,
  Viewport3DStoreOverlays,
} from './Viewport3DOverlays';
import './Viewport3D.css';

type Viewport3DInteractionOverlay = {
  boxSelect: { startX: number; startY: number; endX: number; endY: number; additive: boolean } | null;
  hoverTooltip: { text: string; x: number; y: number } | null;
  perfHud: { on: boolean; flush: number; fps: number; renderMs: number; syncMs: number; calls: number; tris: number; geos: number; texs: number };
};

/** React-owned 3D viewport shell; the Three.js scene migrates in later G6 gates. */
export function Viewport3D() {
  const uiRevision = useStoreRevision(uiStore);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [renderCanvas, setRenderCanvas] = useState<HTMLCanvasElement | null>(null);
  const [gizmoCanvas, setGizmoCanvas] = useState<HTMLCanvasElement | null>(null);
  const [controller, setController] = useState<Viewport3DControllerApi | null>(null);
  const [showCoordinates, setShowCoordinates] = useState(false);
  const [interactionOverlay, setInteractionOverlay] = useState<Viewport3DInteractionOverlay>({
    boxSelect: null,
    hoverTooltip: null,
    perfHud: { on: false, flush: 0, fps: 0, renderMs: 0, syncMs: 0, calls: 0, tris: 0, geos: 0, texs: 0 },
  });
  const controllerReady = useCallback((next: Viewport3DControllerApi | null) => setController(next), []);
  const requestCoordinates = useCallback(() => setShowCoordinates(true), []);
  const overlayChanged = useCallback((next: Viewport3DInteractionOverlay) => setInteractionOverlay(next), []);

  useEffect(() => {
    if (!container || !renderCanvas || !gizmoCanvas) return;
    const scene = createViewport3DController({
      container,
      canvas: renderCanvas,
      gizmoCanvas,
      onready: controllerReady,
      onrequestcoordinates: requestCoordinates,
      onoverlaychange: overlayChanged,
    });
    return () => scene.dispose();
  }, [container, renderCanvas, gizmoCanvas, controllerReady, requestCoordinates, overlayChanged]);

  useEffect(() => {
    if (!container || !renderCanvas || !controller) return;
    const cursor = () => { container.style.cursor = controller.getCursor(); };
    return bindViewport3DInteractions(renderCanvas, controller, cursor);
  }, [container, renderCanvas, controller]);

  useEffect(() => {
    if (container && controller) container.style.cursor = controller.getCursor();
  }, [container, controller, uiRevision]);

  return <div className="viewport3d-wrapper" ref={setContainer}>
    <canvas ref={setRenderCanvas} className="viewport3d-canvas" aria-label="3D structural model viewport" />
    <ViewportControls
      mode="3d"
      top={uiStore.floatingToolsTopOffset}
      onFit={() => { controller?.zoomToFit(); }}
      onView={(view) => { controller?.setView(view); }}
      onToggleCamera={() => { controller?.toggleCameraMode(); }}
    />
    <Viewport3DStoreOverlays />
    <canvas ref={setGizmoCanvas} className="axis-gizmo" width={80} height={80} />
    <ShellContourLegend />
    <Viewport3DInteractionOverlays state={interactionOverlay} />
    {showCoordinates && <CoordinateNodeDialog3D
      onClose={() => setShowCoordinates(false)}
      onSubmit={(x, y, z) => { controller?.createNodeAt(x, y, z); setShowCoordinates(false); }}
    />}
  </div>;
}
