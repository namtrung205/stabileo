import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  FAMILY_LIST, PROFILE_FAMILIES, searchProfiles,
  type ProfileFamily, type SteelProfile,
} from '../../lib/data/steel-profiles';
import {
  SECTION_SHAPES, THIN_SHAPES, SOLID_SHAPES,
  computeSectionProperties, generateSectionName,
  type ShapeType, type MaterialCategory,
} from '../../lib/data/section-shapes';
import { localeExternalStore, t } from '../../lib/i18n/store.svelte';
import { profileOutline } from '../../lib/section/outline';
import { modelStore, uiStore } from '../../lib/store';
import { crossSectionPath } from '../../lib/utils/section-drawing';
import { useStoreRevision } from '../store/useStoreRevision';
import './ProSectionsTab.css';

type MainTab = 'catalog' | 'builder';

const shapeForFamily = (family: ProfileFamily) => {
  if (family === 'IPE' || family === 'IPN') return 'I';
  if (family === 'HEB' || family === 'HEA') return 'H';
  if (family === 'UPN') return 'U';
  if (family === 'L') return 'L';
  if (family === 'RHS') return 'RHS';
  return 'CHS';
};

const fmtNum = (value: number) => {
  if (value === 0) return '0';
  if (Math.abs(value) < 0.001) return value.toExponential(2);
  return value.toPrecision(4);
};

/** React-owned PRO profile catalogue, section builder, and section list. */
export function ProSectionsTab() {
  useStoreRevision(modelStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const [activeTab, setActiveTab] = useState<MainTab>('catalog');
  const [activeFamily, setActiveFamily] = useState<ProfileFamily>('IPN');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<MaterialCategory>('solid');
  const [activeShape, setActiveShape] = useState<ShapeType>('concrete-rect');
  const [paramValues, setParamValues] = useState<Record<string, number>>({});

  const filteredProfiles = searchProfiles(searchQuery, activeFamily);
  const profilePreviewPath = useMemo(() => {
    const profiles = PROFILE_FAMILIES[activeFamily];
    if (!profiles?.length) return null;
    return profileOutline(profiles[Math.floor(profiles.length / 2)]).d;
  }, [activeFamily]);
  const categoryShapes = activeCategory === 'thin' ? THIN_SHAPES : SOLID_SHAPES;

  useEffect(() => {
    const shapes = activeCategory === 'thin' ? THIN_SHAPES : SOLID_SHAPES;
    if (shapes.length && !shapes.some((shape) => shape.id === activeShape)) setActiveShape(shapes[0].id);
  }, [activeCategory, activeShape]);

  useEffect(() => {
    const definition = SECTION_SHAPES.find((shape) => shape.id === activeShape);
    if (!definition) return;
    setParamValues(Object.fromEntries(definition.params.map((param) => [param.id, param.defaultValue])));
  }, [activeShape]);

  const shapeDef = SECTION_SHAPES.find((shape) => shape.id === activeShape);
  const computed = computeSectionProperties(activeShape, paramValues);
  const autoName = generateSectionName(activeShape, paramValues);
  const shapePreviewPath = useMemo(() => {
    if (!computed?.h || !computed.b) return null;
    return crossSectionPath({
      shape: (computed.shape ?? 'rect') as never,
      h: computed.h, b: computed.b, tw: computed.tw ?? 0, tf: computed.tf ?? 0,
      t: computed.t ?? 0, tl: computed.tl,
    });
  }, [computed]);
  const sections = [...modelStore.sections.values()];

  const addProfile = (profile: SteelProfile) => modelStore.addSection({
    name: profile.name, a: profile.a * 1e-4, iz: profile.iz * 1e-8, iy: profile.iy * 1e-8,
    b: profile.b / 1000, h: profile.h / 1000, shape: shapeForFamily(profile.family) as never,
    tw: profile.tw ? profile.tw / 1000 : undefined,
    tf: profile.tf ? profile.tf / 1000 : undefined,
    t: profile.t ? profile.t / 1000 : undefined,
  });
  const addBuiltSection = () => {
    if (!computed) return;
    modelStore.addSection({
      name: autoName, a: computed.a, iz: computed.iz, iy: computed.iy, j: computed.j,
      b: computed.b, h: computed.h, shape: computed.shape as never,
      tw: computed.tw, tf: computed.tf, t: computed.t,
    });
  };
  const removeSection = (id: number) => {
    if (!modelStore.removeSection(id)) uiStore.toast(t('table.cannotDeleteSection'), 'error');
  };

  return <div className="pro-sec">
    <details className="add-panel">
      <summary className="add-panel-summary">{t('pro.addSectionPanel')}</summary>
      <div className="add-panel-body">
        <div className="main-tabs">
          <button className={activeTab === 'catalog' ? 'active' : ''} onClick={() => setActiveTab('catalog')}>{t('dialog.chooseStandardProfile')}</button>
          <button className={activeTab === 'builder' ? 'active' : ''} onClick={() => setActiveTab('builder')}>{t('dialog.buildSection')}</button>
        </div>
        {activeTab === 'catalog' ? <div className="tab-body catalog-body">
          <div className="family-tabs">{FAMILY_LIST.map((family) => <button key={family}
            className={`fam-btn${activeFamily === family ? ' active' : ''}`}
            onClick={() => { setActiveFamily(family); setSearchQuery(''); }}>{family}</button>)}</div>
          <div className="catalog-top">
            {profilePreviewPath && <div className="profile-preview"><svg viewBox="-90 -90 180 180" className="preview-svg">
              <path d={profilePreviewPath} fill="none" stroke="var(--st-value)" strokeWidth="1.5" fillRule="evenodd" />
            </svg></div>}
            <div className="search-wrap"><input type="text" placeholder={t('search.profile')} value={searchQuery}
              onChange={(event) => setSearchQuery(event.currentTarget.value)} /></div>
          </div>
          <div className="profile-table-wrap"><table className="profile-table">
            <thead><tr><th>{t('table.profile')}</th><th>h</th><th>b</th><th>A (cm²)</th><th>Iy (cm⁴)</th><th>Iz (cm⁴)</th><th>kg/m</th></tr></thead>
            <tbody>
              {filteredProfiles.map((profile) => <tr className="profile-row" key={`${profile.family}-${profile.name}`} onClick={() => addProfile(profile)}>
                <td className="name-cell">{profile.name}</td><td>{profile.h}</td><td>{profile.b}</td><td>{profile.a.toFixed(1)}</td>
                <td>{profile.iy.toFixed(0)}</td><td>{profile.iz.toFixed(0)}</td><td>{profile.weight.toFixed(1)}</td>
              </tr>)}
              {!filteredProfiles.length && <tr><td colSpan={7} className="no-results">{t('search.noResults')}</td></tr>}
            </tbody>
          </table></div>
        </div> : <div className="tab-body builder-body">
          <div className="cat-toggle">
            <button className={activeCategory === 'solid' ? 'active' : ''} onClick={() => setActiveCategory('solid')}>{t('shapeBuilder.solid')}</button>
            <button className={activeCategory === 'thin' ? 'active' : ''} onClick={() => setActiveCategory('thin')}>{t('shapeBuilder.thin')}</button>
          </div>
          <div className="shape-tabs">{categoryShapes.map((shape) => <button key={shape.id}
            className={`shape-btn${activeShape === shape.id ? ' active' : ''}`} onClick={() => setActiveShape(shape.id)}>{t(shape.label)}</button>)}</div>
          {shapeDef && <div className="builder-content">
            {shapePreviewPath && <div className="shape-preview"><svg viewBox="-90 -90 180 180" className="preview-svg">
              <path d={shapePreviewPath} fill="none" stroke="var(--st-value)" strokeWidth="1.5" fillRule="evenodd" />
              <circle cx="0" cy="0" r="2" fill="var(--st-accent)" opacity="0.7" />
            </svg></div>}
            <p className="shape-desc">{t(shapeDef.description)}</p>
            <div className="param-grid">{shapeDef.params.map((param) => <label className="param-field" key={param.id}>
              <span>{t(param.label)}</span><div className="param-input"><input type="number" step={param.step}
                value={paramValues[param.id] ?? param.defaultValue} onChange={(event) => {
                  const value = Number.parseFloat(event.currentTarget.value);
                  if (!Number.isNaN(value)) setParamValues((current) => ({ ...current, [param.id]: value }));
                }} /><span className="param-unit">{param.unit}</span></div>
            </label>)}</div>
            {computed ? <><div className="results-box">
              <div className="result-row"><span>{t('field.resultName')}</span><span className="result-val">{autoName}</span></div>
              <div className="result-row"><span>A =</span><span className="result-val">{computed.a.toPrecision(4)} m²</span></div>
              <div className="result-row"><span>Iy =</span><span className="result-val">{computed.iy.toPrecision(4)} m⁴</span></div>
              <div className="result-row"><span>Iz =</span><span className="result-val">{computed.iz.toPrecision(4)} m⁴</span></div>
              {!!computed.j && <div className="result-row"><span>J =</span><span className="result-val">{computed.j.toPrecision(4)} m⁴</span></div>}
            </div><button className="confirm-btn" onClick={addBuiltSection}>{t('pro.addSection')}</button></>
              : <div className="results-box error"><span>{t('shapeBuilder.invalidDimensions')}</span></div>}
          </div>}
        </div>}
      </div>
    </details>
    <div className="sec-list">
      <div className="sec-list-header"><span className="sec-count">{t('pro.nSections').replace('{n}', String(sections.length))}</span></div>
      <div className="sec-table-wrap"><table className="sec-table">
        <thead><tr><th>ID</th><th>{t('pro.thName')}</th><th>A (m²)</th><th>Iz (m⁴)</th><th>Iy (m⁴)</th><th>J (m⁴)</th><th /></tr></thead>
        <tbody>
          {sections.map((section) => <tr key={section.id}><td className="col-id">{section.id}</td><td className="col-name">{section.name}</td>
            <td className="col-num">{fmtNum(section.a)}</td><td className="col-num">{fmtNum(section.iz)}</td>
            <td className="col-num">{fmtNum(section.iy ?? 0)}</td><td className="col-num">{fmtNum(section.j ?? 0)}</td>
            <td><button className="del-btn" onClick={() => removeSection(section.id)}>×</button></td></tr>)}
          {!sections.length && <tr><td colSpan={7} className="no-results">{t('pro.noSections')}</td></tr>}
        </tbody>
      </table></div>
    </div>
  </div>;
}
