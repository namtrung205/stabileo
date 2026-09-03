import { t } from '../../lib/i18n/store.svelte';
import { commercialDefaultFor, findMaterialWithGrade, materialFromGrade } from '../../lib/data/commercial-default';
import type { MaterialPreset } from '../../lib/data/material-presets';
import type { SectionProperties } from '../../lib/data/section-shapes';
import type { GradeRegion } from '../../lib/data/structural-grades';
import { profileToSectionFull, type SteelProfile } from '../../lib/data/steel-profiles';
import { modelStore, resultsStore, uiStore } from '../../lib/store';
import { computeElementStress } from '../../lib/store/results.svelte';
import { toDisplay, unitLabel, type Quantity } from '../../lib/utils/units';
import { PairingNote } from './PairingNote';

type SectionRequest = {
  is3D: boolean;
  onprofileselect: (profile: SteelProfile, section: unknown, region?: string | null) => void;
  onshapeselect: (name: string, props: SectionProperties) => void;
  onamorphousselect: (data: { name: string; a: number; iy: number; iz: number; j?: number }) => void;
  onclose: () => void;
};

export function ElementDetails({ showResults = false }: { showResults?: boolean }) {
  const is3D = uiStore.analysisMode === '3d' || uiStore.analysisMode === 'pro';
  const us = uiStore.unitSystem; const dv = (v: number, q: Quantity) => toDisplay(v, q, us); const ul = (q: Quantity) => unitLabel(q, us);
  const row = (label: string, value: string) => <div className="property-row"><span>{label}:</span><span>{value}</span></div>;
  const applyCommercialGrade = (elementId: number, family?: string, region?: GradeRegion | null) => {
    const element = modelStore.elements.get(elementId); if (!element) return;
    const grade = commercialDefaultFor(family, modelStore.materials.get(element.materialId), region); if (!grade) return;
    const existing = findMaterialWithGrade(modelStore.materials.values(), grade.id);
    modelStore.updateElementMaterial(elementId, existing?.id ?? modelStore.addMaterial(materialFromGrade(grade)));
  };
  const chooseSection = (elementId: number) => {
    const request: SectionRequest = {
      is3D,
      onprofileselect: (profile, _section, region) => { const full = profileToSectionFull(profile); const sectionId = modelStore.addSection({ name: profile.name, profileFamily: profile.family, a: full.a, iz: full.iz, iy: full.iy, j: full.j, b: full.b, h: full.h, shape: full.shape, tw: full.tw, tf: full.tf, t: full.t }); modelStore.batch(() => { modelStore.updateElementSection(elementId, sectionId); applyCommercialGrade(elementId, profile.family, region as GradeRegion | null); }); },
      onshapeselect: (name, props) => { const sectionId = modelStore.addSection({ name, a: props.a, iz: props.iz, iy: props.iy, j: props.j, b: props.b, h: props.h, shape: props.shape as never, tw: props.tw, tf: props.tf, t: props.t }); modelStore.updateElementSection(elementId, sectionId); },
      onamorphousselect: (data) => { const sectionId = modelStore.addSection(data); modelStore.updateElementSection(elementId, sectionId); },
      onclose: () => undefined,
    };
    window.dispatchEvent(new CustomEvent('stabileo-open-section-changer', { detail: request }));
  };
  const chooseMaterial = (elementId: number) => window.dispatchEvent(new CustomEvent('stabileo-open-material-presets', { detail: { onselect: (preset: MaterialPreset) => { const materialId = modelStore.addMaterial({ name: preset.name, e: preset.e, nu: preset.nu, rho: preset.rho, fy: preset.fy, gradeId: preset.gradeId }); modelStore.updateElementMaterial(elementId, materialId); }, onclose: () => undefined } }));
  const updateAxis = (elementId: number, axis: 'x'|'y'|'z', raw: string) => { const element = modelStore.elements.get(elementId); if (!element) return; if (raw === '') return modelStore.updateElementLocalY(elementId, undefined, undefined, undefined); const values = { x: element.localYx ?? 0, y: element.localYy ?? 0, z: element.localYz ?? 0, [axis]: Number(raw) }; modelStore.updateElementLocalY(elementId, values.x, values.y, values.z); };
  return <div className="panel-section"><h3>{t('prop.selectedElement')}</h3>{[...uiStore.selectedElements].map((elementId) => {
    const element = modelStore.elements.get(elementId); if (!element) return null;
    const material = modelStore.materials.get(element.materialId); const section = modelStore.sections.get(element.sectionId);
    const forces3D = showResults && is3D && resultsStore.results3D ? resultsStore.getElementForces3D(elementId) : null;
    const forces = showResults && !forces3D ? resultsStore.getElementForces(elementId) : null;
    const stress = forces && section && material ? computeElementStress(forces, section, material) : null;
    return <div key={elementId}>{row('ID',String(element.id))}{row(t('prop.type'), element.type === 'frame' ? 'Frame' : 'Truss')}{row(t('prop.nodes'),`${element.nodeI} → ${element.nodeJ}`)}{row('L',`${dv(modelStore.getElementLength(elementId),'length').toFixed(3)} ${ul('length')}`)}
      <div className="property-row"><span>{t('prop.material')}:</span><div className="inline-select"><select value={element.materialId} onChange={(e) => modelStore.updateElementMaterial(elementId,Number(e.currentTarget.value))}>{[...modelStore.materials].map(([id,item]) => <option value={id} key={id}>{item.name}</option>)}</select><button className="icon-btn profile-icon-btn" onClick={() => chooseMaterial(elementId)} title={t('table.chooseMaterial')}>☷</button><button className="icon-btn" onClick={() => { uiStore.editingMaterialId = element.materialId; }} title={t('prop.editMaterial')}>✎</button><button className="icon-btn" onClick={() => { uiStore.editingMaterialId = modelStore.addMaterial({ name: t('table.newMaterial'), e: 200e6, nu: .3, rho: 78.5 }); }} title={t('prop.newMaterial')}>+</button></div></div>
      <div className="property-row"><span>{t('prop.section')}:</span><div className="inline-select"><select value={element.sectionId} onChange={(e) => modelStore.updateElementSection(elementId,Number(e.currentTarget.value))}>{[...modelStore.sections].map(([id,item]) => <option value={id} key={id}>{item.name}</option>)}</select><button className="icon-btn profile-icon-btn" onClick={() => chooseSection(elementId)} title={t('table.changeSection')}>☷</button><button className="icon-btn" onClick={() => { uiStore.editingSectionId = element.sectionId; }} title={t('prop.editSection')}>✎</button><button className="icon-btn" onClick={() => { uiStore.editingSectionId = modelStore.addSection({ name: t('table.newSection'), a: .01, iz: .000025, iy: .0001 }); }} title={t('prop.newSection')}>+</button></div></div>
      <PairingNote family={section?.profileFamily} gradeId={material?.gradeId} />
      <div className="property-row"><span>{t('prop.hinges')}{is3D ? ` ${t('prop.hinges3DSuffix')}` : ''}:</span><div className="hinge-toggles">{(['start','end'] as const).map((end) => { const active = end === 'start' ? element.releaseI?.mz === true : element.releaseJ?.mz === true; return <button className={`hinge-btn${active ? ' active' : ''}`} key={end} onClick={() => modelStore.toggleHinge(elementId,end)} title={(active ? t(end === 'start' ? 'prop.removeHingeI' : 'prop.removeHingeJ') : t(end === 'start' ? 'prop.addHingeI' : 'prop.addHingeJ')) + (is3D ? ` — ${t('prop.hinge3DDisclosure')}` : '')}><span className="hinge-icon">{active ? '○' : '●'}</span>{t(end === 'start' ? 'prop.nodeI' : 'prop.nodeJ')}</button>; })}</div></div>
      {is3D && element.type === 'frame' && <div className="property-row axis-editor"><span style={{fontWeight:600}}>{t('prop.localAxisY')}</span><div className="axis-fields">{(['x','y','z'] as const).map((axis) => <label key={axis}>Y{axis}: <input type="number" step=".1" value={element[`localY${axis}`] ?? ''} onChange={(e) => updateAxis(elementId,axis,e.currentTarget.value)} /></label>)}<button className="btn-small" onClick={() => modelStore.updateElementLocalY(elementId,undefined,undefined,undefined)} title={t('prop.autoDetectLocalY')}>Auto</button></div></div>}
      {forces3D && <><h4>{t('prop.internalForces3d')}</h4>{row('N_i',`${dv(forces3D.nStart,'force').toFixed(2)} ${ul('force')}`)}{row('N_j',`${dv(forces3D.nEnd,'force').toFixed(2)} ${ul('force')}`)}{row('Vy_i',`${dv(forces3D.vyStart,'force').toFixed(2)} ${ul('force')}`)}{row('Vy_j',`${dv(forces3D.vyEnd,'force').toFixed(2)} ${ul('force')}`)}{row('Vz_i',`${dv(forces3D.vzStart,'force').toFixed(2)} ${ul('force')}`)}{row('Vz_j',`${dv(forces3D.vzEnd,'force').toFixed(2)} ${ul('force')}`)}<h4>{t('prop.moments3d')}</h4>{(['mx','my','mz'] as const).flatMap((axis) => [row(`${axis.toUpperCase()}_i`,`${dv(-forces3D[`${axis}Start`],'moment').toFixed(2)} ${ul('moment')}`),row(`${axis.toUpperCase()}_j`,`${dv(-forces3D[`${axis}End`],'moment').toFixed(2)} ${ul('moment')}`)])}</>}
      {forces && <><h4>{t('prop.internalForces')}</h4>{row('M_i',`${dv(-forces.mStart,'moment').toFixed(2)} ${ul('moment')}`)}{row('M_j',`${dv(-forces.mEnd,'moment').toFixed(2)} ${ul('moment')}`)}{row('V_i',`${dv(forces.vStart,'force').toFixed(2)} ${ul('force')}`)}{row('V_j',`${dv(forces.vEnd,'force').toFixed(2)} ${ul('force')}`)}{row('N_i',`${dv(forces.nStart,'force').toFixed(2)} ${ul('force')}`)}{row('N_j',`${dv(forces.nEnd,'force').toFixed(2)} ${ul('force')}`)}{stress && <><h4>{t('prop.stresses')}</h4>{row('σ_max',`${dv(Math.max(stress.sigmaStart,stress.sigmaEnd),'stress').toFixed(1)} ${ul('stress')}`)}{row('τ_max',`${dv(Math.max(stress.tauStart,stress.tauEnd),'stress').toFixed(1)} ${ul('stress')}`)}{row('σ_vm',`${dv(Math.max(stress.vonMisesStart,stress.vonMisesEnd),'stress').toFixed(1)} ${ul('stress')}`)}{stress.ratio !== null && <div className="property-row"><span>Ratio:</span><span className={stress.ratio <= 1 ? 'ratio-ok' : 'ratio-warn'}>{(stress.ratio * 100).toFixed(1)}%</span></div>}</>}</>}
      <button className="btn-small btn-danger" onClick={() => modelStore.removeElement(elementId)}>{t('prop.deleteElement')}</button>
    </div>;
  })}</div>;
}
