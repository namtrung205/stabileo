import { useEffect, useState, useSyncExternalStore } from 'react';
import { codeLore } from '../../lib/data/code-lore';
import { MATERIAL_CATEGORIES, bandSummary, categoryFamily, searchPresets, type MaterialPreset } from '../../lib/data/material-presets';
import { concreteCodes, timberCodes } from '../../lib/data/non-metal-grades';
import { codesForFamily, codesForMode, defaultCodeFor } from '../../lib/data/structural-grades';
import { localeExternalStore, t } from '../../lib/i18n/store';
import { uiStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';
import './MaterialPresetSelector.css';

interface MaterialPresetRequest {
  onselect: (preset: MaterialPreset) => void;
  onclose?: () => void;
}

/** Shared React material catalogue for table and element-property callers. */
export function MaterialPresetSelector() {
  useStoreRevision(uiStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);

  const [request, setRequest] = useState<MaterialPresetRequest | null>(null);
  const [activeCategory, setActiveCategory] = useState('acero');
  const [searchQuery, setSearchQuery] = useState('');
  const [codeId, setCodeId] = useState<string | null>(null);
  const [showLore, setShowLore] = useState(false);

  useEffect(() => {
    const handleOpen = (event: Event) => setRequest((event as CustomEvent<MaterialPresetRequest>).detail);
    window.addEventListener('stabileo-open-material-presets', handleOpen);
    return () => window.removeEventListener('stabileo-open-material-presets', handleOpen);
  }, []);

  const isPro = uiStore.analysisMode === 'pro';
  const family = categoryFamily(activeCategory);
  const codes = family
    ? codesForMode(codesForFamily(family), isPro).map((code) => ({ id: code.id, name: code.name }))
    : activeCategory === 'hormigon'
      ? concreteCodes().map((code) => ({ id: code, name: code }))
      : activeCategory === 'madera'
        ? timberCodes().map((code) => ({ id: code, name: code }))
        : [];
  const chosenCode = codeId ? codes.find((code) => code.id === codeId) : undefined;
  const defaultFamilyCode = family ? defaultCodeFor(family) : null;
  const activeCode = chosenCode
    ?? (defaultFamilyCode ? { id: defaultFamilyCode.id, name: defaultFamilyCode.name } : null)
    ?? codes.find((code) => code.name.startsWith('CIRSOC'))
    ?? codes[0]
    ?? null;
  const lore = codeLore(activeCode?.name);
  const filtered = searchPresets(searchQuery, activeCategory, { codeId: activeCode?.id, pro: isPro });

  useEffect(() => setShowLore(false), [activeCode?.id]);

  const close = () => {
    request?.onclose?.();
    setRequest(null);
  };
  const select = (preset: MaterialPreset) => {
    request?.onselect(preset);
    setRequest(null);
  };
  const pickCategory = (category: string) => {
    setActiveCategory(category);
    setSearchQuery('');
    setCodeId(null);
  };

  if (!request) return null;

  return (
    <div className="preset-overlay" onClick={close} onKeyDown={(event) => { if (event.key === 'Escape') close(); }}>
      <div className="preset-modal" onClick={(event) => event.stopPropagation()}>
        <div className="preset-header">
          <h3>{t('dialog.chooseMaterial')}</h3>
          <button className="close-btn" onClick={close}>✕</button>
        </div>

        <div className="preset-tabs">
          {MATERIAL_CATEGORIES.map((category) => (
            <button
              key={category.id}
              className={`tab-btn${activeCategory === category.id ? ' active' : ''}`}
              onClick={() => pickCategory(category.id)}
            >
              {t(category.label)}
            </button>
          ))}
        </div>

        {codes.length > 0 && <div className="preset-code">
          <label htmlFor="preset-code-sel">{t('matCode.label')}</label>
          <select id="preset-code-sel" value={activeCode?.id ?? ''} onChange={(event) => setCodeId(event.currentTarget.value)}>
            {codes.map((code) => <option value={code.id} key={code.id}>{code.name}</option>)}
          </select>
          {lore && <button
            className={`preset-lore-btn${showLore ? ' open' : ''}`}
            onClick={() => setShowLore((shown) => !shown)}
            aria-expanded={showLore}
            title={t('matCode.aboutCode')}
          >?</button>}
          <span className="preset-code-hint">{t('matCode.hint')}</span>
          {showLore && lore && <div className="preset-lore">
            <div className="preset-lore-row"><span>{t('matCode.body')}</span><span>{lore.body}</span></div>
            <div className="preset-lore-row"><span>{t('matCode.since')}</span><span>{lore.since}</span></div>
            <p className="preset-lore-trivia">{lore.trivia}</p>
          </div>}
        </div>}

        <div className="preset-search">
          <input type="text" placeholder={t('search.material')} value={searchQuery} onChange={(event) => setSearchQuery(event.currentTarget.value)} />
        </div>

        <div className="preset-list">
          {filtered.map((preset) => {
            const bands = bandSummary(preset);
            return <button className="preset-item" onClick={() => select(preset)} key={`${preset.gradeId ?? ''}-${preset.name}-${preset.standard ?? ''}`}>
              <span className="preset-name">
                {preset.name}
                {preset.standard && <span className="preset-std">{preset.standard}</span>}
                {preset.verification === 'typical' && <span className="preset-unver" title={t('grade.typicalHelp')}>~</span>}
              </span>
              <span className="preset-props">
                E={preset.e >= 1000 ? `${(preset.e / 1000).toFixed(0)}GPa` : `${preset.e}MPa`}
                {preset.fy ? <> fy={preset.fy}MPa{bands && <span className="preset-band" title={bands.full}>{bands.tail}</span>}</> : null}
                {preset.fu ? <> fu={preset.fu}MPa</> : null}
                {' '}ρ={preset.rho}kN/m³
              </span>
            </button>;
          })}
          {filtered.length === 0 && <p className="no-results">{t('search.noResults')}</p>}
        </div>
      </div>
    </div>
  );
}
