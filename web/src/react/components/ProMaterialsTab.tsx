import { useState, useSyncExternalStore } from 'react';
import { DAGG_MAX_MM, DAGG_MIN_MM } from '../../lib/codes/project-code-settings';
import { MATERIAL_CATEGORIES, searchPresets, type MaterialPreset } from '../../lib/data/material-presets';
import { localeExternalStore, t, tp } from '../../lib/i18n/store.svelte';
import { modelStore, uiStore } from '../../lib/store';
import { regulationsStore } from '../../lib/store/regulations.svelte';
import { useStoreRevision } from '../store/useStoreRevision';
import './ProMaterialsTab.css';

const MARGIN_MAX_MM = 50;

/** React-owned PRO material catalogue, custom form, and detailing properties. */
export function ProMaterialsTab() {
  useStoreRevision(modelStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const [activeCategory, setActiveCategory] = useState('hormigon');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [custom, setCustom] = useState({ name: '', e: '', nu: '', rho: '', fy: '' });
  const [aggregateError, setAggregateError] = useState<string | null>(null);
  const [marginError, setMarginError] = useState<string | null>(null);
  const filtered = searchPresets(searchQuery, activeCategory);
  const materials = [...modelStore.materials.values()];

  const addPreset = (preset: MaterialPreset) => modelStore.addMaterial({
    name: preset.name, e: preset.e, nu: preset.nu, rho: preset.rho, fy: preset.fy,
  });
  const addCustom = () => {
    const e = Number.parseFloat(custom.e);
    const nu = Number.parseFloat(custom.nu);
    const rho = Number.parseFloat(custom.rho);
    const fy = Number.parseFloat(custom.fy);
    if (!custom.name.trim() || Number.isNaN(e) || Number.isNaN(nu) || Number.isNaN(rho)) return;
    modelStore.addMaterial({ name: custom.name.trim(), e, nu, rho, fy: Number.isNaN(fy) ? undefined : fy });
    setCustom({ name: '', e: '', nu: '', rho: '', fy: '' });
    setShowCustom(false);
  };
  const setAggregate = (id: number, raw: string) => {
    setAggregateError(null);
    const trimmed = raw.trim();
    if (trimmed === '') {
      modelStore.updateMaterial(id, { maxAggregateSizeMm: null });
      regulationsStore.noteChange('detailingSpec');
      return;
    }
    const value = Number(trimmed.replace(',', '.'));
    if (!Number.isFinite(value) || value < DAGG_MIN_MM || value > DAGG_MAX_MM) {
      setAggregateError(tp('materials.aggregateInvalid', { min: DAGG_MIN_MM, max: DAGG_MAX_MM }));
      return;
    }
    modelStore.updateMaterial(id, { maxAggregateSizeMm: value });
    regulationsStore.noteChange('detailingSpec');
  };
  const setSpacingMargin = (id: number, raw: string) => {
    setMarginError(null);
    const trimmed = raw.trim();
    if (trimmed === '') {
      modelStore.updateMaterial(id, { spacingMarginMm: null });
      regulationsStore.noteChange('detailingSpec');
      return;
    }
    const value = Number(trimmed.replace(',', '.'));
    if (!Number.isFinite(value) || value < 0 || value > MARGIN_MAX_MM) {
      setMarginError(tp('materials.spacingMarginInvalid', { max: MARGIN_MAX_MM }));
      return;
    }
    modelStore.updateMaterial(id, { spacingMarginMm: value });
    regulationsStore.noteChange('detailingSpec');
  };
  const removeMaterial = (id: number) => {
    if (!modelStore.removeMaterial(id)) uiStore.toast(t('table.cannotDeleteMaterial'), 'error');
  };
  const setCustomField = (field: keyof typeof custom, value: string) => setCustom((current) => ({ ...current, [field]: value }));

  return <div className="pro-mat">
    <details className="add-panel">
      <summary className="add-panel-summary">{t('pro.addMaterialPanel')}</summary>
      <div className="add-panel-body">
        <div className="cat-tabs">{MATERIAL_CATEGORIES.map((category) => <button
          className={activeCategory === category.id ? 'active' : ''} key={category.id}
          onClick={() => { setActiveCategory(category.id); setSearchQuery(''); }}>
          {t(category.label)}
        </button>)}</div>
        <div className="search-wrap"><input type="text" placeholder={t('search.material')} value={searchQuery}
          onChange={(event) => setSearchQuery(event.currentTarget.value)} /></div>
        <div className="preset-list">
          {filtered.map((preset) => <button className="preset-item" onClick={() => addPreset(preset)} key={`${preset.name}-${preset.e}`}>
            <span className="preset-name">{preset.name}</span>
            <span className="preset-props">E={preset.e >= 1000 ? `${(preset.e / 1000).toFixed(0)}GPa` : `${preset.e}MPa`}
              {preset.fy ? <> fy={preset.fy}MPa</> : null} &nbsp; {t('field.density')}={preset.rho}</span>
          </button>)}
          {filtered.length === 0 && <p className="no-results">{t('search.noResults')}</p>}
        </div>
        <div className="custom-section">
          <button className="custom-toggle" onClick={() => setShowCustom(!showCustom)}>{showCustom ? '−' : '+'} {t('pro.customMaterial')}</button>
          {showCustom && <div className="custom-form">
            <div className="custom-row"><CustomField label={t('pro.thName')} value={custom.name} onChange={(value) => setCustomField('name', value)} placeholder="Ej: Acero S275" /></div>
            <div className="custom-row">
              <CustomField label="E (MPa)" type="number" value={custom.e} onChange={(value) => setCustomField('e', value)} placeholder="200000" />
              <CustomField label={t('field.poisson')} type="number" step="0.01" value={custom.nu} onChange={(value) => setCustomField('nu', value)} placeholder="0.3" />
            </div>
            <div className="custom-row">
              <CustomField label={`${t('field.density')} (kN/m³)`} type="number" step="0.1" value={custom.rho} onChange={(value) => setCustomField('rho', value)} placeholder="78.5" />
              <CustomField label="fy (MPa)" type="number" value={custom.fy} onChange={(value) => setCustomField('fy', value)} placeholder={t('pro.optional')} />
            </div>
            <button className="add-btn" onClick={addCustom}>{t('pro.addMaterial')}</button>
          </div>}
        </div>
      </div>
    </details>
    <div className="mat-list">
      <div className="mat-list-header"><span className="mat-count">{t('pro.nMaterials').replace('{n}', String(materials.length))}</span></div>
      <div className="mat-table-wrap">
        <table className="mat-table">
          <thead><tr>
            <th>ID</th><th>{t('pro.thName')}</th><th>E (MPa)</th><th>{t('field.poisson')}</th>
            <th>{t('field.density')}</th><th>fy</th>
            <th title={t('materials.aggregateHelp')}>{t('materials.aggregateShort')}</th>
            <th title={t('material.spacingMarginHelp')}>{t('material.spacingMarginShort')}</th><th />
          </tr></thead>
          <tbody>
            {materials.map((material) => <tr key={material.id}>
              <td className="col-id">{material.id}</td><td className="col-name">{material.name}</td>
              <td className="col-num">{material.e.toLocaleString()}</td><td className="col-num">{material.nu}</td>
              <td className="col-num">{material.rho}</td><td className="col-num">{material.fy ?? '—'}</td>
              <td className="col-num"><CommitInput key={`agg-${material.id}-${material.maxAggregateSizeMm ?? ''}`}
                testId={`mat-aggregate-${material.id}`} ariaLabel={t('materials.aggregate')}
                value={material.maxAggregateSizeMm ?? ''} placeholder={t('materials.aggregateNotStated')}
                onCommit={(value) => setAggregate(material.id, value)} /></td>
              <td className="col-num"><CommitInput key={`margin-${material.id}-${material.spacingMarginMm ?? ''}`}
                testId={`mat-spacing-margin-${material.id}`} ariaLabel={t('material.spacingMargin')}
                title={t('material.spacingMarginHelp')} value={material.spacingMarginMm ?? ''} placeholder="0"
                onCommit={(value) => setSpacingMargin(material.id, value)} /></td>
              <td><button className="del-btn" onClick={() => removeMaterial(material.id)}>×</button></td>
            </tr>)}
            {materials.length === 0 && <tr><td colSpan={9} className="no-results">{t('pro.noMaterials')}</td></tr>}
          </tbody>
        </table>
        {marginError && <p className="agg-error" data-testid="margin-error">{marginError}</p>}
        {aggregateError && <p className="agg-error" role="alert" data-testid="mat-aggregate-error">{aggregateError}</p>}
        <p className="agg-note">{t('materials.aggregateNote')}</p>
      </div>
    </div>
  </div>;
}

function CustomField({ label, value, onChange, placeholder, type = 'text', step }: {
  label: string; value: string; onChange(value: string): void; placeholder: string; type?: string; step?: string;
}) {
  return <label><span>{label}</span><input type={type} step={step} value={value} placeholder={placeholder}
    onChange={(event) => onChange(event.currentTarget.value)} /></label>;
}

function CommitInput({ value, onCommit, placeholder, ariaLabel, testId, title }: {
  value: string | number; onCommit(value: string): void; placeholder: string; ariaLabel: string; testId: string; title?: string;
}) {
  return <input className="agg-input" type="text" inputMode="decimal" data-testid={testId}
    aria-label={ariaLabel} title={title} defaultValue={value} placeholder={placeholder}
    onBlur={(event) => onCommit(event.currentTarget.value)} />;
}
