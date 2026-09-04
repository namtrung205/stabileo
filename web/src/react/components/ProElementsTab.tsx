import { useEffect, useState, useSyncExternalStore } from 'react';
import { arcPolyline } from '../../lib/engine/curved-beam';
import { localeExternalStore, t } from '../../lib/i18n/store.svelte';
import { modelStore, uiStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';
import './ProElementsTab.css';

interface ElementRow {
  id: number | null;
  nodeI: string;
  nodeJ: string;
  materialId: number;
  sectionId: number;
  hingeI: boolean;
  hingeJ: boolean;
}

const rowsFromStore = (): ElementRow[] => [...modelStore.elements.values()].map((element) => ({
  id: element.id,
  nodeI: String(element.nodeI),
  nodeJ: String(element.nodeJ),
  materialId: element.materialId,
  sectionId: element.sectionId,
  hingeI: element.releaseI?.mz === true,
  hingeJ: element.releaseJ?.mz === true,
}));
const emptyRow = (): ElementRow => ({ id: null, nodeI: '', nodeJ: '', materialId: 1, sectionId: 1, hingeI: false, hingeJ: false });

/** React-owned PRO frame/member table and curved-member generator. */
export function ProElementsTab() {
  const modelRevision = useStoreRevision(modelStore);
  const uiRevision = useStoreRevision(uiStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const [rows, setRows] = useState<ElementRow[]>(rowsFromStore);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [selectedRowIdx, setSelectedRowIdx] = useState<number | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [drawNodeI, setDrawNodeI] = useState<number | null>(null);
  const [showCurved, setShowCurved] = useState(false);
  const [curvedNodes, setCurvedNodes] = useState<[string, string, string]>(['', '', '']);
  const [curvedSegments, setCurvedSegments] = useState(6);
  const [curvedMaterialId, setCurvedMaterialId] = useState(1);
  const [curvedSectionId, setCurvedSectionId] = useState(1);
  const [curvedError, setCurvedError] = useState<string | null>(null);
  const [curvedSuccess, setCurvedSuccess] = useState<string | null>(null);
  const is3DMode = uiStore.analysisMode === '3d' || uiStore.analysisMode === 'pro';
  const materials = [...modelStore.materials.values()];
  const sections = [...modelStore.sections.values()];

  useEffect(() => {
    setRows((current) => {
      const storeRows = rowsFromStore();
      const savedRows = current.filter((row) => row.id !== null);
      const unsavedRows = current.filter((row) => row.id === null);
      return storeRows.map((row) => row.id).join(',') !== savedRows.map((row) => row.id).join(',')
        || storeRows.length !== savedRows.length ? [...storeRows, ...unsavedRows] : current;
    });
  }, [modelRevision]);

  useEffect(() => {
    if (!drawMode) { setDrawNodeI(null); return; }
    if (uiStore.selectedNodes.size !== 1) return;
    const nodeId = [...uiStore.selectedNodes][0];
    if (drawNodeI === null) { setDrawNodeI(nodeId); return; }
    if (nodeId === drawNodeI) return;
    const id = modelStore.addElement(drawNodeI, nodeId);
    setRows((current) => [...current, { ...emptyRow(), id, nodeI: String(drawNodeI), nodeJ: String(nodeId) }]);
    setDrawNodeI(nodeId);
    uiStore.setSelection(new Set(), new Set());
  }, [drawMode, drawNodeI, uiRevision]);

  useEffect(() => {
    if (uiStore.selectedElements.size !== 1) return;
    const elementId = [...uiStore.selectedElements][0];
    const index = rows.findIndex((row) => row.id === elementId);
    if (index >= 0) setSelectedRowIdx(index);
  }, [uiRevision, rows]);

  const commitRowData = (row: ElementRow, index: number) => {
    const nodeI = Number.parseInt(row.nodeI);
    const nodeJ = Number.parseInt(row.nodeJ);
    if (Number.isNaN(nodeI) || Number.isNaN(nodeJ) || nodeI === nodeJ) return;
    if (!modelStore.nodes.has(nodeI) || !modelStore.nodes.has(nodeJ)) return;
    if (row.id === null) {
      const id = modelStore.addElement(nodeI, nodeJ);
      modelStore.updateElementMaterial(id, row.materialId);
      modelStore.updateElementSection(id, row.sectionId);
      if (row.hingeI) modelStore.toggleHinge(id, 'start');
      if (row.hingeJ) modelStore.toggleHinge(id, 'end');
      setRows((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, id } : item));
      return;
    }
    const element = modelStore.elements.get(row.id);
    if (!element) return;
    modelStore.updateElementMaterial(row.id, row.materialId);
    modelStore.updateElementSection(row.id, row.sectionId);
    if ((element.releaseI?.mz === true) !== row.hingeI) modelStore.toggleHinge(row.id, 'start');
    if ((element.releaseJ?.mz === true) !== row.hingeJ) modelStore.toggleHinge(row.id, 'end');
  };
  const commitRow = (index: number) => { const row = rows[index]; if (row) commitRowData(row, index); };
  const patchRow = (index: number, patch: Partial<ElementRow>, commit = false) => {
    const next = { ...rows[index], ...patch };
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? next : row));
    if (commit && next.id !== null) commitRowData(next, index);
  };
  const deleteRow = (index: number) => {
    const row = rows[index];
    if (row?.id !== null && row?.id !== undefined) modelStore.removeElement(row.id);
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key !== 'Enter') return;
    commitRow(index);
    if (index === rows.length - 1) {
      setRows((current) => [...current, emptyRow()]);
      setTimeout(() => {
        const inputs = document.querySelectorAll<HTMLInputElement>('.pro-elems-table input[data-col="ni"]');
        inputs[inputs.length - 1]?.focus();
      }, 10);
    }
  };
  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const text = event.clipboardData.getData('text');
    if (!text || (!text.includes('\t') && !text.includes('\n'))) return;
    event.preventDefault(); setPasteError(null);
    for (const [index, line] of text.trim().split('\n').filter((item) => item.trim()).entries()) {
      const parts = line.split('\t').map((part) => part.trim());
      if (parts.length < 2) {
        setPasteError(t('pro.pasteRowError').replace('{n}', String(index + 1)).replace('{cols}', '2').replace('{names}', `${t('pro.thNodeI')}, ${t('pro.thNodeJ')}`)); return;
      }
      const nodeI = Number.parseInt(parts[0]); const nodeJ = Number.parseInt(parts[1]);
      if (Number.isNaN(nodeI) || Number.isNaN(nodeJ)) { setPasteError(t('pro.pasteInvalidNodeIds').replace('{n}', String(index + 1))); return; }
      if (!modelStore.nodes.has(nodeI) || !modelStore.nodes.has(nodeJ)) {
        setPasteError(t('pro.pasteNodeNotExist').replace('{n}', String(index + 1)).replace('{ni}', String(nodeI)).replace('{nj}', String(nodeJ))); return;
      }
      const id = modelStore.addElement(nodeI, nodeJ);
      setRows((current) => [...current, { ...emptyRow(), id, nodeI: String(nodeI), nodeJ: String(nodeJ) }]);
    }
  };
  const selectRow = (index: number) => {
    setSelectedRowIdx(index);
    const row = rows[index];
    if (row?.id === null || row?.id === undefined) return;
    uiStore.selectMode = 'elements';
    uiStore.setSelection(new Set(), new Set([row.id]), true);
  };
  const toggleDrawMode = () => {
    setDrawMode((active) => !active);
    setDrawNodeI(null);
    if (!drawMode) uiStore.setSelection(new Set(), new Set());
  };

  const generateCurvedMember = () => {
    setCurvedError(null); setCurvedSuccess(null);
    const ids = curvedNodes.map((value) => Number.parseInt(value));
    if (ids.some(Number.isNaN) || new Set(ids).size !== 3 || ids.some((id) => !modelStore.nodes.has(id))) { setCurvedError(t('pro.curvedErr3Nodes')); return; }
    if (curvedSegments < 2) { setCurvedError(t('pro.curvedErrSegments')); return; }
    if (!modelStore.materials.has(curvedMaterialId) || !modelStore.sections.has(curvedSectionId)) { setCurvedError(t('pro.curvedErrMatSec')); return; }
    const [start, middle, end] = ids.map((id) => modelStore.nodes.get(id)!);
    const points = arcPolyline(
      { x: start.x, y: start.y, z: start.z ?? 0 },
      { x: middle.x, y: middle.y, z: middle.z ?? 0 },
      { x: end.x, y: end.y, z: end.z ?? 0 }, curvedSegments,
    );
    const nodeIds = [ids[0]];
    for (let index = 1; index < points.length - 1; index++) nodeIds.push(modelStore.addNode(points[index].x, points[index].y, points[index].z !== 0 ? points[index].z : undefined));
    nodeIds.push(ids[2]);
    let made = 0;
    for (let index = 0; index < nodeIds.length - 1; index++) {
      const elementId = modelStore.addElement(nodeIds[index], nodeIds[index + 1], 'frame');
      modelStore.updateElementMaterial(elementId, curvedMaterialId);
      modelStore.updateElementSection(elementId, curvedSectionId);
      made++;
    }
    setCurvedSuccess(t('pro.curvedMemberSuccess').replace('{frames}', String(made)).replace('{nodes}', String(nodeIds.length - 2)));
    setCurvedNodes(['', '', '']);
  };

  const elementCount = rows.filter((row) => row.id !== null).length;
  const hingeTitle = is3DMode ? t('prop.hinge3DDisclosure') : '';
  const hingeSuffix = is3DMode ? ` ${t('prop.hinges3DSuffix')}` : '';
  return <div className="pro-elems">
    {uiStore.selectedElements.size > 0 && <div className="pro-member-offset-wrap"><span className="react-pro-member-offset-slot" /></div>}
    <div className="pro-elems-header"><span className="pro-elems-count">{t('pro.nElements').replace('{n}', String(elementCount))}</span>
      <div className="pro-elems-actions"><button className="pro-btn" onClick={() => setRows((current) => [...current, emptyRow()])}>{t('pro.addElement')}</button>
        <button className={`pro-btn ${drawMode ? 'pro-btn-active' : ''}`} onClick={toggleDrawMode}>{drawMode ? t('pro.stopDrawing') : t('pro.draw')}</button></div>
    </div>
    {drawMode && <div className="pro-draw-status">{drawNodeI === null ? t('pro.drawClickNodeI')
      : <span dangerouslySetInnerHTML={{ __html: t('pro.drawNodeISelected').replace('{id}', String(drawNodeI)) }} />}</div>}
    {pasteError && <div className="pro-paste-error">{pasteError}</div>}
    <div className="pro-paste-hint">{t('pro.pasteHintElems')}</div>
    <div className="pro-elems-table-wrap" onPaste={handlePaste}><table className="pro-elems-table">
      <thead><tr><th className="col-id">ID</th><th className="col-node">{t('pro.thNodeI')}</th><th className="col-node">{t('pro.thNodeJ')}</th>
        <th className="col-mat">{t('pro.thMaterial')}</th><th className="col-sec">{t('pro.thSection')}</th>
        <th className="col-hinge" title={hingeTitle}>{t('pro.thHingeI')}{hingeSuffix}</th><th className="col-hinge" title={hingeTitle}>{t('pro.thHingeJ')}{hingeSuffix}</th><th className="col-actions" /></tr></thead>
      <tbody>{rows.map((row, index) => <tr key={row.id ?? `new-${index}`} className={`${selectedRowIdx === index ? 'selected ' : ''}${row.id === null ? 'unsaved' : ''}`.trim()} onClick={() => selectRow(index)}>
        <td className="col-id">{row.id ?? '—'}</td>
        {(['nodeI', 'nodeJ'] as const).map((key) => <td className="col-node" key={key}><input type="text" data-col={key === 'nodeI' ? 'ni' : 'nj'} value={row[key]}
          onChange={(event) => patchRow(index, { [key]: event.currentTarget.value })} onKeyDown={(event) => handleKeyDown(event, index)} onBlur={() => commitRow(index)} placeholder="—" /></td>)}
        <td className="col-mat"><select value={String(row.materialId)} onChange={(event) => patchRow(index, { materialId: Number.parseInt(event.currentTarget.value) }, true)}>{materials.map((material) => <option value={String(material.id)} key={material.id}>{material.name}</option>)}</select></td>
        <td className="col-sec"><select value={String(row.sectionId)} onChange={(event) => patchRow(index, { sectionId: Number.parseInt(event.currentTarget.value) }, true)}>{sections.map((section) => <option value={String(section.id)} key={section.id}>{section.name}</option>)}</select></td>
        <td className="col-hinge"><button className={`hinge-btn ${row.hingeI ? 'hinged' : ''}`} onClick={() => patchRow(index, { hingeI: !row.hingeI }, true)}>{row.hingeI ? t('pro.hingeArt') : t('pro.hingeEmp')}</button></td>
        <td className="col-hinge"><button className={`hinge-btn ${row.hingeJ ? 'hinged' : ''}`} onClick={() => patchRow(index, { hingeJ: !row.hingeJ }, true)}>{row.hingeJ ? t('pro.hingeArt') : t('pro.hingeEmp')}</button></td>
        <td className="col-actions"><button className="pro-delete-btn" onClick={() => deleteRow(index)}>×</button></td>
      </tr>)}{rows.length === 0 && <tr><td colSpan={8} className="pro-empty">{t('pro.emptyElements')}</td></tr>}</tbody>
    </table></div>
    <div className="curved-section"><button className="curved-toggle" onClick={() => setShowCurved(!showCurved)}><span>{showCurved ? '▾' : '▸'}</span> {t('pro.curvedMembers')}</button>
      {showCurved && <div className="curved-body"><div className="curved-hint">{t('pro.curvedMembersHint')}</div>
        <div className="curved-row"><label>{t('pro.startMidEnd')}</label>{curvedNodes.map((value, index) => <input type="text" value={value} placeholder={['start', 'mid', 'end'][index]} key={index}
          onChange={(event) => setCurvedNodes(curvedNodes.map((item, itemIndex) => itemIndex === index ? event.currentTarget.value : item) as [string, string, string])} />)}</div>
        <div className="curved-row"><label>{t('pro.segments')}</label><input type="number" value={curvedSegments} min={2} max={100} onChange={(event) => setCurvedSegments(Number(event.currentTarget.value))} /></div>
        <div className="curved-row"><label>{t('pro.material')}</label><select value={curvedMaterialId} onChange={(event) => setCurvedMaterialId(Number(event.currentTarget.value))}>{materials.map((material) => <option value={material.id} key={material.id}>{material.name}</option>)}</select></div>
        <div className="curved-row"><label>{t('pro.section')}</label><select value={curvedSectionId} onChange={(event) => setCurvedSectionId(Number(event.currentTarget.value))}>{sections.map((section) => <option value={section.id} key={section.id}>{section.name}</option>)}</select></div>
        {curvedError && <div className="curved-error">{curvedError}</div>}{curvedSuccess && <div className="curved-success">{curvedSuccess}</div>}
        <button className="pro-btn pro-btn-active" onClick={generateCurvedMember}>{t('pro.generateCurvedMember')}</button>
      </div>}
    </div>
  </div>;
}
