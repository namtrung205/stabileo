export type ScreenPoint = { x: number; y: number };
export type ViewTransform2D = { zoom: number; panX: number; panY: number };

/** Convert a pointer's client coordinates into canvas-local coordinates. */
export function canvasPoint(clientX: number, clientY: number, rect: Pick<DOMRect, 'left' | 'top'>): ScreenPoint {
  return { x: clientX - rect.left, y: clientY - rect.top };
}

/** Keep one world point fixed under the pointer while changing zoom. */
export function zoomAroundPoint(view: ViewTransform2D, point: ScreenPoint, scale: number): ViewTransform2D {
  const worldX = (point.x - view.panX) / view.zoom;
  const worldY = -(point.y - view.panY) / view.zoom;
  const zoom = view.zoom * scale;
  return {
    zoom,
    panX: point.x - worldX * zoom,
    panY: point.y + worldY * zoom,
  };
}

export function gestureMetrics(a: ScreenPoint, b: ScreenPoint) {
  return {
    distance: Math.hypot(b.x - a.x, b.y - a.y),
    center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
  };
}

/** Apply pinch zoom around the current centre, then the two-finger pan delta. */
export function updatePinchTransform(
  view: ViewTransform2D,
  previous: { distance: number; center: ScreenPoint },
  current: { distance: number; center: ScreenPoint },
): ViewTransform2D {
  const zoomed = previous.distance > 0
    ? zoomAroundPoint(view, current.center, current.distance / previous.distance)
    : view;
  return {
    ...zoomed,
    panX: zoomed.panX + current.center.x - previous.center.x,
    panY: zoomed.panY + current.center.y - previous.center.y,
  };
}

export function viewportCursor(state: {
  currentTool: string;
  isPanning: boolean;
  draggedNodeId: number | null;
  selectMode: string;
  nodeMode: string;
}): string {
  if (state.currentTool === 'pan') return state.isPanning ? 'grabbing' : 'grab';
  if (state.currentTool === 'select') {
    if (state.draggedNodeId !== null) return 'grabbing';
    return state.selectMode === 'stress' ? 'crosshair' : 'default';
  }
  if (state.currentTool === 'node') return state.nodeMode === 'hinge' ? 'pointer' : 'cell';
  return ['element', 'support', 'load', 'influenceLine'].includes(state.currentTool) ? 'crosshair' : 'default';
}
