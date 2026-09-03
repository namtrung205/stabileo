import { useEffect, useState, useSyncExternalStore, type InputHTMLAttributes, type Key } from 'react';
import { get2DDisplayNodalLoadMoment, get2DDisplayNodalLoadVertical } from '../../lib/geometry/coordinate-system';
import { memberLoadPerpComponent } from '../../lib/engine/model-diagnostics';
import { localeExternalStore, t } from '../../lib/i18n/store.svelte';
import { modelStore, resultsStore, uiStore } from '../../lib/store';
import type {
  DistributedLoad,
  DistributedLoad3D,
  NodalLoad,
  NodalLoad3D,
  PointLoadOnElement,
  Support,
} from '../../lib/store/model.svelte';
import { useStoreRevision } from '../store/useStoreRevision';
import './SelectedEntityPanel.css';

type NumberInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  key?: Key;
  value: string | number;
  onValue: (value: string) => void;
};

function NumberInput({ value, onValue, onBlur, onKeyDown, ...props }: NumberInputProps) {
  const text = String(value);
  const [draft, setDraft] = useState(text);
  useEffect(() => setDraft(text), [text]);

  return <input
    {...props}
    type="number"
    value={draft}
    onChange={(event) => {
      const next = event.currentTarget.value;
      setDraft(next);
      if (next.trim() !== '' && Number.isFinite(Number(next))) onValue(next);
    }}
    onBlur={(event) => {
      if (draft.trim() !== '' && Number.isFinite(Number(draft))) onValue(draft);
      onBlur?.(event);
    }}
    onKeyDown={(event) => {
      if (event.key === 'Enter') event.currentTarget.blur();
      onKeyDown?.(event);
    }}
  />;
}

const supportTypeLabelKeys: Record<string, string> = {
  fixed: 'selEntity.supFixed',
  pinned: 'selEntity.supPinned',
  rollerX: 'selEntity.supRoller',
  rollerZ: 'selEntity.supRoller',
  rollerY: 'selEntity.supRoller',
  spring: 'selEntity.supSpring',
  fixed3d: 'selEntity.supFixed3d',
  pinned3d: 'selEntity.supPinned3d',
  rollerXZ: 'selEntity.supRollerXZ',
  rollerXY: 'selEntity.supRollerXY',
  rollerYZ: 'selEntity.supRollerYZ',
  spring3d: 'selEntity.supSpring3d',
  custom3d: 'selEntity.supCustom3d',
};

const supportTypes = [
  { id: 'fixed', key: 'float.supportFixedShort', icon: '▣' },
  { id: 'pinned', key: 'float.supportPinnedShort', icon: '△' },
  { id: 'roller', key: 'float.supportRoller', icon: '' },
  { id: 'spring', key: 'float.supportSpring', icon: '⌇' },
] as const;

const isRollerType = (type: string) => ['rollerX', 'rollerY', 'rollerZ', 'rollerXZ', 'rollerXY', 'rollerYZ'].includes(type);
const is3DSupport = (type: string) => ['fixed3d', 'pinned3d', 'rollerXZ', 'rollerXY', 'rollerYZ', 'spring3d', 'custom3d'].includes(type);

export function SelectedEntityPanel() {
  useStoreRevision(uiStore);
  useStoreRevision(modelStore);
  useStoreRevision(resultsStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);

  const selectedLoad = uiStore.selectedLoads.size === 1
    ? modelStore.loads.find((load) => load.data.id === [...uiStore.selectedLoads][0]) ?? null
    : null;
  const selectedSupport = uiStore.selectedSupports.size === 1
    ? modelStore.supports.get([...uiStore.selectedSupports][0]) ?? null
    : null;

  function warnIfTransverseOnTruss(loadId: number) {
    const load = modelStore.loads.find((item) => item.data.id === loadId);
    const elementId = load ? (load.data as { elementId?: number }).elementId : undefined;
    if (!load || elementId == null) return;
    const element = modelStore.elements.get(elementId);
    if (element?.type === 'truss' && memberLoadPerpComponent(load as never, element, modelStore.nodes) > 1e-9) {
      uiStore.toast(t('diag.model.transverseOnTruss'), 'info');
    }
  }

  function updateLoadField(loadId: number, field: string, value: string | boolean) {
    if (typeof value === 'boolean') {
      modelStore.updateLoad(loadId, { [field]: value });
    } else {
      const number = Number.parseFloat(value);
      if (Number.isNaN(number)) return;
      modelStore.updateLoad(loadId, { [field]: number });
    }
    resultsStore.clear();
    warnIfTransverseOnTruss(loadId);
  }

  function updateDistributedPosition(
    loadId: number,
    field: 'a' | 'b',
    value: string,
    elementLength: number,
    currentA: number,
    currentB: number,
  ) {
    const number = Number.parseFloat(value);
    if (Number.isNaN(number)) return;
    if (field === 'a') {
      const a = Math.max(0, Math.min(elementLength, number));
      modelStore.updateLoad(loadId, a > currentB ? { a, b: a } : { a });
    } else {
      modelStore.updateLoad(loadId, { b: Math.max(currentA, Math.min(elementLength, number)) });
    }
    resultsStore.clear();
  }

  function updateSupportField(supportId: number, field: string, value: string | boolean) {
    if (typeof value === 'boolean') {
      modelStore.updateSupport(supportId, { [field]: value } as never);
    } else {
      const number = Number.parseFloat(value);
      if (Number.isNaN(number)) return;
      modelStore.updateSupport(supportId, { [field]: number } as never);
    }
    resultsStore.clear();
  }

  function changeSupportType(supportId: number, type: string) {
    modelStore.updateSupport(supportId, { type } as never);
    resultsStore.clear();
  }

  function deleteSelectedLoads() {
    const ids = [...uiStore.selectedLoads];
    modelStore.batch(() => ids.forEach((id) => modelStore.removeLoad(id)));
    uiStore.clearSelectedLoads();
    resultsStore.clear();
  }

  function deleteSelectedSupports() {
    const ids = [...uiStore.selectedSupports];
    modelStore.batch(() => ids.forEach((id) => modelStore.removeSupport(id)));
    uiStore.clearSelectedSupports();
    resultsStore.clear();
  }

  function toggleDof(support: Support, key: keyof NonNullable<Support['dofRestraints']>) {
    const restraints = support.dofRestraints ?? { tx: true, ty: true, tz: true, rx: true, ry: true, rz: true };
    const updated = { ...restraints, [key]: !restraints[key] };
    const allFixed = updated.tx && updated.ty && updated.tz && updated.rx && updated.ry && updated.rz;
    const translationsOnly = updated.tx && updated.ty && updated.tz && !updated.rx && !updated.ry && !updated.rz;
    const noneFixed = !updated.tx && !updated.ty && !updated.tz && !updated.rx && !updated.ry && !updated.rz;
    modelStore.updateSupport(support.id, {
      dofRestraints: updated,
      type: allFixed ? 'fixed3d' : translationsOnly ? 'pinned3d' : noneFixed ? 'spring3d' : 'custom3d',
    } as never);
    resultsStore.clear();
    resultsStore.clear3D();
  }

  function input(label: string, value: string | number, onValue: (value: string) => void, unit?: string, props?: NumberInputProps) {
    return <label className="ft-input-group" title={props?.title}>
      <span>{label}:</span>
      <NumberInput {...props} value={value} onValue={onValue} title={undefined} />
      {unit && <span className="ft-unit">{unit}</span>}
    </label>;
  }

  let loadEditor = null;
  if (selectedLoad) {
    const data = selectedLoad.data;
    let fields = null;
    if (selectedLoad.type === 'nodal') {
      const load = data as NodalLoad;
      fields = <>
        {input('Fx', load.fx, (value) => updateLoadField(load.id, 'fx', value), 'kN', { step: 1, value: load.fx, onValue: () => {} })}
        {input('Fz', get2DDisplayNodalLoadVertical(load), (value) => updateLoadField(load.id, 'fz', value), 'kN', { step: 1, value: load.fz, onValue: () => {} })}
        {input('My', get2DDisplayNodalLoadMoment(load), (value) => updateLoadField(load.id, 'my', value), 'kN·m', { step: 1, value: load.my ?? 0, onValue: () => {} })}
      </>;
    } else if (selectedLoad.type === 'distributed') {
      const load = data as DistributedLoad;
      const length = modelStore.getElementLength(load.elementId);
      const a = load.a ?? 0;
      const b = load.b ?? length;
      fields = <>
        {input('qI', load.qI, (value) => updateLoadField(load.id, 'qI', value), 'kN/m', { step: 1, value: load.qI, onValue: () => {} })}
        {input('qJ', load.qJ, (value) => updateLoadField(load.id, 'qJ', value), 'kN/m', { step: 1, value: load.qJ, onValue: () => {} })}
        {input('a', a.toFixed(2), (value) => updateDistributedPosition(load.id, 'a', value, length, a, b), 'm', { step: 0.1, min: 0, max: length, value: a, onValue: () => {} })}
        {input('b', b.toFixed(2), (value) => updateDistributedPosition(load.id, 'b', value, length, a, b), 'm', { step: 0.1, min: 0, max: length, value: b, onValue: () => {} })}
        <span className="ft-sep">|</span>
        <button className={`ft-opt-btn ft-coord-btn${load.isGlobal === true ? ' active' : ''}`} onClick={() => updateLoadField(load.id, 'isGlobal', true)} title={t('float.loadGlobalYDir')}>Z</button>
        <button className={`ft-opt-btn ft-coord-btn${!load.isGlobal ? ' active' : ''}`} onClick={() => updateLoadField(load.id, 'isGlobal', false)} title={t('float.loadPerpDir')}>⊥</button>
        {input('α', load.angle ?? 0, (value) => updateLoadField(load.id, 'angle', value), '°', { step: 5, value: load.angle ?? 0, onValue: () => {} })}
      </>;
    } else if (selectedLoad.type === 'pointOnElement') {
      const load = data as PointLoadOnElement;
      const length = modelStore.getElementLength(load.elementId);
      fields = <>
        {input('a', load.a.toFixed(2), (value) => updateLoadField(load.id, 'a', value), 'm', { step: 0.1, min: 0, max: length, value: load.a, onValue: () => {} })}
        {input(load.isGlobal ? 'Fz' : 'Fj', load.p, (value) => updateLoadField(load.id, 'p', value), 'kN', { step: 1, value: load.p, onValue: () => {} })}
        {input(load.isGlobal ? 'Fx' : 'Fi', load.px ?? 0, (value) => updateLoadField(load.id, 'px', value), 'kN', { step: 1, value: load.px ?? 0, onValue: () => {} })}
        {input('My', get2DDisplayNodalLoadMoment(load), (value) => updateLoadField(load.id, 'my', value), 'kN·m', { step: 1, value: load.my ?? 0, onValue: () => {} })}
        <span className="ft-sep">|</span>
        <button className={`ft-opt-btn ft-coord-btn${load.isGlobal === true ? ' active' : ''}`} onClick={() => updateLoadField(load.id, 'isGlobal', true)} title={t('float.loadGlobalYDir')}>Z</button>
        <button className={`ft-opt-btn ft-coord-btn${!load.isGlobal ? ' active' : ''}`} onClick={() => updateLoadField(load.id, 'isGlobal', false)} title={t('float.loadPerpDir')}>⊥</button>
        {input('α', load.angle ?? 0, (value) => updateLoadField(load.id, 'angle', value), '°', { step: 5, value: load.angle ?? 0, onValue: () => {} })}
      </>;
    } else if (selectedLoad.type === 'thermal') {
      const load = data as { id: number; dtUniform: number; dtGradient: number };
      fields = <>
        {input('ΔT', load.dtUniform, (value) => updateLoadField(load.id, 'dtUniform', value), '°C', { step: 5, value: load.dtUniform, onValue: () => {} })}
        {input('ΔTg', load.dtGradient, (value) => updateLoadField(load.id, 'dtGradient', value), '°C', { step: 5, value: load.dtGradient, onValue: () => {} })}
      </>;
    } else if (selectedLoad.type === 'nodal3d') {
      const load = data as NodalLoad3D;
      fields = <>{(['fx', 'fy', 'fz', 'mx', 'my', 'mz'] as const).map((field) => input(
        field[0].toUpperCase() + field.slice(1), load[field],
        (value) => updateLoadField(load.id, field, value), field[0] === 'f' ? 'kN' : 'kN·m',
        { step: 1, value: load[field], onValue: () => {}, key: field },
      ))}</>;
    } else if (selectedLoad.type === 'distributed3d') {
      const load = data as DistributedLoad3D;
      fields = <>{(['qYI', 'qYJ', 'qZI', 'qZJ'] as const).map((field) => input(
        field, load[field], (value) => updateLoadField(load.id, field, value), 'kN/m',
        { step: 1, value: load[field], onValue: () => {}, key: field },
      ))}</>;
    }

    loadEditor = <div className="ft-load-edit">
      <span className="ft-load-tag">{t('selEntity.editingLoad')}</span>
      <span className="ft-case-dot" style={{ background: modelStore.getLoadCaseColor((data as { caseId?: number }).caseId ?? 1) }} />
      <select
        className="ft-case-select"
        value={String((data as { caseId?: number }).caseId ?? 1)}
        onChange={(event) => updateLoadField(data.id, 'caseId', event.currentTarget.value)}
        title={t('selEntity.loadCase')}
      >
        {modelStore.loadCases.map((loadCase) => <option value={String(loadCase.id)} key={loadCase.id}>{loadCase.type || loadCase.name}</option>)}
      </select>
      <span className="ft-sep">|</span>
      {fields}
      <button className="ft-load-delete" onClick={deleteSelectedLoads} title={t('selEntity.deleteLoad')}>🗑</button>
      <button className="ft-load-done" onClick={() => { uiStore.clearSelectedLoads(); uiStore.currentTool = 'load'; }} title={t('selEntity.deselectBack')}>✓</button>
    </div>;
  } else if (uiStore.selectedLoads.size > 1) {
    loadEditor = <div className="ft-load-edit">
      <span className="ft-load-tag">{t('selEntity.loadsSelected').replace('{n}', String(uiStore.selectedLoads.size))}</span>
      <button className="ft-load-delete" onClick={deleteSelectedLoads} title={t('selEntity.deleteSelectedLoads')}>🗑 {t('selEntity.deleteBtn')}</button>
      <button className="ft-load-done" onClick={() => uiStore.clearSelectedLoads()} title={t('selEntity.deselect')}>✓</button>
    </div>;
  }

  let supportEditor = null;
  if (selectedSupport) {
    const support = selectedSupport;
    const dofs = support.dofRestraints ?? { tx: true, ty: true, tz: true, rx: true, ry: true, rz: true };
    let fields = null;
    if (is3DSupport(support.type)) {
      const labels: Record<keyof typeof dofs, string> = { tx: 'Fx', ty: 'Fy', tz: 'Fz', rx: 'Mx', ry: 'My', rz: 'Mz' };
      const stiffness: Record<keyof typeof dofs, keyof Support> = { tx: 'kx', ty: 'ky', tz: 'kz', rx: 'krx', ry: 'kry', rz: 'krz' };
      fields = <>
        {(Object.keys(labels) as Array<keyof typeof dofs>).map((key) => <label className="ft-chk" key={key}>
          <input type="checkbox" checked={dofs[key]} onChange={() => toggleDof(support, key)} /> <span>{labels[key]}</span>
        </label>)}
        {(Object.keys(stiffness) as Array<keyof typeof dofs>).map((key) => !dofs[key] && input(
          String(stiffness[key]), Number(support[stiffness[key]] ?? 0),
          (value) => updateSupportField(support.id, String(stiffness[key]), value), undefined,
          { step: 100, value: Number(support[stiffness[key]] ?? 0), onValue: () => {}, key: `k-${key}` },
        ))}
      </>;
    } else {
      fields = <>{supportTypes.map((item) => <button
        className={`ft-opt-btn ft-sup-btn${(item.id === 'roller' ? isRollerType(support.type) : support.type === item.id) ? ' active' : ''}`}
        onClick={() => changeSupportType(support.id, item.id === 'roller' ? 'rollerX' : item.id)}
        title={t(item.key)}
        key={item.id}
      >
        {item.id === 'roller' ? <svg className="ft-sup-svg" viewBox="0 0 20 20" width="14" height="14">
          <polygon points="10,2 3,12 17,12" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="7" cy="16" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="13" cy="16" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg> : item.icon}
      </button>)}</>;
    }

    let typeFields = null;
    if (isRollerType(support.type)) {
      typeFields = <>
        <span className="ft-sep">|</span>
        <button className={`ft-opt-btn ft-dir-btn${support.type === 'rollerX' ? ' active' : ''}`} onClick={() => changeSupportType(support.id, 'rollerX')} title={support.isGlobal !== false ? t('float.rollerRestrictsYGlobal') : t('float.rollerRestrictsJLocal')}>{support.isGlobal !== false ? 'X' : 'i'}</button>
        <button className={`ft-opt-btn ft-dir-btn${support.type === 'rollerY' || support.type === 'rollerZ' ? ' active' : ''}`} onClick={() => changeSupportType(support.id, 'rollerZ')} title={support.isGlobal !== false ? t('float.rollerRestrictsXGlobal') : t('float.rollerRestrictsILocal')}>{support.isGlobal !== false ? 'Z' : 'j'}</button>
        <span className="ft-sep">|</span>
        <button className={`ft-opt-btn ft-coord-btn${support.isGlobal !== false ? ' active' : ''}`} onClick={() => updateSupportField(support.id, 'isGlobal', true)} title={t('float.rollerGlobalLabel')}>Gl</button>
        <button className={`ft-opt-btn ft-coord-btn${support.isGlobal === false ? ' active' : ''}`} onClick={() => updateSupportField(support.id, 'isGlobal', false)} title={t('float.rollerLocalLabel')}>Loc</button>
        {input('di', support.dx ?? 0, (value) => updateSupportField(support.id, 'dx', value), 'm', { step: 0.001, value: support.dx ?? 0, onValue: () => {}, title: t('float.prescribedRollerDisp') })}
        {input('α', support.angle ?? 0, (value) => updateSupportField(support.id, 'angle', value), '°', { step: 5, value: support.angle ?? 0, onValue: () => {}, title: t('float.supportAngle') })}
      </>;
    } else if (support.type === 'spring') {
      typeFields = <>
        <span className="ft-sep">|</span>
        {input('kx', support.kx ?? 0, (value) => updateSupportField(support.id, 'kx', value), undefined, { step: 100, value: support.kx ?? 0, onValue: () => {} })}
        {input('ky', support.ky ?? 0, (value) => updateSupportField(support.id, 'ky', value), undefined, { step: 100, value: support.ky ?? 0, onValue: () => {} })}
        {input('kθ', support.kz ?? 0, (value) => updateSupportField(support.id, 'kz', value), undefined, { step: 100, value: support.kz ?? 0, onValue: () => {} })}
        <span className="ft-sep">|</span>
        <button className={`ft-opt-btn ft-coord-btn${support.isGlobal !== false ? ' active' : ''}`} onClick={() => updateSupportField(support.id, 'isGlobal', true)} title={t('float.supportGlobalAxes')}>Gl</button>
        <button className={`ft-opt-btn ft-coord-btn${support.isGlobal === false ? ' active' : ''}`} onClick={() => updateSupportField(support.id, 'isGlobal', false)} title={t('float.supportLocalAxes')}>Loc</button>
        {input('α', support.angle ?? 0, (value) => updateSupportField(support.id, 'angle', value), '°', { step: 5, value: support.angle ?? 0, onValue: () => {}, title: t('float.supportAngle') })}
      </>;
    } else if (support.type === 'fixed' || support.type === 'pinned') {
      typeFields = <>
        <span className="ft-sep">|</span>
        {input('dx', support.dx ?? 0, (value) => updateSupportField(support.id, 'dx', value), undefined, { step: 0.001, value: support.dx ?? 0, onValue: () => {}, title: t('float.prescribedDx') })}
        {input('dy', support.dy ?? 0, (value) => updateSupportField(support.id, 'dy', value), undefined, { step: 0.001, value: support.dy ?? 0, onValue: () => {}, title: t('float.prescribedDy') })}
        {support.type === 'fixed' && input('dθz', support.drz ?? 0, (value) => updateSupportField(support.id, 'drz', value), undefined, { step: 0.001, value: support.drz ?? 0, onValue: () => {}, title: t('float.prescribedDrz') })}
        {input('α', support.angle ?? 0, (value) => updateSupportField(support.id, 'angle', value), '°', { step: 5, value: support.angle ?? 0, onValue: () => {}, title: t('float.supportAngleVisual') })}
      </>;
    }

    supportEditor = <div className="ft-load-edit">
      <span className="ft-load-tag">{t('selEntity.support')} {t(supportTypeLabelKeys[support.type] ?? '') || support.type}</span>
      <span className="ft-sep">|</span>
      {fields}{typeFields}
      <button className="ft-load-delete" onClick={deleteSelectedSupports} title={t('selEntity.deleteSupport')}>🗑</button>
      <button className="ft-load-done" onClick={() => uiStore.clearSelectedSupports()} title={t('selEntity.deselect')}>✓</button>
    </div>;
  } else if (uiStore.selectedSupports.size > 1) {
    supportEditor = <div className="ft-load-edit">
      <span className="ft-load-tag">{t('selEntity.supportsSelected').replace('{n}', String(uiStore.selectedSupports.size))}</span>
      <button className="ft-load-delete" onClick={deleteSelectedSupports} title={t('selEntity.deleteSelectedSupports')}>🗑 {t('selEntity.deleteBtn')}</button>
      <button className="ft-load-done" onClick={() => uiStore.clearSelectedSupports()} title={t('selEntity.deselect')}>✓</button>
    </div>;
  }

  return <>{loadEditor}{supportEditor}</>;
}
