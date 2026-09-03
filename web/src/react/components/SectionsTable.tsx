import { Fragment, useState, useSyncExternalStore } from 'react';
import { commercialDefaultFor, findMaterialWithGrade, materialFromGrade } from '../../lib/data/commercial-default';
import type { SectionProperties } from '../../lib/data/section-shapes';
import { profileToSectionFull, type SteelProfile } from '../../lib/data/steel-profiles';
import type { GradeRegion } from '../../lib/data/structural-grades';
import { localeExternalStore, t } from '../../lib/i18n/store.svelte';
import { resolveDrawingGeometry } from '../../lib/section/drawing';
import { solverProperties } from '../../lib/section/state';
import { modelStore, resultsStore, uiStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';
import './EditorTables.css';
import './SectionsTable.css';

const M2_TO_CM2 = 1e4;
const M4_TO_CM4 = 1e8;
const fmtA = (value: number) => (value * M2_TO_CM2).toPrecision(4);
const fmtI = (value: number) => (value * M4_TO_CM4).toPrecision(4);

function outlineOf(section: { canonical?: { kind: string; geometry?: unknown } }) {
  if (!section.canonical || section.canonical.kind !== 'geometry-backed') return null;
  const drawing = resolveDrawingGeometry(section as never);
  if (!drawing.ok) return null;
  const [yMin, zMin, yMax, zMax] = drawing.geometry.bbox;
  const scale = 80 / Math.max(yMax - yMin, zMax - zMin, 1e-12);
  const ring = (polygon: Array<[number, number]>) => polygon.map(([y, z], index) => `${index === 0 ? 'M' : 'L'}${(y * scale).toFixed(2)} ${(-z * scale).toFixed(2)}`).join(' ') + ' Z';
  return [...drawing.geometry.solids, ...drawing.geometry.holes].map(ring).join(' ');
}

export function SectionsTable() {
  useStoreRevision(modelStore); useStoreRevision(resultsStore); useStoreRevision(uiStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const sections = [...modelStore.sections.values()]; const is3D = uiStore.analysisMode === '3d';

  function update(id: number, field: string, raw: string) {
    if (field === 'name') { modelStore.updateSection(id, { name: raw }); return; }
    const value = parseFloat(raw); if (Number.isNaN(value)) return;
    const modelValue = field === 'a' ? value / M2_TO_CM2 : ['iy', 'iz', 'j'].includes(field) ? value / M4_TO_CM4 : value;
    modelStore.updateSection(id, { [field]: modelValue }); resultsStore.clear();
  }
  function applyCommercialGrade(sectionId: number, family: string | undefined, region: GradeRegion | null) {
    let materialId: number | null = null;
    for (const element of modelStore.elements.values()) {
      if (element.sectionId !== sectionId) continue;
      const grade = commercialDefaultFor(family, modelStore.materials.get(element.materialId), region);
      if (!grade) continue;
      if (materialId === null) materialId = findMaterialWithGrade(modelStore.materials.values(), grade.id)?.id ?? modelStore.addMaterial(materialFromGrade(grade));
      modelStore.updateElementMaterial(element.id, materialId);
    }
  }
  function openChanger(sectionId: number) {
    const close = () => undefined;
    window.dispatchEvent(new CustomEvent('stabileo-open-section-changer', { detail: {
      is3D,
      onprofileselect: (profile: SteelProfile, _section: unknown, region?: string | null) => {
        const full = profileToSectionFull(profile);
        modelStore.batch(() => { modelStore.updateSection(sectionId, { name: profile.name, profileFamily: profile.family, a: full.a, iz: full.iz, iy: full.iy, j: full.j, b: full.b, h: full.h, shape: full.shape, tw: full.tw, tf: full.tf, t: full.t }); applyCommercialGrade(sectionId, profile.family, region as GradeRegion | null); });
        resultsStore.clear(); close();
      },
      onshapeselect: (name: string, props: SectionProperties) => { modelStore.updateSection(sectionId, { name, a: props.a, iz: props.iz, iy: props.iy, j: props.j, b: props.b, h: props.h, shape: props.shape as never, tw: props.tw, tf: props.tf, t: props.t }); resultsStore.clear(); close(); },
      onamorphousselect: (data: { name: string; a: number; iy: number; iz: number; j?: number }) => { modelStore.updateSection(sectionId, { ...data, shape: undefined, b: undefined, h: undefined, tw: undefined, tf: undefined, t: undefined, profileFamily: undefined }); resultsStore.clear(); close(); },
      onclose: close,
    } }));
  }
  function remove(id: number) { if (!modelStore.removeSection(id)) alert(t('table.cannotDeleteSection')); }

  return <div className="editor-data-grid react-sections-table"><table className="sec-list"><thead><tr><th>ID</th><th>{t('table.name')}</th><th className="col-actions" /></tr></thead><tbody>{sections.map((section) => {
    const derived = section.canonical?.kind === 'geometry-backed'; const props = solverProperties(section); const open = expandedId === section.id; const outline = outlineOf(section);
    return <Fragment key={section.id}><tr className={open ? 'expanded' : ''}><td className="id-cell">{section.id}</td><td className="name-cell"><input type="text" defaultValue={section.name} onChange={(event) => update(section.id, 'name', event.currentTarget.value)} /></td><td className="action-cell"><button className="row-action-btn primary" title={t('table.changeSection')} onClick={() => openChanger(section.id)}>☷</button><button className={`row-action-btn${open ? ' on' : ''}`} title={t('table.showProperties')} aria-expanded={open} onClick={() => setExpandedId(open ? null : section.id)}>ⓘ</button><button className="del" onClick={() => remove(section.id)}>✕</button></td></tr>
      {open && <tr className="detail-row"><td colSpan={3}><div className="sec-detail">{outline && <div className="sec-thumb"><svg viewBox="-90 -90 180 180" aria-hidden="true"><path d={outline} fill="var(--st-value)" fillOpacity="0.12" stroke="var(--st-value)" strokeWidth="3" fillRule="evenodd" /></svg></div>}<div className="sec-props">{derived ? <><div className="prop"><span>A</span><span title={t('table.derivedFromGeometry')}>{fmtA(props.a)} cm²</span></div><div className="prop"><span>Iy</span><span title={t('table.derivedFromGeometry')}>{fmtI(props.iy ?? props.iz)} cm⁴</span></div><div className="prop"><span>Iz</span><span title={t('table.derivedFromGeometry')}>{fmtI(props.iz)} cm⁴</span></div>{is3D && <div className="prop"><span>J</span><span title={props.j == null ? t('table.torsionUnavailable') : t('table.derivedFromGeometry')}>{props.j == null ? '—' : `${fmtI(props.j)} cm⁴`}</span></div>}</> : <><label className="prop"><span>A (cm²)</span><input type="number" step="0.01" defaultValue={section.a * M2_TO_CM2} onChange={(event) => update(section.id, 'a', event.currentTarget.value)} /></label><label className="prop"><span>Iy (cm⁴)</span><input type="number" step="0.01" defaultValue={(section.iy ?? section.iz) * M4_TO_CM4} onChange={(event) => update(section.id, 'iy', event.currentTarget.value)} /></label><label className="prop"><span>Iz (cm⁴)</span><input type="number" step="0.01" defaultValue={section.iz * M4_TO_CM4} onChange={(event) => update(section.id, 'iz', event.currentTarget.value)} /></label>{is3D && <label className="prop"><span>J (cm⁴)</span><input type="number" step="0.01" defaultValue={(section.j ?? (section.iy ?? section.iz) * 0.001) * M4_TO_CM4} onChange={(event) => update(section.id, 'j', event.currentTarget.value)} /></label>}</>}<label className="prop"><span>{t('table.rotation')}</span><input type="number" step="1" min="0" max="359" defaultValue={section.rotation ?? 0} onChange={(event) => update(section.id, 'rotation', event.currentTarget.value)} /></label></div></div></td></tr>}
    </Fragment>;
  })}</tbody></table><div className="table-footer"><button className="add-btn" onClick={() => modelStore.addSection({ name: t('table.newSection'), a: 0.005, iz: 0.00002, iy: 0.00008 })}>{t('table.addSectionManual')}</button></div></div>;
}
