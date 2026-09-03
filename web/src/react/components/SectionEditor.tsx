import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { profileToSectionFull, type SteelProfile } from '../../lib/data/steel-profiles';
import { localeExternalStore, t } from '../../lib/i18n/store.svelte';
import { modelStore, uiStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';
import { ProfileSelector } from './ProfileSelector';
import './SectionEditor.css';

export function SectionEditor() {
  useStoreRevision(uiStore);
  useStoreRevision(modelStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const nameInput = useRef<HTMLInputElement>(null);
  const sectionId = uiStore.editingSectionId;
  const section = sectionId !== null ? modelStore.sections.get(sectionId) ?? null : null;
  const [showProfiles, setShowProfiles] = useState(false);
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [inertia, setInertia] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [rotation, setRotation] = useState('0');
  const [pendingShape, setPendingShape] = useState<string>();
  const [pendingTw, setPendingTw] = useState<number>();
  const [pendingTf, setPendingTf] = useState<number>();
  const [pendingT, setPendingT] = useState<number>();

  useEffect(() => {
    if (!section) return;
    setName(section.name); setArea(String(section.a)); setInertia(String(section.iz));
    setWidth(section.b != null ? String(section.b) : ''); setHeight(section.h != null ? String(section.h) : '');
    setRotation(String(section.rotation ?? 0)); setPendingShape(section.shape);
    setPendingTw(section.tw); setPendingTf(section.tf); setPendingT(section.t);
    const timer = window.setTimeout(() => nameInput.current?.select(), 0);
    return () => window.clearTimeout(timer);
  }, [sectionId]);

  if (!section || sectionId === null) return null;
  const close = () => { uiStore.editingSectionId = null; setShowProfiles(false); };
  const recalculate = (nextWidth: string, nextHeight: string) => {
    const b = Number.parseFloat(nextWidth);
    const h = Number.parseFloat(nextHeight);
    if (!Number.isNaN(b) && !Number.isNaN(h) && b > 0 && h > 0) {
      setArea((b * h).toPrecision(6));
      setInertia((b * h * h * h / 12).toPrecision(6));
    }
  };
  const confirm = () => {
    const a = Number.parseFloat(area);
    const iz = Number.parseFloat(inertia);
    if (Number.isNaN(a) || Number.isNaN(iz)) return;
    const updates: Record<string, any> = { name, a, iz };
    const b = Number.parseFloat(width); const h = Number.parseFloat(height);
    if (!Number.isNaN(b)) updates.b = b;
    if (!Number.isNaN(h)) updates.h = h;
    if (pendingShape) updates.shape = pendingShape;
    if (pendingTw != null) updates.tw = pendingTw;
    if (pendingTf != null) updates.tf = pendingTf;
    if (pendingT != null) updates.t = pendingT;
    const parsedRotation = Number.parseFloat(rotation);
    updates.rotation = !Number.isNaN(parsedRotation) && parsedRotation !== 0 ? parsedRotation : undefined;
    modelStore.updateSection(sectionId, updates);
    close();
  };
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') { event.preventDefault(); confirm(); }
    else if (event.key === 'Escape') { event.preventDefault(); close(); }
    event.stopPropagation();
  };
  const chooseProfile = (profile: SteelProfile) => {
    const full = profileToSectionFull(profile);
    setName(profile.name); setArea(full.a.toPrecision(6)); setInertia(full.iz.toPrecision(6));
    setWidth(full.b.toPrecision(4)); setHeight(full.h.toPrecision(4));
    setPendingShape(full.shape); setPendingTw(full.tw); setPendingTf(full.tf); setPendingT(full.t);
    setShowProfiles(false);
  };
  const field = (label: string, value: string, change: (value: string) => void, props: { type?: string; step?: string; min?: string; max?: string; inputRef?: React.Ref<HTMLInputElement>; recalc?: boolean } = {}) =>
    <label className="section-editor-field"><span>{label}</span><input ref={props.inputRef} type={props.type ?? 'number'} step={props.step} min={props.min} max={props.max} value={value}
      onChange={(event) => { const next = event.currentTarget.value; change(next); if (props.recalc) recalculate(label.startsWith('b') ? next : width, label.startsWith('h') ? next : height); }} onKeyDown={onKeyDown} /></label>;

  return <>
    <div className="section-editor-backdrop" onClick={close} />
    <div className="section-editor">
      <div className="section-editor-title">{t('secEdit.title').replace('{id}', String(sectionId))}</div>
      <button className="section-editor-profile" onClick={() => setShowProfiles(true)}>{t('secEdit.chooseProfile')}</button>
      {field(t('secEdit.name'), name, setName, { type: 'text', inputRef: nameInput })}
      {field('A (m²):', area, setArea, { step: '0.0001' })}
      {field(t('secEdit.iz'), inertia, setInertia, { step: '0.000001' })}
      <div className="section-editor-separator">{t('secEdit.rectangular')}</div>
      {field('b (m):', width, setWidth, { step: '0.001', recalc: true })}
      {field('h (m):', height, setHeight, { step: '0.001', recalc: true })}
      <div className="section-editor-separator">{t('secEdit.profileRotation')}</div>
      {field(t('secEdit.rotation'), rotation, setRotation, { step: '1', min: '0', max: '359' })}
      <div className="section-editor-buttons"><button className="section-editor-ok" onClick={confirm}>OK</button><button className="section-editor-cancel" onClick={close}>{t('secEdit.cancel')}</button></div>
    </div>
    <ProfileSelector open={showProfiles} onSelect={(profile) => chooseProfile(profile)} onClose={() => setShowProfiles(false)} />
  </>;
}
