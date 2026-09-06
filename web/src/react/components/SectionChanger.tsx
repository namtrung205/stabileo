import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  PROFILE_FAMILIES,
  profileToSection,
  searchProfiles,
  type ProfileFamily,
  type SectionShape,
  type SteelProfile,
} from '../../lib/data/steel-profiles';
import {
  SECTION_SHAPES,
  SOLID_SHAPES,
  THIN_SHAPES,
  computeSectionProperties,
  generateSectionName,
  type MaterialCategory,
  type SectionProperties,
  type ShapeType,
} from '../../lib/data/section-shapes';
import { DESIGN_CODES, classifyFamily, familiesForCode, groupBySeries } from '../../lib/data/section-catalog';
import { localeExternalStore, t } from '../../lib/i18n/store';
import { profileOutline } from '../../lib/section/outline';
import { crossSectionPath } from '../../lib/utils/section-drawing';
import './SectionChanger.css';

type MainTab = 'profile' | 'shape' | 'amorphous';
type AmorphousSection = { name: string; a: number; iy: number; iz: number; j?: number };
type ProfileSection = { a: number; iy: number; iz: number; b: number; h: number };

export interface SectionChangerProps {
  open: boolean;
  onProfileSelect: (profile: SteelProfile, section: ProfileSection, region?: string | null) => void;
  onShapeSelect: (name: string, props: SectionProperties) => void;
  onAmorphousSelect?: (data: AmorphousSection) => void;
  onClose: () => void;
  initialTab?: 'profile' | 'shape';
  is3D?: boolean;
}

function defaultParams(shape: ShapeType): Record<string, number> {
  const definition = SECTION_SHAPES.find((candidate) => candidate.id === shape);
  return Object.fromEntries(definition?.params.map((param) => [param.id, param.defaultValue]) ?? []);
}

export function SectionChanger({
  open,
  onProfileSelect,
  onShapeSelect,
  onAmorphousSelect,
  onClose,
  initialTab = 'profile',
  is3D = false,
}: SectionChangerProps) {
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('profile');
  const [openSeries, setOpenSeries] = useState<string | null>(null);
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [activeFamily, setActiveFamily] = useState<ProfileFamily>('IPN');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<MaterialCategory>('thin');
  const initialShape = THIN_SHAPES[0]?.id ?? 'rect';
  const [activeShape, setActiveShape] = useState<ShapeType>(initialShape);
  const [paramValues, setParamValues] = useState<Record<string, number>>(() => defaultParams(initialShape));
  const [amorphName, setAmorphName] = useState(() => t('section.amorphousDefault'));
  const [amorphA, setAmorphA] = useState(0.005);
  const [amorphIy, setAmorphIy] = useState(0.00008);
  const [amorphIz, setAmorphIz] = useState(0.00002);
  const [amorphJ, setAmorphJ] = useState(0.0000001);

  const availableFamilies = useMemo(() => familiesForCode(activeCode), [activeCode]);
  const familyGroups = useMemo(() => groupBySeries(availableFamilies), [availableFamilies]);
  const activeCodeDef = useMemo(() => DESIGN_CODES.find((code) => code.id === activeCode) ?? null, [activeCode]);
  const activeClass = useMemo(() => classifyFamily(activeFamily), [activeFamily]);
  const filteredProfiles = useMemo(() => searchProfiles(searchQuery, activeFamily), [searchQuery, activeFamily]);
  const categoryShapes = activeCategory === 'thin' ? THIN_SHAPES : SOLID_SHAPES;
  const shapeDef = useMemo(() => SECTION_SHAPES.find((shape) => shape.id === activeShape), [activeShape]);
  const computed = useMemo(() => computeSectionProperties(activeShape, paramValues), [activeShape, paramValues]);
  const autoName = useMemo(() => generateSectionName(activeShape, paramValues), [activeShape, paramValues]);
  const amorphValid = amorphA > 0 && amorphIy > 0 && amorphIz > 0 && (!is3D || amorphJ > 0);

  const profilePreviewPath = useMemo(() => {
    const profiles = PROFILE_FAMILIES[activeFamily];
    if (!profiles?.length) return null;
    return profileOutline(profiles[Math.floor(profiles.length / 2)]).d;
  }, [activeFamily]);

  const shapePreviewPath = useMemo(() => {
    if (!computed?.h || !computed.b) return null;
    return crossSectionPath({
      shape: (computed.shape ?? 'rect') as SectionShape,
      h: computed.h,
      b: computed.b,
      tw: computed.tw ?? 0,
      tf: computed.tf ?? 0,
      t: computed.t ?? 0,
      tl: computed.tl,
    });
  }, [computed]);

  useEffect(() => {
    if (!open) return;
    setActiveMainTab(initialTab);
    requestAnimationFrame(() => dialogRef.current?.focus());
  }, [open, initialTab]);

  useEffect(() => {
    if (!availableFamilies.includes(activeFamily) && availableFamilies.length) {
      setActiveFamily(availableFamilies[0]);
    }
  }, [activeFamily, availableFamilies]);

  const chooseCategory = (category: MaterialCategory) => {
    setActiveCategory(category);
    const shapes = category === 'thin' ? THIN_SHAPES : SOLID_SHAPES;
    if (!shapes.some((shape) => shape.id === activeShape) && shapes[0]) {
      setActiveShape(shapes[0].id);
      setParamValues(defaultParams(shapes[0].id));
    }
  };

  const chooseShape = (shape: ShapeType) => {
    setActiveShape(shape);
    setParamValues(defaultParams(shape));
  };

  const handleProfileSelect = (profile: SteelProfile) => {
    onProfileSelect(profile, profileToSection(profile), activeCodeDef?.region ?? null);
  };

  const handleAmorphousSelect = () => {
    if (!amorphValid || !onAmorphousSelect) return;
    onAmorphousSelect({
      name: amorphName || t('section.amorphousDefault'),
      a: amorphA,
      iy: amorphIy,
      iz: amorphIz,
      j: is3D ? amorphJ : undefined,
    });
  };

  if (!open) return null;

  return <div
    ref={dialogRef}
    className="react-section-changer sc-overlay"
    role="dialog"
    aria-modal="true"
    aria-label={t('dialog.changeSection')}
    tabIndex={-1}
    onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}
  >
    <button type="button" className="sc-backdrop" onClick={onClose} aria-label={t('stress.close')} />
    <div className="sc-modal">
      <div className="sc-header">
        <h2>{t('dialog.changeSection')}</h2>
        <button type="button" className="sc-close" onClick={onClose} aria-label={t('stress.close')}>✕</button>
      </div>

      <div className="sc-main-tabs">
        <button type="button" className={activeMainTab === 'profile' ? 'active' : ''} onClick={() => setActiveMainTab('profile')}>{t('dialog.chooseStandardProfile')}</button>
        <button type="button" className={activeMainTab === 'shape' ? 'active' : ''} onClick={() => setActiveMainTab('shape')}>{t('dialog.buildSection')}</button>
        {onAmorphousSelect && <button type="button" className={activeMainTab === 'amorphous' ? 'active' : ''} onClick={() => setActiveMainTab('amorphous')}>{t('dialog.defineAmorphousSection')}</button>}
      </div>

      {activeMainTab === 'profile' && <div className="sc-body sc-profile-body">
        <p className="sc-route-note">{t('dialog.catalogueIsRolledSteel')}</p>
        <div className="code-bar">
          <span className="code-label">{t('cat.code')}</span>
          <button type="button" className={`code-btn${activeCode === null ? ' active' : ''}`} onClick={() => { setActiveCode(null); setSearchQuery(''); }}>{t('cat.allCodes')}</button>
          {DESIGN_CODES.map((code) => <button type="button" key={code.id} className={`code-btn${activeCode === code.id ? ' active' : ''}`} onClick={() => { setActiveCode(code.id); setSearchQuery(''); }}>{code.label}</button>)}
        </div>

        <div className="profile-layout">
          <div className="profile-aside">
            {profilePreviewPath && <div className="profile-preview">
              <svg viewBox="-90 -90 180 180" className="preview-svg">
                <path d={profilePreviewPath} fill="var(--st-value)" fillOpacity="0.12" stroke="var(--st-value)" strokeWidth="2" fillRule="evenodd" />
              </svg>
            </div>}
            <div className="profile-meta">
              <div className="meta-family">{activeFamily}</div>
              {activeClass && <>
                <div className="meta-row"><span className="meta-k">{t('cat.standard')}</span><span className="meta-v">{activeClass.standard}</span></div>
                <div className="meta-row"><span className="meta-k">{t('cat.geometry')}</span><span className={`meta-v${activeClass.fidelity === 'propertiesOnly' ? ' warn' : ''}`}>{activeClass.fidelity === 'exact' ? t('cat.geomExact') : t('cat.geomApprox')}</span></div>
              </>}
              {!!activeCodeDef?.missingFamilies?.length && <div className="meta-missing">{t('cat.missing')}: {activeCodeDef.missingFamilies.join(', ')}</div>}
            </div>
          </div>

          <div className="profile-families">
            {familyGroups.map((group) => {
              const isOpen = openSeries === group.series || group.families.includes(activeFamily);
              return <div className={`series-block${isOpen ? ' open' : ''}`} key={group.series}>
                <button type="button" className="series-head" onClick={() => setOpenSeries(isOpen ? null : group.series)} aria-expanded={isOpen}>
                  <span className="series-chevron">{isOpen ? '▾' : '▸'}</span>
                  {t(`cat.series.${group.series}`)}
                  <span className="series-count">{group.families.length}</span>
                </button>
                {isOpen && <div className="series-families">
                  {group.families.map((family) => <button
                    type="button"
                    key={family}
                    className={`tab-btn${activeFamily === family ? ' active' : ''}${classifyFamily(family)?.fidelity === 'propertiesOnly' ? ' approx' : ''}`}
                    title={classifyFamily(family)?.standard}
                    onClick={() => { setActiveFamily(family); setSearchQuery(''); }}
                  >{family}</button>)}
                </div>}
              </div>;
            })}
          </div>
        </div>

        <div className="profile-search">
          <input type="text" placeholder={t('search.profile')} value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
        </div>

        <div className="profile-table-wrap">
          <table className="profile-table">
            <thead><tr>
              <th>{t('table.profile')}</th><th>h (mm)</th><th>b (mm)</th><th>A (cm²)</th><th>Iy (cm⁴)</th><th>Iz (cm⁴)</th><th>kg/m</th>
            </tr></thead>
            <tbody>
              {filteredProfiles.map((profile) => <tr
                key={`${profile.family}-${profile.name}`}
                className="profile-row"
                tabIndex={0}
                onClick={() => handleProfileSelect(profile)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleProfileSelect(profile);
                  }
                }}
              >
                <td className="name-cell"><svg viewBox="-90 -90 180 180" className="row-thumb" aria-hidden="true"><path d={profileOutline(profile).d ?? undefined} fill="var(--st-value)" fillOpacity="0.25" stroke="var(--st-value)" strokeWidth="4" fillRule="evenodd" /></svg>{profile.name}</td>
                <td>{profile.h}</td><td>{profile.b}</td><td>{profile.a.toFixed(1)}</td><td>{profile.iy.toFixed(0)}</td><td>{profile.iz.toFixed(0)}</td><td>{profile.weight.toFixed(1)}</td>
              </tr>)}
              {filteredProfiles.length === 0 && <tr><td colSpan={7} className="no-results">{t('search.noResults')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>}

      {activeMainTab === 'amorphous' && <div className="sc-body sc-shape-body">
        <p className="shape-desc">{t('dialog.amorphousSectionDesc')}</p>
        <div className="param-grid">
          <label className="param-field"><span>{t('field.name')}</span><div className="param-input"><input type="text" value={amorphName} onChange={(event) => setAmorphName(event.target.value)} style={{ width: 120 }} /></div></label>
          <NumberField label={t('field.area')} value={amorphA} step={0.0001} unit="m²" onChange={setAmorphA} />
          <NumberField label={t('field.iyHoriz')} value={amorphIy} step={0.000001} unit="m⁴" onChange={setAmorphIy} />
          <NumberField label={t('field.izVert')} value={amorphIz} step={0.000001} unit="m⁴" onChange={setAmorphIz} />
          {is3D && <NumberField label={t('field.jTorsion')} value={amorphJ} step={0.000001} unit="m⁴" onChange={setAmorphJ} />}
        </div>
        <div className="amorph-warning">{t('warning.amorphousNoStress')}</div>
        {amorphValid ? <>
          <div className="results-box">
            <div className="result-row"><span>{t('field.resultName')}</span><span className="result-val">{amorphName}</span></div>
            <div className="result-row"><span>A =</span><span className="result-val">{amorphA.toPrecision(4)} m²</span></div>
            <div className="result-row"><span>Iy =</span><span className="result-val">{amorphIy.toPrecision(4)} m⁴</span></div>
            <div className="result-row"><span>Iz =</span><span className="result-val">{amorphIz.toPrecision(4)} m⁴</span></div>
            {is3D && <div className="result-row"><span>J =</span><span className="result-val">{amorphJ.toPrecision(4)} m⁴</span></div>}
          </div>
          <button type="button" className="confirm-btn" onClick={handleAmorphousSelect}>{t('action.applyAmorphousSection')}</button>
        </> : <div className="results-box error"><span>{t('error.allPositive')}</span></div>}
      </div>}

      {activeMainTab === 'shape' && shapeDef && <div className="sc-body sc-shape-body">
        <div className="category-tabs">
          <button type="button" className={activeCategory === 'thin' ? 'active' : ''} onClick={() => chooseCategory('thin')}>{t('shapeBuilder.thin')}</button>
          <button type="button" className={activeCategory === 'solid' ? 'active' : ''} onClick={() => chooseCategory('solid')}>{t('shapeBuilder.solid')}</button>
        </div>
        <div className="shape-tabs">
          {categoryShapes.map((shape) => <button type="button" key={shape.id} className={`tab-btn${activeShape === shape.id ? ' active' : ''}`} onClick={() => chooseShape(shape.id)}>{t(shape.label)}</button>)}
        </div>
        {shapePreviewPath && <div className="preview-container"><svg viewBox="-90 -90 180 180" className="section-preview"><path d={shapePreviewPath} fill="none" stroke="var(--st-value)" strokeWidth="1.5" fillRule="evenodd" /><circle cx="0" cy="0" r="2" fill="var(--st-accent)" opacity="0.7" /></svg></div>}
        <p className="shape-desc">{t(shapeDef.description)}</p>
        <div className="param-grid">
          {shapeDef.params.map((param) => <NumberField
            key={param.id}
            label={t(param.label)}
            value={paramValues[param.id] ?? param.defaultValue}
            step={param.step}
            unit={param.unit}
            onChange={(value) => setParamValues((current) => ({ ...current, [param.id]: value }))}
          />)}
        </div>
        {computed ? <>
          <div className="results-box">
            <div className="result-row"><span>{t('field.resultName')}</span><span className="result-val">{autoName}</span></div>
            <div className="result-row"><span>A =</span><span className="result-val">{computed.a.toPrecision(4)} m²</span></div>
            <div className="result-row"><span>Iz =</span><span className="result-val">{computed.iz.toPrecision(4)} m⁴</span></div>
          </div>
          <button type="button" className="confirm-btn" onClick={() => onShapeSelect(autoName, computed)}>{t('action.applySection')}</button>
        </> : <div className="results-box error"><span>{t('shapeBuilder.invalidDimensions')}</span></div>}
      </div>}
    </div>
  </div>;
}

function NumberField({ label, value, step, unit, onChange }: { label: string; value: number; step: number; unit: string; onChange: (value: number) => void }) {
  return <label className="param-field">
    <span>{label}</span>
    <div className="param-input">
      <input type="number" step={step} value={value} onChange={(event) => {
        const next = Number.parseFloat(event.target.value);
        if (!Number.isNaN(next)) onChange(next);
      }} />
      <span className="param-unit">{unit}</span>
    </div>
  </label>;
}

export interface SectionChangerRequest {
  is3D?: boolean;
  onprofileselect?: (profile: SteelProfile, section: ProfileSection, region?: string | null) => void;
  onshapeselect?: (name: string, props: SectionProperties) => void;
  onamorphousselect?: (data: AmorphousSection) => void;
  onclose?: () => void;
}

export function SectionChangerEventHost() {
  const [request, setRequest] = useState<SectionChangerRequest | null>(null);

  useEffect(() => {
    const open = (event: Event) => setRequest((event as CustomEvent<SectionChangerRequest>).detail);
    window.addEventListener('stabileo-open-section-changer', open);
    return () => window.removeEventListener('stabileo-open-section-changer', open);
  }, []);

  const close = useCallback(() => {
    request?.onclose?.();
    setRequest(null);
  }, [request]);

  return <SectionChanger
    open={request !== null}
    is3D={request?.is3D ?? false}
    onProfileSelect={(profile, section, region) => { request?.onprofileselect?.(profile, section, region); close(); }}
    onShapeSelect={(name, props) => { request?.onshapeselect?.(name, props); close(); }}
    onAmorphousSelect={(data) => { request?.onamorphousselect?.(data); close(); }}
    onClose={close}
  />;
}
