import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { get2DDisplayNodalLoadMoment, get2DDisplayNodalLoadVertical } from '../../lib/geometry/coordinate-system';
import { localeExternalStore, t } from '../../lib/i18n/store';
import { historyStore, modelStore, resultsStore, uiStore } from '../../lib/store';
import type { DistributedLoad, DistributedLoad3D, NodalLoad, NodalLoad3D, PointLoadOnElement, ThermalLoad } from '../../lib/store/model';
import { useStoreRevision } from '../store/useStoreRevision';
import { CombosTable } from './CombosTable';
import './EditorTables.css';
import './LoadsTable.css';

type LoadType = 'nodal' | 'distributed' | 'pointOnElement' | 'thermal' | 'nodal3d' | 'distributed3d';

export function LoadsTable() {
  useStoreRevision(modelStore); useStoreRevision(resultsStore); useStoreRevision(uiStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const is3D = uiStore.analysisMode === '3d';
  const [loadType, setLoadType] = useState<LoadType>(is3D ? 'nodal3d' : 'nodal');
  const [targetId, setTargetId] = useState(0); const [caseId, setCaseId] = useState(1);
  const nodes = [...modelStore.nodes.values()]; const elements = [...modelStore.elements.values()];
  const field = (label: string, id: number, key: string, value: number, step = 1) => <span className="load-field" key={key}>{label}<input type="number" step={step} defaultValue={value} onChange={(event) => { const parsed = parseFloat(event.currentTarget.value); if (!Number.isNaN(parsed)) modelStore.updateLoad(id, { [key]: parsed }); }} /></span>;

  function values(load: (typeof modelStore.loads)[number]): ReactNode {
    if (load.type === 'nodal') { const item = load.data as NodalLoad; return <>{field('Fx', item.id, 'fx', item.fx)}{field('Fz', item.id, 'fz', get2DDisplayNodalLoadVertical(item))}{field('My', item.id, 'my', get2DDisplayNodalLoadMoment(item))}</>; }
    if (load.type === 'nodal3d') { const item = load.data as NodalLoad3D; return <>{field('Fx', item.id, 'fx', item.fx)}{field('Fy', item.id, 'fy', item.fy)}{field('Fz', item.id, 'fz', item.fz)}{field('Mx', item.id, 'mx', item.mx)}{field('My', item.id, 'my', item.my)}{field('Mz', item.id, 'mz', item.mz)}</>; }
    if (load.type === 'distributed') { const item = load.data as DistributedLoad; return <>{field('qI', item.id, 'qI', item.qI)}{field('qJ', item.id, 'qJ', item.qJ)}{field('a', item.id, 'a', item.a ?? 0, 0.1)}{field('b', item.id, 'b', item.b ?? modelStore.getElementLength(item.elementId), 0.1)}</>; }
    if (load.type === 'distributed3d') { const item = load.data as DistributedLoad3D; return <>{field('qYI', item.id, 'qYI', item.qYI)}{field('qYJ', item.id, 'qYJ', item.qYJ)}{field('qZI', item.id, 'qZI', item.qZI)}{field('qZJ', item.id, 'qZJ', item.qZJ)}</>; }
    if (load.type === 'thermal') { const item = load.data as ThermalLoad; return <>{field('ΔT', item.id, 'dtUniform', item.dtUniform, 5)}{field('ΔTg', item.id, 'dtGradient', item.dtGradient, 5)}</>; }
    const item = load.data as PointLoadOnElement; return <>{field('P', item.id, 'p', item.p)}{field('a', item.id, 'a', item.a, 0.01)}</>;
  }

  function target(load: (typeof modelStore.loads)[number]) { const item = load.data as unknown as { nodeId?: number; elementId?: number }; return `${t(item.nodeId !== undefined ? 'table.nodeLabel' : 'table.elemLabel')} ${item.nodeId ?? item.elementId}`; }
  function typeLabel(type: string) { return t(type === 'nodal' ? 'table.typePoint' : type === 'nodal3d' ? 'table.typePoint3d' : type === 'distributed' ? 'table.typeDist' : type === 'distributed3d' ? 'table.typeDist3d' : type === 'thermal' ? 'table.typeThermal' : 'table.typeBarPoint'); }
  function add() {
    historyStore.pushState();
    if (loadType === 'nodal' && modelStore.getNode(targetId)) modelStore.addNodalLoad(targetId, 0, -10, 0, caseId);
    else if (loadType === 'nodal3d' && modelStore.getNode(targetId)) modelStore.addNodalLoad3D(targetId, 0, -10, 0, 0, 0, 0, caseId);
    else if (loadType === 'distributed' && modelStore.elements.get(targetId)) modelStore.addDistributedLoad(targetId, -10, -10, undefined, undefined, caseId);
    else if (loadType === 'distributed3d' && modelStore.elements.get(targetId)) modelStore.addDistributedLoad3D(targetId, -10, -10, 0, 0, undefined, undefined, caseId);
    else if (loadType === 'pointOnElement' && modelStore.elements.get(targetId)) modelStore.addPointLoadOnElement(targetId, 0, -10, { caseId });
    else if (loadType === 'thermal' && modelStore.elements.get(targetId)) modelStore.addThermalLoad(targetId, 10, 0, caseId);
    resultsStore.clear();
  }

  const typeOptions: Array<[LoadType, string]> = is3D ? [['nodal3d', 'table.pointLoad3d'], ['distributed3d', 'table.distLoad3d']] : [['nodal', 'table.pointLoad'], ['distributed', 'table.distLoad'], ['pointOnElement', 'table.pointBarLoad'], ['thermal', 'table.thermalLoad']];
  const targets = loadType === 'nodal' || loadType === 'nodal3d' ? nodes : elements;
  return <div className="editor-data-grid react-loads-table"><label className="selfweight-row" title={t('table.selfWeightTooltip')}><input type="checkbox" checked={uiStore.includeSelfWeight} onChange={(event) => { uiStore.includeSelfWeight = event.currentTarget.checked; }} /><span>{t('table.selfWeight')}</span></label>
    <details className="combos-fold"><summary>{t('data.combinations')}</summary><div className="combos-body"><CombosTable /></div></details>
    <table><thead><tr><th>#</th><th>{t('table.case')}</th><th>{t('table.type')}</th><th>{t('table.target')}</th><th>{t('table.values')}</th><th /></tr></thead><tbody>{modelStore.loads.map((load, index) => <tr key={load.data.id}><td className="id-cell">{index + 1}</td><td><select value={load.data.caseId ?? 1} onChange={(event) => { modelStore.updateLoadCaseId(load.data.id, Number(event.currentTarget.value)); if (resultsStore.hasCombinations) resultsStore.combinationsDirty = true; }}>{modelStore.loadCases.map((loadCase) => <option key={loadCase.id} value={loadCase.id}>{loadCase.type || loadCase.name}</option>)}</select></td><td className="type-cell">{typeLabel(load.type)}</td><td>{target(load)}</td><td className="load-values">{values(load)}</td><td><button className="del" onClick={() => { historyStore.pushState(); modelStore.removeLoad(load.data.id); }}>✕</button></td></tr>)}</tbody></table>
    <div className="table-footer"><div className="add-row"><select value={loadType} onChange={(event) => setLoadType(event.currentTarget.value as LoadType)} className="add-input add-input-wide">{typeOptions.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</select><span className="add-label">{t('table.loadCase')}:</span><select value={caseId} onChange={(event) => setCaseId(Number(event.currentTarget.value))} className="add-input">{modelStore.loadCases.map((loadCase) => <option key={loadCase.id} value={loadCase.id}>{loadCase.type || loadCase.name}</option>)}</select><span className="add-label">{t(loadType === 'nodal' || loadType === 'nodal3d' ? 'table.nodeLabel' : 'table.elemLabel')}:</span><select value={targetId} onChange={(event) => setTargetId(Number(event.currentTarget.value))} className="add-input">{targets.map((item) => <option key={item.id} value={item.id}>{item.id}</option>)}</select><button className="add-btn" onClick={add}>{t('table.addLoad')}</button></div></div>
  </div>;
}
