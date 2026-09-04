import { useEffect, useState } from 'react';
import { createViewport2DController, type ViewportControllerApi } from '../../components/ViewportController';
import { modelStore, uiStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';
import { ViewportControls } from './ViewportControls';
import './Viewport2D.css';

/** React-owned 2D canvas shell. The drawing controller is migrated separately. */
export function Viewport2D() {
  const uiRevision = useStoreRevision(uiStore);
  useStoreRevision(modelStore);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [controller, setController] = useState<ViewportControllerApi | null>(null);
  useEffect(() => {
    if (!canvas) return;
    const next = createViewport2DController(canvas);
    setController(next);
    return () => { setController(null); next.dispose(); };
  }, [canvas]);
  useEffect(() => {
    if (!canvas || !controller) return;
    const cursor = () => { canvas.style.cursor = controller.getCursor(); };
    const down = (event: MouseEvent) => { controller.handleMouseDown(event); cursor(); };
    const move = (event: MouseEvent) => { controller.handleMouseMove(event); cursor(); };
    const up = () => { controller.handleMouseUp(); cursor(); };
    const dbl = (event: MouseEvent) => controller.handleDblClick(event);
    const wheel = (event: WheelEvent) => controller.handleWheel(event);
    const menu = (event: MouseEvent) => controller.handleContextMenu(event);
    const touchStart = (event: TouchEvent) => controller.handleTouchStart(event);
    const touchMove = (event: TouchEvent) => controller.handleTouchMove(event);
    const touchEnd = (event: TouchEvent) => controller.handleTouchEnd(event);
    const dragOver = (event: DragEvent) => { event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'; };
    const drop = (event: DragEvent) => { event.preventDefault(); const file = event.dataTransfer?.files[0]; if (file?.name.toLowerCase().endsWith('.dxf')) window.dispatchEvent(new CustomEvent('stabileo-dxf-drop', { detail: file })); };
    canvas.addEventListener('mousedown', down); canvas.addEventListener('mousemove', move); canvas.addEventListener('mouseup', up); canvas.addEventListener('mouseleave', up);
    canvas.addEventListener('dblclick', dbl); canvas.addEventListener('wheel', wheel, { passive: false }); canvas.addEventListener('contextmenu', menu);
    canvas.addEventListener('touchstart', touchStart, { passive: false }); canvas.addEventListener('touchmove', touchMove, { passive: false }); canvas.addEventListener('touchend', touchEnd, { passive: false });
    canvas.addEventListener('dragover', dragOver); canvas.addEventListener('drop', drop); cursor();
    return () => { canvas.removeEventListener('mousedown', down); canvas.removeEventListener('mousemove', move); canvas.removeEventListener('mouseup', up); canvas.removeEventListener('mouseleave', up); canvas.removeEventListener('dblclick', dbl); canvas.removeEventListener('wheel', wheel); canvas.removeEventListener('contextmenu', menu); canvas.removeEventListener('touchstart', touchStart); canvas.removeEventListener('touchmove', touchMove); canvas.removeEventListener('touchend', touchEnd); canvas.removeEventListener('dragover', dragOver); canvas.removeEventListener('drop', drop); };
  }, [canvas, controller]);
  useEffect(() => { if (canvas && controller) canvas.style.cursor = controller.getCursor(); }, [canvas, controller, uiRevision]);
  const fit = () => {
    if (!canvas || modelStore.nodes.size === 0) return;
    uiStore.zoomToFit(modelStore.nodes.values(), canvas.width, canvas.height);
  };
  return <div className="viewport2d-wrapper">
    <canvas ref={setCanvas} aria-label="2D structural model viewport" />
    <ViewportControls mode="2d" top={uiStore.floatingToolsTopOffset} onFit={fit} />
  </div>;
}
