import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { TWO_D_HORIZONTAL_AXIS_LABEL, TWO_D_VERTICAL_AXIS_LABEL } from '../../lib/geometry/coordinate-system';
import { localeExternalStore, t } from '../../lib/i18n/store.svelte';
import { historyStore, modelStore, resultsStore, uiStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';
import './NodeEditor.css';

export function NodeEditor() {
  useStoreRevision(uiStore);
  useStoreRevision(modelStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const inputX = useRef<HTMLInputElement>(null);
  const [localX, setLocalX] = useState('');
  const [localY, setLocalY] = useState('');
  const nodeId = uiStore.editingNodeId;
  const node = nodeId !== null ? modelStore.getNode(nodeId) : null;
  const position = uiStore.editScreenPos;

  useEffect(() => {
    if (!node) return;
    setLocalX(node.x.toFixed(3));
    setLocalY(node.y.toFixed(3));
    const timer = window.setTimeout(() => inputX.current?.select(), 0);
    return () => window.clearTimeout(timer);
  }, [nodeId, node?.x, node?.y]);

  if (!node || nodeId === null) return null;
  const close = () => { uiStore.editingNodeId = null; };
  const confirm = () => {
    const x = Number.parseFloat(localX);
    const y = Number.parseFloat(localY);
    if (Number.isNaN(x) || Number.isNaN(y)) return;
    if (x !== node.x || y !== node.y) {
      historyStore.pushState();
      modelStore.updateNode(nodeId, x, y);
      resultsStore.clear();
    }
    close();
  };
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') { event.preventDefault(); confirm(); }
    else if (event.key === 'Escape') { event.preventDefault(); close(); }
    event.stopPropagation();
  };

  return <>
    <div className="node-editor-backdrop" onClick={close} />
    <div className="node-editor" style={{ left: position.x, top: position.y }}>
      <div className="node-editor-title">{t('editor.node')} {nodeId}</div>
      <label className="node-editor-field">
        <span>{TWO_D_HORIZONTAL_AXIS_LABEL} (m):</span>
        <input ref={inputX} type="number" step="0.001" value={localX} onChange={(event) => setLocalX(event.currentTarget.value)} onKeyDown={handleKeyDown} />
      </label>
      <label className="node-editor-field">
        <span>{TWO_D_VERTICAL_AXIS_LABEL} (m):</span>
        <input type="number" step="0.001" value={localY} onChange={(event) => setLocalY(event.currentTarget.value)} onKeyDown={handleKeyDown} />
      </label>
      <div className="node-editor-buttons">
        <button className="node-editor-ok" onClick={confirm}>OK</button>
        <button className="node-editor-cancel" onClick={close}>{t('editor.cancel')}</button>
      </div>
    </div>
  </>;
}
