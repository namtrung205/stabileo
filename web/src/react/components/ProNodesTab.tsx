import { useEffect, useState, useSyncExternalStore } from 'react';
import { localeExternalStore, t } from '../../lib/i18n/store.svelte';
import { TWO_D_VERTICAL_AXIS_LABEL } from '../../lib/geometry/coordinate-system';
import { modelStore, uiStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';
import './ProNodesTab.css';

interface NodeRow {
  id: number | null;
  x: string;
  y: string;
  z: string;
}

const rowsFromStore = (): NodeRow[] => [...modelStore.nodes.values()].map((node) => ({
  id: node.id,
  x: String(node.x),
  y: String(node.y),
  z: String(node.z ?? 0),
}));

const parseNumber = (value: string): number | null => {
  const parsed = Number.parseFloat(value.trim().replace(',', '.'));
  return Number.isNaN(parsed) ? null : parsed;
};

/** React-owned PRO node table with the legacy CRUD, paste and selection contracts. */
export function ProNodesTab() {
  const modelRevision = useStoreRevision(modelStore);
  const uiRevision = useStoreRevision(uiStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const [rows, setRows] = useState<NodeRow[]>(rowsFromStore);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [selectedRowIdx, setSelectedRowIdx] = useState<number | null>(null);

  useEffect(() => {
    setRows((current) => {
      const storeRows = rowsFromStore();
      const savedRows = current.filter((row) => row.id !== null);
      const unsavedRows = current.filter((row) => row.id === null);
      const storeIds = storeRows.map((row) => row.id).join(',');
      const rowIds = savedRows.map((row) => row.id).join(',');
      return storeIds !== rowIds || storeRows.length !== savedRows.length
        ? [...storeRows, ...unsavedRows]
        : current;
    });
  }, [modelRevision]);

  useEffect(() => {
    if (uiStore.selectedNodes.size !== 1) return;
    const nodeId = [...uiStore.selectedNodes][0];
    const index = rows.findIndex((row) => row.id === nodeId);
    if (index >= 0) setSelectedRowIdx(index);
  }, [uiRevision, rows]);

  const updateCell = (index: number, column: 'x' | 'y' | 'z', value: string) => {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [column]: value } : row));
  };

  const addEmptyRow = () => setRows((current) => [...current, { id: null, x: '', y: '', z: '' }]);

  const commitRow = (index: number) => {
    const row = rows[index];
    if (!row) return;
    const x = parseNumber(row.x);
    const y = parseNumber(row.y);
    const z = row.z.trim() === '' ? 0 : parseNumber(row.z);
    if (x === null || y === null || z === null) return;
    if (row.id === null) {
      const id = modelStore.addNode(x, y, z);
      setRows((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, id } : item));
    } else {
      modelStore.updateNode(row.id, x, y, z);
    }
  };

  const deleteRow = (index: number) => {
    const row = rows[index];
    if (row?.id !== null && row?.id !== undefined) modelStore.removeNode(row.id);
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key !== 'Enter') return;
    commitRow(index);
    if (index === rows.length - 1) {
      addEmptyRow();
      setTimeout(() => {
        const inputs = document.querySelectorAll<HTMLInputElement>('.pro-nodes-table input[data-col="x"]');
        inputs[inputs.length - 1]?.focus();
      }, 10);
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const text = event.clipboardData.getData('text');
    if (!text || (!text.includes('\t') && !text.includes('\n'))) return;
    event.preventDefault();
    setPasteError(null);
    const lines = text.trim().split('\n').filter((line) => line.trim());
    const pastedRows: NodeRow[] = [];
    for (let index = 0; index < lines.length; index++) {
      const parts = lines[index].split('\t').map((part) => part.trim());
      if (parts.length < 2) {
        setPasteError(t('pro.pasteRowError').replace('{n}', String(index + 1)).replace('{cols}', '2').replace('{names}', 'X, Y'));
        return;
      }
      const x = parseNumber(parts[0]);
      const y = parseNumber(parts[1]);
      const z = parts.length >= 3 ? parseNumber(parts[2]) : 0;
      if (x === null || y === null) {
        setPasteError(t('pro.pasteInvalidNum').replace('{n}', String(index + 1)));
        return;
      }
      const id = modelStore.addNode(x, y, z ?? 0);
      pastedRows.push({ id, x: String(x), y: String(y), z: String(z ?? 0) });
    }
    setRows((current) => [...current.filter((row) => row.id !== null), ...pastedRows]);
    setPasteError(null);
  };

  const selectRow = (index: number) => {
    setSelectedRowIdx(index);
    const row = rows[index];
    if (row?.id === null || row?.id === undefined) return;
    uiStore.selectMode = 'nodes';
    uiStore.setSelection(new Set([row.id]), new Set());
  };

  const commitAll = () => rows.forEach((_, index) => commitRow(index));
  const clearAll = () => {
    for (const row of rows) if (row.id !== null) modelStore.removeNode(row.id);
    setRows([]);
  };
  const nodeCount = rows.filter((row) => row.id !== null).length;
  const verticalLabel = uiStore.analysisMode === '3d' || uiStore.analysisMode === 'pro'
    ? 'Y'
    : TWO_D_VERTICAL_AXIS_LABEL;

  return <div className="pro-nodes">
    <div className="pro-nodes-header">
      <span className="pro-nodes-count">{t('pro.nNodes').replace('{n}', String(nodeCount))}</span>
      <div className="pro-nodes-actions">
        <button className="pro-btn" onClick={addEmptyRow}>{t('pro.addNode')}</button>
        <button className="pro-btn pro-btn-sm" onClick={commitAll} title={t('pro.apply')}>{t('pro.apply')}</button>
        <button className="pro-btn pro-btn-sm pro-btn-danger" onClick={clearAll} title={t('pro.clear')}>{t('pro.clear')}</button>
      </div>
    </div>
    {pasteError && <div className="pro-paste-error">{pasteError}</div>}
    <div className="pro-paste-hint">{t('pro.pasteHintNodes')}</div>
    <div className="pro-nodes-table-wrap" onPaste={handlePaste}>
      <table className="pro-nodes-table">
        <thead><tr>
          <th className="col-id">ID</th>
          <th className="col-coord">X (m)</th>
          <th className="col-coord">{verticalLabel} (m)</th>
          <th className="col-coord">Z (m)</th>
          <th className="col-actions" />
        </tr></thead>
        <tbody>
          {rows.map((row, index) => <tr key={row.id ?? `new-${index}`}
            className={`${selectedRowIdx === index ? 'selected ' : ''}${row.id === null ? 'unsaved' : ''}`.trim()}
            onClick={() => selectRow(index)}>
            <td className="col-id">{row.id ?? '—'}</td>
            {(['x', 'y', 'z'] as const).map((column) => <td className="col-coord" key={column}>
              <input type="text" data-col={column} value={row[column]}
                onChange={(event) => updateCell(index, column, event.currentTarget.value)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                onBlur={() => commitRow(index)} placeholder="0" />
            </td>)}
            <td className="col-actions">
              <button className="pro-delete-btn" onClick={() => deleteRow(index)} title={t('pro.delete')}>×</button>
            </td>
          </tr>)}
          {rows.length === 0 && <tr><td colSpan={5} className="pro-empty">{t('pro.emptyNodes')}</td></tr>}
        </tbody>
      </table>
    </div>
  </div>;
}
