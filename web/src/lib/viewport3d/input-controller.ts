export type NdcPoint = { x: number; y: number };

/** Convert client coordinates into Three.js normalized device coordinates. */
export function clientToNdc(
  clientX: number,
  clientY: number,
  rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
): NdcPoint {
  return {
    x: ((clientX - rect.left) / rect.width) * 2 - 1,
    y: -((clientY - rect.top) / rect.height) * 2 + 1,
  };
}

export function viewport3DCursor(state: {
  measureMode: boolean;
  selectMode: string;
  currentTool: string;
  draggedNodeId: number | null;
  hoveredNodeId: number | null;
}): string {
  if (state.measureMode || state.selectMode === 'stress') return 'crosshair';
  if (state.currentTool === 'select') {
    if (state.draggedNodeId !== null) return 'grabbing';
    if (state.hoveredNodeId !== null) return 'grab';
    return 'default';
  }
  if (state.currentTool === 'node' || state.currentTool === 'element') return 'crosshair';
  if (state.currentTool === 'support' || state.currentTool === 'load') return 'pointer';
  if (state.currentTool === 'pan') return 'grab';
  return 'default';
}
