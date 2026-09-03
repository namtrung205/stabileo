import { t } from '../../lib/i18n/store.svelte';
import { modelStore, resultsStore, uiStore } from '../../lib/store';
import type { Support, SupportType } from '../../lib/store/model.svelte';

export function SupportDetails({ support }: { support: Support }) {
  const update = (field: string, raw: string | boolean) => {
    const value = typeof raw === 'boolean' ? raw : Number.parseFloat(raw);
    if (typeof value === 'number' && Number.isNaN(value)) return;
    modelStore.updateSupport(support.id, { [field]: value } as never);
    resultsStore.clear();
  };
  const changeType = (type: SupportType) => { modelStore.updateSupport(support.id, { type }); resultsStore.clear(); };
  const remove = () => modelStore.removeSupport(support.id);
  const numberRow = (label: string, field: keyof Support, unit: string, step = 100, title?: string) => <div className="property-row" title={title}><span>{label}:</span><input className="prop-input" type="number" step={step} value={Number(support[field] ?? 0)} onChange={(e) => update(String(field), e.currentTarget.value)} /><span>{unit}</span></div>;
  const dofs = support.dofRestraints ?? { tx: true, ty: true, tz: true, rx: true, ry: true, rz: true };
  const toggleDof = (dof: keyof typeof dofs) => {
    const next = { ...dofs, [dof]: !dofs[dof] };
    const all = next.tx && next.ty && next.tz && next.rx && next.ry && next.rz;
    const trans = next.tx && next.ty && next.tz && !next.rx && !next.ry && !next.rz;
    const none = !next.tx && !next.ty && !next.tz && !next.rx && !next.ry && !next.rz;
    modelStore.updateSupport(support.id, { dofRestraints: next, type: all ? 'fixed3d' : trans ? 'pinned3d' : none ? 'spring3d' : 'custom3d' } as never);
    resultsStore.clear(); resultsStore.clear3D();
  };
  const is3D = uiStore.analysisMode === '3d' || uiStore.analysisMode === 'pro';
  const roller = ['rollerX', 'rollerY', 'rollerZ'].includes(support.type);
  return <><h4>{t('prop.support')}</h4>{is3D ? <>
    <div className="property-row" style={{ flexWrap: 'wrap', gap: 4 }}>{(['tx','ty','tz','rx','ry','rz'] as const).map((dof, index) => <label key={dof} style={{ fontSize: '.7rem', display: 'inline-flex', alignItems: 'center', gap: 2, cursor: 'pointer' }}><input type="checkbox" checked={dofs[dof]} onChange={() => toggleDof(dof)} /> {['Fx','Fy','Fz','Mx','My','Mz'][index]}</label>)}</div>
    {!dofs.tx && numberRow('kx','kx','kN/m')}{!dofs.ty && numberRow('ky','ky','kN/m')}{!dofs.tz && numberRow('kz','kz','kN/m')}{!dofs.rx && numberRow('krx','krx','kN·m/rad')}{!dofs.ry && numberRow('kry','kry','kN·m/rad')}{!dofs.rz && numberRow('krz','krz','kN·m/rad')}
  </> : <>
    <div className="property-row"><span>{t('prop.type')}:</span><select value={roller ? 'roller' : support.type} onChange={(e) => changeType((e.currentTarget.value === 'roller' ? 'rollerX' : e.currentTarget.value) as SupportType)}><option value="fixed">{t('table.fixed')}</option><option value="pinned">{t('table.pinned')}</option><option value="roller">{t('prop.roller')}</option><option value="spring">{t('table.spring')}</option></select></div>
    {roller ? <><div className="property-row"><span>{t('prop.direction')}:</span><button className={`btn-small${support.type === 'rollerX' ? ' active' : ''}`} onClick={() => changeType('rollerX')}>{support.isGlobal !== false ? 'X' : 'i'}</button><button className={`btn-small${support.type !== 'rollerX' ? ' active' : ''}`} onClick={() => changeType('rollerZ')}>{support.isGlobal !== false ? 'Z' : 'j'}</button></div><div className="property-row"><span>{t('prop.axes')}:</span><button className={`btn-small${support.isGlobal !== false ? ' active' : ''}`} onClick={() => update('isGlobal', true)}>Gl</button><button className={`btn-small${support.isGlobal === false ? ' active' : ''}`} onClick={() => update('isGlobal', false)}>Loc</button></div>{numberRow('di','dx','m',.001,t('prop.imposedDispRollerTitle'))}{numberRow('α','angle','°',5)}</>
    : support.type === 'spring' ? <>{numberRow('kx','kx','kN/m')}{numberRow('ky','ky','kN/m')}{numberRow('kz','kz','kN·m/rad')}<div className="property-row"><span>{t('prop.axes')}:</span><button className={`btn-small${support.isGlobal !== false ? ' active' : ''}`} onClick={() => update('isGlobal', true)}>Gl</button><button className={`btn-small${support.isGlobal === false ? ' active' : ''}`} onClick={() => update('isGlobal', false)}>Loc</button></div>{numberRow('α','angle','°',5)}</>
    : <><h4>{t('prop.imposedDisp')}</h4>{(support.type === 'fixed' || support.type === 'pinned') && <>{numberRow('dx','dx','m',.001,t('prop.imposedDxTitle'))}{numberRow('dz','dy','m',.001,t('prop.imposedDyTitle'))}</>}{support.type === 'fixed' && numberRow('dθy','drz','rad',.001,t('prop.imposedDrzTitle'))}{numberRow('α','angle','°',5,t('prop.visualAngleTitle'))}</>}
  </>}<button className="btn-small btn-secondary" onClick={remove}>{t('prop.removeSupport')}</button></>;
}
