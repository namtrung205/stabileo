import { useState, useSyncExternalStore } from 'react';
import { TWO_D_HORIZONTAL_AXIS_LABEL, TWO_D_VERTICAL_AXIS_LABEL } from '../../lib/geometry/coordinate-system';
import { localeExternalStore, t } from '../../lib/i18n/store.svelte';
import { historyStore, modelStore, resultsStore, uiStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';
import './EditorTables.css';

export function NodesTable() {
  useStoreRevision(modelStore); useStoreRevision(resultsStore); useStoreRevision(uiStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const [newNodeX, setNewNodeX] = useState(0);
  const [newNodeY, setNewNodeY] = useState(0);
  const [newNodeZ, setNewNodeZ] = useState(0);
  const nodes = [...modelStore.nodes.values()];
  const is3D = uiStore.analysisMode === '3d';

  function updateNode(id: number, axis: 'x' | 'y' | 'z', raw: string) {
    const value = parseFloat(raw); const node = modelStore.getNode(id);
    if (Number.isNaN(value) || !node || (node[axis] ?? 0) === value) return;
    historyStore.pushState();
    if (axis === 'z') modelStore.updateNodeZ(id, value);
    else modelStore.updateNode(id, axis === 'x' ? value : node.x, axis === 'y' ? value : node.y);
    resultsStore.clear();
  }

  function addNode() {
    historyStore.pushState();
    if (is3D) modelStore.addNode(newNodeX, newNodeY, newNodeZ); else modelStore.addNode(newNodeX, newNodeY);
    resultsStore.clear();
  }

  return <div className="editor-data-grid react-nodes-table">
    {nodes.length > 0 && <table><thead><tr><th>ID</th><th>{TWO_D_HORIZONTAL_AXIS_LABEL} (m)</th><th>{is3D ? 'Y' : TWO_D_VERTICAL_AXIS_LABEL} (m)</th>{is3D && <th>Z (m)</th>}<th /></tr></thead><tbody>
      {nodes.map((node) => <tr key={node.id}><td className="id-cell">{node.id}</td><td><input type="number" step="0.001" defaultValue={node.x.toFixed(3)} onChange={(event) => updateNode(node.id, 'x', event.currentTarget.value)} /></td><td><input type="number" step="0.001" defaultValue={node.y.toFixed(3)} onChange={(event) => updateNode(node.id, 'y', event.currentTarget.value)} /></td>{is3D && <td><input type="number" step="0.001" defaultValue={(node.z ?? 0).toFixed(3)} onChange={(event) => updateNode(node.id, 'z', event.currentTarget.value)} /></td>}<td><button className="del" onClick={() => modelStore.removeNode(node.id)}>✕</button></td></tr>)}
    </tbody></table>}
    <div className="table-footer"><div className="add-row"><span className="add-label">{TWO_D_HORIZONTAL_AXIS_LABEL}:</span><input type="number" step="0.5" value={newNodeX} onChange={(event) => setNewNodeX(Number(event.currentTarget.value))} className="add-input" /><span className="add-label">{is3D ? 'Y' : TWO_D_VERTICAL_AXIS_LABEL}:</span><input type="number" step="0.5" value={newNodeY} onChange={(event) => setNewNodeY(Number(event.currentTarget.value))} className="add-input" />{is3D && <><span className="add-label">Z:</span><input type="number" step="0.5" value={newNodeZ} onChange={(event) => setNewNodeZ(Number(event.currentTarget.value))} className="add-input" /></>}<button className="add-btn" onClick={addNode}>{t('table.addNode')}</button></div></div>
  </div>;
}
