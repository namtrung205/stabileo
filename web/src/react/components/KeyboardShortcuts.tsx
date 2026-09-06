import { useEffect, useRef } from 'react';
import { runSolve } from '../../lib/actions/solve';
import { hasExplicitLocalY, pickElement3DMetadata } from '../../lib/model/element-3d-metadata';
import { historyStore, modelStore, resultsStore, uiStore } from '../../lib/store';
import { resolveDeleteTargets } from '../../lib/store/delete-selection';
import { loadFile, saveProject, saveSession } from '../../lib/store/file';
import type { ClipboardData } from '../../lib/store/ui';
import { TOOL_KEYS } from '../../lib/tool-keys';
import { t } from '../../lib/i18n/store';

const TOOL_TAB_INDEX: Record<string, number> = { node: 0, element: 1, support: 2, load: 3 };

function syncDataTabWithTool(toolId: string) {
  const index = TOOL_TAB_INDEX[toolId];
  if (index === undefined) return;
  const button = document.querySelector('.data-table .tabs')?.children[index] as HTMLButtonElement | undefined;
  button?.click();
}

function zoomToFit() {
  if (modelStore.nodes.size === 0) return;
  const canvas = document.querySelector('.viewport-container canvas') as HTMLCanvasElement | null;
  if (canvas) uiStore.zoomToFit(modelStore.nodes.values(), canvas.width, canvas.height);
}

function copySelection() {
  const nodeIds = new Set<number>(uiStore.selectedNodes);
  for (const elementId of uiStore.selectedElements) {
    const element = modelStore.elements.get(elementId);
    if (element) { nodeIds.add(element.nodeI); nodeIds.add(element.nodeJ); }
  }
  if (nodeIds.size === 0) return;

  const nodes: ClipboardData['nodes'] = [];
  for (const id of nodeIds) {
    const node = modelStore.getNode(id);
    if (node) nodes.push({ origId: node.id, x: node.x, y: node.y, z: node.z ?? 0 });
  }

  const elements: ClipboardData['elements'] = [];
  for (const element of modelStore.elements.values()) {
    if (nodeIds.has(element.nodeI) && nodeIds.has(element.nodeJ)) {
      elements.push({
        origNodeI: element.nodeI,
        origNodeJ: element.nodeJ,
        type: element.type,
        materialId: element.materialId,
        sectionId: element.sectionId,
        releaseI: element.releaseI,
        releaseJ: element.releaseJ,
        ...pickElement3DMetadata(element),
      });
    }
  }

  const supports: ClipboardData['supports'] = [];
  for (const support of modelStore.supports.values()) {
    if (nodeIds.has(support.nodeId)) supports.push({ origNodeId: support.nodeId, type: support.type as never });
  }
  uiStore.clipboard = { nodes, elements, supports };
}

function pasteSelection() {
  const clipboard = uiStore.clipboard;
  if (!clipboard || clipboard.nodes.length === 0) return;
  const is3D = uiStore.analysisMode === '3d' || uiStore.analysisMode === 'pro';
  const offsetX = is3D ? 0 : 1;
  const offsetY = is3D ? 0 : 1;
  const offsetZ = is3D ? 3 : 0;
  const idMap = new Map<number, number>();
  const pastedElements: number[] = [];

  modelStore.batch(() => {
    for (const node of clipboard.nodes) {
      idMap.set(node.origId, modelStore.addNode(node.x + offsetX, node.y + offsetY, (node.z ?? 0) + offsetZ));
    }
    for (const element of clipboard.elements) {
      const nodeI = idMap.get(element.origNodeI);
      const nodeJ = idMap.get(element.origNodeJ);
      if (nodeI == null || nodeJ == null) return;
      const materialId = modelStore.materials.has(element.materialId) ? element.materialId : 1;
      const sectionId = modelStore.sections.has(element.sectionId) ? element.sectionId : 1;
      const newId = modelStore.addElement(nodeI, nodeJ, element.type);
      modelStore.updateElementMaterial(newId, materialId);
      modelStore.updateElementSection(newId, sectionId);
      if (element.releaseI?.mz === true) modelStore.toggleHinge(newId, 'start');
      if (element.releaseJ?.mz === true) modelStore.toggleHinge(newId, 'end');
      if (hasExplicitLocalY(element)) modelStore.updateElementLocalY(newId, element.localYx, element.localYy, element.localYz);
      if (element.rollAngle !== undefined && Math.abs(element.rollAngle) > 1e-9) modelStore.rotateElementLocalAxes(newId, element.rollAngle);
      pastedElements.push(newId);
    }
    for (const support of clipboard.supports) {
      const nodeId = idMap.get(support.origNodeId);
      if (nodeId != null) modelStore.addSupport(nodeId, support.type);
    }
  });
  uiStore.setSelection(new Set(idMap.values()), new Set(pastedElements), true);
}

/** Global Basic-mode keyboard layer. This is intentionally outside the legacy
 * Svelte editor tree so shortcuts remain mounted as editor shells migrate. */
export function KeyboardShortcuts() {
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') return;
      const key = event.key.toUpperCase();

      if ((event.ctrlKey || event.metaKey) && key === 'S' && event.shiftKey) {
        event.preventDefault(); saveSession(); return;
      }
      if ((event.ctrlKey || event.metaKey) && key === 'S') {
        event.preventDefault(); saveProject(); return;
      }
      if ((event.ctrlKey || event.metaKey) && key === 'O') {
        event.preventDefault(); fileInput.current?.click(); return;
      }
      if ((event.ctrlKey || event.metaKey) && key === 'Z' && !event.shiftKey) {
        event.preventDefault(); historyStore.undo(); return;
      }
      if ((event.ctrlKey || event.metaKey) && (key === 'Y' || (key === 'Z' && event.shiftKey))) {
        event.preventDefault(); historyStore.redo(); return;
      }
      if ((event.ctrlKey || event.metaKey) && key === 'A') {
        event.preventDefault();
        uiStore.setSelection(new Set(modelStore.nodes.keys()), new Set(modelStore.elements.keys()), true);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && key === 'C') {
        event.preventDefault(); copySelection(); return;
      }
      if ((event.ctrlKey || event.metaKey) && key === 'X') {
        event.preventDefault();
        copySelection();
        const nodes = [...uiStore.selectedNodes];
        const elements = [...uiStore.selectedElements];
        modelStore.batch(() => {
          for (const nodeId of nodes) modelStore.removeNode(nodeId);
          for (const elementId of elements) modelStore.removeElement(elementId);
        });
        uiStore.clearSelection();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && key === 'V') {
        event.preventDefault(); pasteSelection(); return;
      }
      if (event.key === '+' || event.key === '=') { uiStore.zoom *= 1.2; return; }
      if (event.key === '-') { uiStore.zoom *= 0.8; return; }
      if (key === 'F') {
        if (uiStore.analysisMode === '3d') window.dispatchEvent(new Event('stabileo-zoom-to-fit'));
        else zoomToFit();
        return;
      }

      const tool = !event.ctrlKey && !event.metaKey ? TOOL_KEYS.find((item) => item.key === key) : undefined;
      if (tool) {
        event.preventDefault();
        uiStore.currentTool = tool.id;
        syncDataTabWithTool(tool.id);
        return;
      }

      if (resultsStore.results || resultsStore.results3D) {
        const is3D = uiStore.analysisMode === '3d';
        switch (event.key) {
          case '0': resultsStore.diagramType = 'none'; return;
          case '1': resultsStore.diagramType = 'deformed'; return;
          case '2': resultsStore.diagramType = is3D ? 'shearZ' : 'shear'; return;
          case '3': resultsStore.diagramType = is3D ? 'momentY' : 'moment'; return;
          case '4': if (is3D) resultsStore.diagramType = 'shearY'; return;
          case '5': if (is3D) resultsStore.diagramType = 'momentZ'; return;
          case '6': if (is3D) resultsStore.diagramType = 'torsion'; return;
          case '7': resultsStore.diagramType = 'axial'; return;
          case '8': resultsStore.diagramType = 'axialColor'; return;
          case '9': resultsStore.diagramType = 'colorMap'; return;
        }
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (uiStore.selectedSupports.size > 0) {
          const supports = [...uiStore.selectedSupports];
          modelStore.batch(() => { for (const id of supports) modelStore.removeSupport(id); });
          uiStore.clearSelectedSupports(); resultsStore.clear(); return;
        }
        if (uiStore.selectedLoads.size > 0) {
          const loads = [...uiStore.selectedLoads];
          modelStore.batch(() => { for (const id of loads) modelStore.removeLoad(id); });
          uiStore.clearSelectedLoads(); resultsStore.clear();
        } else if (uiStore.selectedNodes.size > 0 || uiStore.selectedElements.size > 0 || uiStore.selectedShells.size > 0) {
          const targets = resolveDeleteTargets(
            { nodes: uiStore.selectedNodes, elements: uiStore.selectedElements, shells: uiStore.selectedShells },
            (id) => modelStore.elements.has(id),
          );
          modelStore.deleteEntities(targets);
          uiStore.clearSelection(); resultsStore.clear();
        }
        return;
      }
      if (event.key === 'Escape') {
        uiStore.currentTool = 'select'; uiStore.clearSelection();
        uiStore.editingNodeId = null; uiStore.editingElementId = null; return;
      }
      if (event.key === '?' || (event.shiftKey && key === '/')) { uiStore.showHelp = !uiStore.showHelp; return; }
      if (key === 'G') {
        if (uiStore.analysisMode === '3d') uiStore.showGrid3D = !uiStore.showGrid3D;
        else uiStore.showGrid = !uiStore.showGrid;
        return;
      }
      if (key === 'H' && !event.ctrlKey && !event.metaKey) {
        if (uiStore.analysisMode === '3d') uiStore.showAxes3D = !uiStore.showAxes3D;
        else uiStore.showAxes = !uiStore.showAxes;
        return;
      }
      if (event.key === 'Enter') { event.preventDefault(); runSolve(); }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return <input ref={fileInput} type="file" accept=".ded,.json" hidden onChange={async (event) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const result = await loadFile(file);
      if (result.type === 'session') uiStore.toast(t('toast.sessionRestored').replace('{n}', String(result.count)), 'success');
    } catch (error) {
      alert(error instanceof Error ? error.message : t('toast.loadFileError'));
    }
    input.value = '';
  }} />;
}
