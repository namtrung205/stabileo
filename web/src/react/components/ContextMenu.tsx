import { useState, useSyncExternalStore } from 'react';
import { localeExternalStore, t } from '../../lib/i18n/store.svelte';
import { modelStore, resultsStore, uiStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';
import './ContextMenu.css';

type ContextAction =
  | 'delete-support' | 'delete-node' | 'delete-element'
  | 'edit-node' | 'edit-element' | 'add-support' | 'add-load'
  | 'select-node' | 'select-element'
  | 'mirror-x' | 'mirror-y' | 'rotate-90' | 'rotate-neg90'
  | 'rotate-local-axes';

/** Editor context menu. It deliberately owns no Three.js state; viewport hit tests
 * publish their target through uiStore, exactly as they did for the Svelte view. */
export function ContextMenu() {
  useStoreRevision(uiStore);
  useStoreRevision(modelStore);
  useStoreRevision(resultsStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const [subdivCount, setSubdivCount] = useState(2);
  const context = uiStore.contextMenu;

  if (!context) return null;

  const close = () => { uiStore.contextMenu = null; };
  const act = (action: ContextAction) => {
    const ctx = uiStore.contextMenu;
    if (!ctx) return;
    uiStore.contextMenu = null;

    if (action === 'delete-support' && ctx.nodeId != null) {
      const support = [...modelStore.supports.values()].find((item) => item.nodeId === ctx.nodeId);
      if (support) { modelStore.removeSupport(support.id); resultsStore.clear(); }
    } else if (action === 'delete-node' && ctx.nodeId != null) {
      modelStore.removeNode(ctx.nodeId); resultsStore.clear();
    } else if (action === 'delete-element' && ctx.elementId != null) {
      modelStore.removeElement(ctx.elementId); resultsStore.clear();
    } else if (action === 'edit-node' && ctx.nodeId != null) {
      uiStore.editingNodeId = ctx.nodeId;
      uiStore.editScreenPos = { x: ctx.x, y: ctx.y };
    } else if (action === 'edit-element' && ctx.elementId != null) {
      uiStore.editingElementId = ctx.elementId;
      uiStore.editScreenPos = { x: ctx.x, y: ctx.y };
    } else if (action === 'add-support' && ctx.nodeId != null) {
      modelStore.addSupport(ctx.nodeId, uiStore.supportType as never);
    } else if (action === 'add-load' && ctx.nodeId != null) {
      modelStore.addNodalLoad(ctx.nodeId, 0, uiStore.loadValue);
    } else if (action === 'select-node' && ctx.nodeId != null) {
      uiStore.selectNode(ctx.nodeId);
    } else if (action === 'select-element' && ctx.elementId != null) {
      uiStore.selectElement(ctx.elementId);
    } else if (action === 'mirror-x') {
      modelStore.mirrorNodes(uiStore.selectedNodes, 'x'); resultsStore.clear();
    } else if (action === 'mirror-y') {
      modelStore.mirrorNodes(uiStore.selectedNodes, 'y'); resultsStore.clear();
    } else if (action === 'rotate-90') {
      modelStore.rotateNodes(uiStore.selectedNodes, 90); resultsStore.clear();
    } else if (action === 'rotate-neg90') {
      modelStore.rotateNodes(uiStore.selectedNodes, -90); resultsStore.clear();
    } else if (action === 'rotate-local-axes' && ctx.elementId != null) {
      modelStore.rotateElementLocalAxes(ctx.elementId, 90); resultsStore.clear();
    }
  };

  const subdivide = () => {
    const ctx = uiStore.contextMenu;
    if (!ctx?.elementId) return;
    modelStore.subdivideElement(ctx.elementId, Math.max(2, Math.min(20, Math.round(subdivCount))));
    resultsStore.clear();
    uiStore.contextMenu = null;
  };

  const nodeSupport = context.nodeId == null
    ? undefined
    : [...modelStore.supports.values()].find((support) => support.nodeId === context.nodeId);

  return <>
    <div className="ctx-backdrop" onClick={close} onContextMenu={(event) => { event.preventDefault(); close(); }} />
    <div className="ctx-menu" style={{ left: context.x, top: context.y }}>
      {context.nodeId != null ? <>
        <button className="ctx-item" onClick={() => act('select-node')}>{t('ctx.selectNode')}</button>
        <button className="ctx-item" onClick={() => act('edit-node')}>{t('ctx.editNode')}</button>
        <button className="ctx-item" onClick={() => act('add-support')}>{t('ctx.addSupport')}</button>
        <button className="ctx-item" onClick={() => act('add-load')}>{t('ctx.addLoad')}</button>
        {nodeSupport && <button className="ctx-item ctx-danger" onClick={() => act('delete-support')}>{t('ctx.deleteSupport')}</button>}
        <div className="ctx-divider" />
        <button className="ctx-item ctx-danger" onClick={() => act('delete-node')}>{t('ctx.deleteNode')}</button>
      </> : context.elementId != null ? <>
        <button className="ctx-item" onClick={() => act('select-element')}>{t('ctx.selectElement')}</button>
        <button className="ctx-item" onClick={() => act('edit-element')}>{t('ctx.editElement')}</button>
        <div className="ctx-divider" />
        <div className="ctx-subdivide-row">
          <span className="ctx-label">{t('ctx.subdivide')}</span>
          <input className="ctx-subdiv-input" type="number" min={2} max={20} value={subdivCount}
            onChange={(event) => setSubdivCount(event.currentTarget.valueAsNumber)}
            onKeyDown={(event) => { if (event.key === 'Enter') subdivide(); }} />
          <button className="ctx-subdiv-btn" onClick={subdivide}>OK</button>
        </div>
        {uiStore.analysisMode === '3d' && <>
          <div className="ctx-divider" />
          <button className="ctx-item" onClick={() => act('rotate-local-axes')}>{t('ctx.rotateBar90')}</button>
        </>}
        <div className="ctx-divider" />
        <button className="ctx-item ctx-danger" onClick={() => act('delete-element')}>{t('ctx.deleteElement')}</button>
      </> : uiStore.selectedNodes.size > 0 ? <>
        <span className="ctx-label">{t('ctx.transformSelection')} ({uiStore.selectedNodes.size})</span>
        <button className="ctx-item" onClick={() => act('mirror-x')}>{t('ctx.mirrorX')}</button>
        <button className="ctx-item" onClick={() => act('mirror-y')}>{t('ctx.mirrorY')}</button>
        <button className="ctx-item" onClick={() => act('rotate-90')}>{t('ctx.rotate90cw')}</button>
        <button className="ctx-item" onClick={() => act('rotate-neg90')}>{t('ctx.rotate90ccw')}</button>
      </> : <button className="ctx-item" disabled>{t('ctx.noElements')}</button>}
    </div>
  </>;
}
