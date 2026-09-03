import { useState, useSyncExternalStore } from 'react';
import { localeExternalStore, t } from '../../lib/i18n/store.svelte';
import { historyStore, modelStore, resultsStore, uiStore } from '../../lib/store';
import type { SupportType } from '../../lib/store/model.svelte';
import { useStoreRevision } from '../store/useStoreRevision';
import './EditorTables.css';
import './SupportsTable.css';

type Dofs = { tx: boolean; ty: boolean; tz: boolean; rx: boolean; ry: boolean; rz: boolean };
type Dof = keyof Dofs;

function defaultDofs(type: string): Dofs {
  if (type === 'fixed3d' || type === 'fixed') return { tx: true, ty: true, tz: true, rx: true, ry: true, rz: true };
  if (type === 'pinned3d' || type === 'pinned') return { tx: true, ty: true, tz: true, rx: false, ry: false, rz: false };
  if (type === 'spring3d' || type === 'spring') return { tx: false, ty: false, tz: false, rx: false, ry: false, rz: false };
  if (type === 'rollerXZ') return { tx: false, ty: true, tz: false, rx: false, ry: false, rz: false };
  if (type === 'rollerXY') return { tx: false, ty: false, tz: true, rx: false, ry: false, rz: false };
  if (type === 'rollerYZ') return { tx: true, ty: false, tz: false, rx: false, ry: false, rz: false };
  return { tx: true, ty: true, tz: true, rx: true, ry: true, rz: true };
}

function deriveType(restraints: Dofs): SupportType {
  if (restraints.tx && restraints.ty && restraints.tz && restraints.rx && restraints.ry && restraints.rz) return 'fixed3d';
  if (restraints.tx && restraints.ty && restraints.tz && !restraints.rx && !restraints.ry && !restraints.rz) return 'pinned3d';
  if (!restraints.tx && !restraints.ty && !restraints.tz && !restraints.rx && !restraints.ry && !restraints.rz) return 'spring3d';
  return 'custom3d';
}

export function SupportsTable() {
  useStoreRevision(modelStore); useStoreRevision(resultsStore); useStoreRevision(uiStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const [nodeId, setNodeId] = useState(0); const [supportType, setSupportType] = useState('pinned');
  const nodes = [...modelStore.nodes.values()]; const supports = [...modelStore.supports.values()];
  const is3D = uiStore.analysisMode === '3d';

  function updateSpring(supportId: number, field: string, raw: string) { const value = parseFloat(raw); if (!Number.isNaN(value)) modelStore.updateSupport(supportId, { [field]: value } as never); }
  function toggleDof(supportId: number, support: (typeof supports)[number], dof: Dof) { const current = support.dofRestraints ?? defaultDofs(support.type); const updated = { ...current, [dof]: !current[dof] }; modelStore.updateSupport(supportId, { dofRestraints: updated, type: deriveType(updated) } as never); resultsStore.clear(); resultsStore.clear3D(); }
  function add() {
    if (!modelStore.getNode(nodeId)) return; historyStore.pushState();
    if (is3D) {
      const dofRestraints: Dofs = { tx: uiStore.sup3dTx, ty: uiStore.sup3dTy, tz: uiStore.sup3dTz, rx: uiStore.sup3dRx, ry: uiStore.sup3dRy, rz: uiStore.sup3dRz };
      const springs: Record<string, number> = {};
      for (const [dof, key, value] of [['tx', 'kx', uiStore.sup3dKx], ['ty', 'ky', uiStore.sup3dKy], ['tz', 'kz', uiStore.sup3dKz], ['rx', 'krx', uiStore.sup3dKrx], ['ry', 'kry', uiStore.sup3dKry], ['rz', 'krz', uiStore.sup3dKrz]] as const) if (!dofRestraints[dof] && value > 0) springs[key] = value;
      modelStore.addSupport(nodeId, deriveType(dofRestraints), Object.keys(springs).length ? springs : undefined, { dofRestraints, dofFrame: 'global' });
    } else modelStore.addSupport(nodeId, supportType as SupportType);
    resultsStore.clear(); resultsStore.clear3D();
  }

  const dofLabel: Record<Dof, string> = { tx: 'Fx', ty: 'Fy', tz: 'Fz', rx: 'Mx', ry: 'My', rz: 'Mz' };
  const dofTitle: Record<Dof, string> = { tx: 'table.translationX', ty: 'table.translationY', tz: 'table.translationZ', rx: 'table.rotationX', ry: 'table.rotationY', rz: 'table.rotationZ' };
  const dofs = Object.keys(dofLabel) as Dof[];
  return <div className="editor-data-grid react-supports-table"><table><thead>{is3D ? <tr><th>ID</th><th>{t('table.nodeLabel')}</th><th>{t('table.dofRestrained')}</th><th>{t('table.stiffness')}</th><th /></tr> : <tr><th>ID</th><th>{t('table.nodeLabel')}</th><th>{t('table.type')}</th><th>{t('table.stiffness')}</th><th /></tr>}</thead><tbody>
    {supports.map((support) => { const restraint = support.dofRestraints ?? defaultDofs(support.type); return <tr key={support.id}><td className="id-cell">{support.id}</td><td>{support.nodeId}</td>{is3D ? <><td className="load-values">{dofs.map((dof) => <label className="dof-chk" title={t(dofTitle[dof])} key={dof}><input type="checkbox" checked={restraint[dof]} onChange={() => toggleDof(support.id, support, dof)} />{dofLabel[dof]}</label>)}</td><td className="load-values">{dofs.filter((dof) => !restraint[dof]).map((dof) => { const key = dof.startsWith('r') ? `kr${dof[1]}` : `k${dof[1]}`; return <span className="load-field" key={dof}>{key}<input type="number" step="100" defaultValue={(support as unknown as Record<string, number>)[key] ?? 0} onChange={(event) => updateSpring(support.id, key, event.currentTarget.value)} /></span>; })}</td></> : <><td><select value={support.type} onChange={(event) => modelStore.updateSupport(support.id, { type: event.currentTarget.value as SupportType })}><option value="fixed">{t('table.fixed')}</option><option value="pinned">{t('table.pinned')}</option><option value="rollerX">{t('table.rollerX')}</option><option value="rollerZ">{t('table.rollerY')}</option><option value="spring">{t('table.spring')}</option></select></td><td className="load-values">{support.type === 'spring' ? ['kx', 'ky', 'kz'].map((key) => <span className="load-field" key={key}>{key}<input type="number" step="100" defaultValue={(support as unknown as Record<string, number>)[key] ?? 0} onChange={(event) => updateSpring(support.id, key, event.currentTarget.value)} /></span>) : [['dx', 'dx'], ['dz', 'dy'], ['dθy', 'drz']].map(([label, key]) => <span className="load-field" key={key}>{label}<input type="number" step="0.001" defaultValue={(support as unknown as Record<string, number>)[key] ?? 0} onChange={(event) => updateSpring(support.id, key, event.currentTarget.value)} /></span>)}</td></>}<td><button className="del" onClick={() => modelStore.removeSupport(support.id)}>✕</button></td></tr>; })}
  </tbody></table><div className="table-footer"><div className="add-row" style={is3D ? { flexWrap: 'nowrap', gap: '0.15rem' } : undefined}><span className="add-label">{t('table.nodeLabel')}:</span><select value={nodeId} onChange={(event) => setNodeId(Number(event.currentTarget.value))} className="add-input" style={is3D ? { width: 40 } : undefined}>{nodes.map((node) => <option key={node.id} value={node.id}>{node.id}</option>)}</select>{is3D ? <>{dofs.map((dof) => { const key = `sup3d${dof[0].toUpperCase()}${dof.slice(1)}` as keyof typeof uiStore; return <label className="dof-chk" key={dof}><input type="checkbox" checked={uiStore[key] as boolean} onChange={(event) => { (uiStore as unknown as Record<string, unknown>)[key] = event.currentTarget.checked; }} />{dofLabel[dof]}</label>; })}<button className="add-btn preset-btn" onClick={() => uiStore.setSupport3DPreset('fixed')} title={t('table.fixed6dof')}>▣</button><button className="add-btn preset-btn" onClick={() => uiStore.setSupport3DPreset('pinned')} title={t('table.pinned3trans')}>△</button></> : <select value={supportType} onChange={(event) => setSupportType(event.currentTarget.value)} className="add-input add-input-wide"><option value="fixed">{t('table.fixed')}</option><option value="pinned">{t('table.pinned')}</option><option value="rollerX">{t('table.rollerX')}</option><option value="rollerZ">{t('table.rollerY')}</option><option value="spring">{t('table.spring')}</option></select>}<button className="add-btn" onClick={add}>{t('table.addSupport')}</button></div></div>
  </div>;
}
