import { useMemo, useState, useSyncExternalStore } from 'react';
import { FAMILY_LIST, PROFILE_FAMILIES, profileToSection, searchProfiles, type ProfileFamily, type SteelProfile } from '../../lib/data/steel-profiles';
import { localeExternalStore, t } from '../../lib/i18n/store';
import { profileOutline } from '../../lib/section/outline';
import './ProfileSelector.css';

type Props = {
  open: boolean;
  onSelect: (profile: SteelProfile, section: { a: number; iz: number; b: number; h: number }) => void;
  onClose: () => void;
};

export function ProfileSelector({ open, onSelect, onClose }: Props) {
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const [activeFamily, setActiveFamily] = useState<ProfileFamily>('IPN');
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => searchProfiles(query, activeFamily), [query, activeFamily]);
  const previewPath = useMemo(() => {
    const profiles = PROFILE_FAMILIES[activeFamily];
    if (!profiles?.length) return null;
    return profileOutline(profiles[Math.floor(profiles.length / 2)]).d;
  }, [activeFamily]);
  if (!open) return null;

  return <div className="profile-selector" role="dialog" aria-label={t('dialog.profileSelector')} onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}>
    <div className="profile-selector-backdrop" onClick={onClose} />
    <div className="profile-selector-modal">
      <div className="profile-selector-header"><h2>{t('dialog.steelProfiles')}</h2><button className="profile-selector-close" onClick={onClose}>✕</button></div>
      <div className="profile-selector-tabs">
        {FAMILY_LIST.map((family) => <button className={`profile-selector-tab${activeFamily === family ? ' active' : ''}`} onClick={() => { setActiveFamily(family); setQuery(''); }} key={family}>{family}</button>)}
      </div>
      {previewPath && <div className="profile-selector-preview"><svg viewBox="-90 -90 180 180" className="profile-selector-svg"><path d={previewPath} fill="none" stroke="#4ecdc4" strokeWidth="1.5" fillRule="evenodd" /></svg></div>}
      <div className="profile-selector-search"><input type="text" placeholder={t('search.profile')} value={query} onChange={(event) => setQuery(event.currentTarget.value)} /></div>
      <div className="profile-selector-table-wrap"><table className="profile-selector-table">
        <thead><tr><th>{t('table.profile')}</th><th>h (mm)</th><th>b (mm)</th><th>A (cm²)</th><th>Iz (cm⁴)</th><th>Iy (cm⁴)</th><th>kg/m</th></tr></thead>
        <tbody>
          {filtered.map((profile) => <tr className="profile-selector-row" onClick={() => onSelect(profile, profileToSection(profile))} key={profile.name}>
            <td className="profile-selector-name">{profile.name}</td><td>{profile.h}</td><td>{profile.b}</td><td>{profile.a.toFixed(1)}</td><td>{profile.iz.toFixed(0)}</td><td>{profile.iy.toFixed(0)}</td><td>{profile.weight.toFixed(1)}</td>
          </tr>)}
          {filtered.length === 0 && <tr><td colSpan={7} className="profile-selector-empty">{t('search.noResults')}</td></tr>}
        </tbody>
      </table></div>
    </div>
  </div>;
}
