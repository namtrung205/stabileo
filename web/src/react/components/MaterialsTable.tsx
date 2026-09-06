import { useState, useSyncExternalStore } from 'react';
import type { MaterialPreset } from '../../lib/data/material-presets';
import { localeExternalStore, t } from '../../lib/i18n/store';
import { modelStore, resultsStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';
import './EditorTables.css';
import './MaterialsTable.css';

export function MaterialsTable() {
  useStoreRevision(modelStore); useStoreRevision(resultsStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const materials = [...modelStore.materials.values()];
  function update(id: number, field: string, raw: string) { if (field === 'name') modelStore.updateMaterial(id, { name: raw }); else { const value = parseFloat(raw); if (!Number.isNaN(value)) { modelStore.updateMaterial(id, { [field]: value }); resultsStore.clear(); } } }
  function remove(id: number) { if (!modelStore.removeMaterial(id)) alert(t('table.cannotDeleteMaterial')); }
  function choosePreset(id: number) {
    window.dispatchEvent(new CustomEvent('stabileo-open-material-presets', { detail: { onselect: (preset: MaterialPreset) => { modelStore.updateMaterial(id, { name: preset.name, e: preset.e, nu: preset.nu, rho: preset.rho, fy: preset.fy, gradeId: preset.gradeId }); resultsStore.clear(); }, onclose: () => undefined } }));
  }
  return <div className="editor-data-grid react-materials-table"><table className="mat-list"><thead><tr><th>ID</th><th>{t('table.name')}</th><th className="col-actions" /></tr></thead><tbody>{materials.map((material) => { const open = expandedId === material.id; return <>
    <tr className={open ? 'expanded' : ''} key={`row-${material.id}`}><td className="id-cell">{material.id}</td><td className="name-cell"><input type="text" defaultValue={material.name} onChange={(event) => update(material.id, 'name', event.currentTarget.value)} /></td><td className="action-cell"><button className="row-action-btn primary" title={t('table.chooseMaterial')} onClick={() => choosePreset(material.id)}>☷</button><button className={`row-action-btn${open ? ' on' : ''}`} title={t('table.showProperties')} aria-expanded={open} onClick={() => setExpandedId(open ? null : material.id)}>ⓘ</button><button className="del" onClick={() => remove(material.id)}>✕</button></td></tr>
    {open && <tr className="detail-row" key={`detail-${material.id}`}><td colSpan={3}><div className="mat-detail"><label className="prop"><span>E (MPa)</span><input type="number" step="1000" defaultValue={material.e} onChange={(event) => update(material.id, 'e', event.currentTarget.value)} /></label><label className="prop"><span>ν</span><input type="number" step="0.01" defaultValue={material.nu} onChange={(event) => update(material.id, 'nu', event.currentTarget.value)} /></label><label className="prop"><span>ρ (kN/m³)</span><input type="number" step="0.1" defaultValue={material.rho} onChange={(event) => update(material.id, 'rho', event.currentTarget.value)} /></label><label className="prop"><span>fy (MPa)</span><input type="number" step="10" defaultValue={material.fy ?? ''} onChange={(event) => update(material.id, 'fy', event.currentTarget.value)} /></label></div></td></tr>}
  </>; })}</tbody></table><div className="table-footer"><button className="add-btn" onClick={() => modelStore.addMaterial({ name: t('table.newMaterial'), e: 200000, nu: 0.3, rho: 78.5 })}>{t('table.addMaterialCustom')}</button></div></div>;
}
