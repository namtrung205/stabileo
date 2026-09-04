import { useState, useSyncExternalStore } from 'react';
import { localeExternalStore, t } from '../../lib/i18n/store.svelte';
import { modelStore, uiStore } from '../../lib/store';
import type { Support, SupportType } from '../../lib/store/model.svelte';
import { useStoreRevision } from '../store/useStoreRevision';
import './ProSupportsTab.css';

type DofKey = 'tx' | 'ty' | 'tz' | 'rx' | 'ry' | 'rz';
const defaultDofs = { tx: true, ty: true, tz: true, rx: false, ry: false, rz: false };

/** React-owned PRO support editor, including custom DOFs and spring stiffnesses. */
export function ProSupportsTab() {
  useStoreRevision(modelStore);
  useStoreRevision(uiStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const is3D = uiStore.analysisMode === '3d' || uiStore.analysisMode === 'pro';
  const supportTypes: Array<{ value: SupportType; label: string }> = is3D ? [
    { value: 'fixed3d', label: t('pro.fixed3d') !== 'pro.fixed3d' ? t('pro.fixed3d') : 'Fixed (6 DOF)' },
    { value: 'pinned3d', label: t('pro.pinned3d') !== 'pro.pinned3d' ? t('pro.pinned3d') : 'Pinned (3 transl.)' },
    { value: 'rollerXZ', label: 'Roller XZ' },
    { value: 'rollerXY', label: 'Roller XY' },
    { value: 'rollerYZ', label: 'Roller YZ' },
    { value: 'spring3d', label: t('pro.spring3d') !== 'pro.spring3d' ? t('pro.spring3d') : 'Spring' },
    { value: 'custom3d', label: t('pro.custom3d') !== 'pro.custom3d' ? t('pro.custom3d') : 'Custom DOF' },
  ] : [
    { value: 'fixed', label: t('pro.fixed') },
    { value: 'pinned', label: t('pro.pinned') },
    { value: 'rollerX', label: t('pro.rollerX') },
    { value: 'rollerZ', label: t('pro.rollerY') },
    { value: 'spring', label: t('pro.spring') },
  ];
  const [newNodeId, setNewNodeId] = useState('');
  const [newType, setNewType] = useState<SupportType>('fixed3d');
  const [dofs, setDofs] = useState(defaultDofs);
  const [springs, setSprings] = useState({ kx: '', ky: '', kz: '', krx: '', kry: '', krz: '' });
  const supports = [...modelStore.supports.values()];

  const supportSprings = () => newType === 'spring3d' || newType === 'spring' ? {
    kx: Number.parseFloat(springs.kx) || undefined,
    ky: Number.parseFloat(springs.ky) || undefined,
    kz: Number.parseFloat(springs.kz) || undefined,
    krx: Number.parseFloat(springs.krx) || undefined,
    kry: Number.parseFloat(springs.kry) || undefined,
    krz: Number.parseFloat(springs.krz) || undefined,
  } : undefined;
  const supportOptions = () => newType === 'custom3d' ? { dofRestraints: dofs } : undefined;

  const addSupport = () => {
    const nodeId = Number.parseInt(newNodeId);
    if (Number.isNaN(nodeId) || !modelStore.nodes.has(nodeId)) return;
    modelStore.addSupport(nodeId, newType, supportSprings(), supportOptions());
    setNewNodeId('');
  };
  const addFromSelection = () => {
    for (const nodeId of uiStore.selectedNodes) {
      if (!modelStore.nodes.has(nodeId)) continue;
      const existing = [...modelStore.supports.values()].find((support) => support.nodeId === nodeId);
      if (!existing) modelStore.addSupport(nodeId, newType, supportSprings(), supportOptions());
    }
  };
  const updateDof = (supportId: number, current: typeof defaultDofs | undefined, key: DofKey, checked: boolean) => {
    modelStore.updateSupport(supportId, { dofRestraints: { ...(current ?? defaultDofs), [key]: checked } });
  };
  const updateSpring = (supportId: number, key: keyof typeof springs, value: string) => {
    modelStore.updateSupport(supportId, { [key]: Number.parseFloat(value) || 0 });
  };

  return <div className="pro-sup">
    <div className="pro-sup-header">
      <span className="pro-sup-count">{t('pro.nSupports').replace('{n}', String(supports.length))}</span>
    </div>
    <div className="pro-sup-form">
      <div className="pro-sup-row">
        <label>{t('pro.thNode')}: <input type="text" value={newNodeId} onChange={(event) => setNewNodeId(event.currentTarget.value)} placeholder="ID" className="pro-input-sm" /></label>
        <label>{t('pro.thType')}:
          <select value={newType} onChange={(event) => setNewType(event.currentTarget.value as SupportType)} className="pro-select-sm">
            {supportTypes.map((type) => <option value={type.value} key={type.value}>{type.label}</option>)}
          </select>
        </label>
        <button className="pro-btn" onClick={addSupport}>{t('pro.add')}</button>
      </div>
      {newType === 'custom3d' && <div className="dof-grid">
        <span className="dof-section-label">Translation</span>
        {(['tx', 'ty', 'tz'] as const).map((key) => <DofCheckbox key={key} label={`u${key[1]}`} checked={dofs[key]} onChange={(checked) => setDofs({ ...dofs, [key]: checked })} />)}
        <span className="dof-section-label">Rotation</span>
        {(['rx', 'ry', 'rz'] as const).map((key) => <DofCheckbox key={key} label={key} checked={dofs[key]} onChange={(checked) => setDofs({ ...dofs, [key]: checked })} />)}
      </div>}
      {(newType === 'spring3d' || newType === 'spring') && <SpringGrid is3D={is3D} values={springs}
        onChange={(key, value) => setSprings({ ...springs, [key]: value })} />}
      {uiStore.selectedNodes.size > 0 && <button className="pro-btn pro-btn-selection" onClick={addFromSelection}>
        {t('pro.addToSelection').replace('{n}', String(uiStore.selectedNodes.size))}
      </button>}
    </div>
    <div className="pro-sup-table-wrap">
      <table className="pro-sup-table">
        <thead><tr><th>ID</th><th>{t('pro.thNode')}</th><th>{t('pro.thType')}</th><th /></tr></thead>
        <tbody>{supports.map((support) => <SupportRows key={support.id} support={support} is3D={is3D}
          supportTypes={supportTypes} updateDof={updateDof} updateSpring={updateSpring} />)}</tbody>
      </table>
    </div>
  </div>;
}

function DofCheckbox({ label, checked, onChange }: { label: string; checked: boolean; onChange(checked: boolean): void }) {
  return <label className="dof-check"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.currentTarget.checked)} /> {label}</label>;
}

function SpringGrid({ is3D, values, onChange, inline = false }: {
  is3D: boolean;
  values: Record<'kx' | 'ky' | 'kz' | 'krx' | 'kry' | 'krz', string>;
  onChange(key: 'kx' | 'ky' | 'kz' | 'krx' | 'kry' | 'krz', value: string): void;
  inline?: boolean;
}) {
  const keys = is3D ? ['kx', 'ky', 'kz', 'krx', 'kry', 'krz'] as const : ['kx', 'ky', 'kz'] as const;
  return <div className={inline ? 'spring-grid-inline' : 'spring-grid'}>{keys.map((key) => <label className="spring-field" key={key}>
    {key} <input type="text" value={values[key]} placeholder={key.startsWith('kr') ? 'kN·m/rad' : 'kN/m'}
      className="pro-input-sm" onChange={(event) => onChange(key, event.currentTarget.value)} />
  </label>)}</div>;
}

function SupportRows({ support, is3D, supportTypes, updateDof, updateSpring }: {
  support: Support;
  is3D: boolean;
  supportTypes: Array<{ value: SupportType; label: string }>;
  updateDof(id: number, current: typeof defaultDofs | undefined, key: DofKey, checked: boolean): void;
  updateSpring(id: number, key: 'kx' | 'ky' | 'kz' | 'krx' | 'kry' | 'krz', value: string): void;
}) {
  const selected = uiStore.selectedSupports.has(support.id);
  const select = () => { uiStore.selectMode = 'supports'; uiStore.selectSupport(support.id, false); };
  const springValues = {
    kx: String(support.kx ?? ''), ky: String(support.ky ?? ''), kz: String(support.kz ?? ''),
    krx: String(support.krx ?? ''), kry: String(support.kry ?? ''), krz: String(support.krz ?? ''),
  };
  return <>
    <tr className={selected ? 'selected' : ''} onClick={select}>
      <td className="col-id">{support.id}</td><td className="col-num">{support.nodeId}</td>
      <td><select className="pro-select-inline" value={support.type}
        onChange={(event) => modelStore.updateSupport(support.id, { type: event.currentTarget.value as SupportType })}>
        {supportTypes.map((type) => <option value={type.value} key={type.value}>{type.label}</option>)}
      </select></td>
      <td><button className="pro-delete-btn" onClick={() => modelStore.removeSupport(support.id)}>×</button></td>
    </tr>
    {support.type === 'custom3d' && <tr className="param-row"><td colSpan={4}><div className="dof-grid-inline">
      {(['tx', 'ty', 'tz', 'rx', 'ry', 'rz'] as const).map((key) => <DofCheckbox key={key}
        label={key.startsWith('t') ? `u${key[1]}` : key}
        checked={support.dofRestraints?.[key] ?? defaultDofs[key]}
        onChange={(checked) => updateDof(support.id, support.dofRestraints, key, checked)} />)}
    </div></td></tr>}
    {(support.type === 'spring3d' || support.type === 'spring') && <tr className="param-row"><td colSpan={4}>
      <SpringGrid inline is3D={is3D} values={springValues} onChange={(key, value) => updateSpring(support.id, key, value)} />
    </td></tr>}
  </>;
}
