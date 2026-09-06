import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { localeExternalStore, t } from '../../lib/i18n/store';
import { modelStore, uiStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';
import './MaterialEditor.css';

export function MaterialEditor() {
  useStoreRevision(uiStore);
  useStoreRevision(modelStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const nameInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [elasticity, setElasticity] = useState('');
  const [poisson, setPoisson] = useState('');
  const [density, setDensity] = useState('');
  const [yieldStrength, setYieldStrength] = useState('');
  const materialId = uiStore.editingMaterialId;
  const material = materialId !== null ? modelStore.materials.get(materialId) ?? null : null;

  useEffect(() => {
    if (!material) return;
    setName(material.name);
    setElasticity(String(material.e));
    setPoisson(String(material.nu));
    setDensity(String(material.rho));
    setYieldStrength(material.fy != null ? String(material.fy) : '');
    const timer = window.setTimeout(() => nameInput.current?.select(), 0);
    return () => window.clearTimeout(timer);
  }, [materialId, material?.name, material?.e, material?.nu, material?.rho, material?.fy]);

  if (!material || materialId === null) return null;
  const close = () => { uiStore.editingMaterialId = null; };
  const confirm = () => {
    const e = Number.parseFloat(elasticity);
    const nu = Number.parseFloat(poisson);
    const rho = Number.parseFloat(density);
    if (Number.isNaN(e) || Number.isNaN(nu) || Number.isNaN(rho)) return;
    const fy = Number.parseFloat(yieldStrength);
    modelStore.updateMaterial(materialId, { name, e, nu, rho, fy: Number.isNaN(fy) ? undefined : fy });
    close();
  };
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') { event.preventDefault(); confirm(); }
    else if (event.key === 'Escape') { event.preventDefault(); close(); }
    event.stopPropagation();
  };

  const field = (label: string, value: string, setValue: (value: string) => void, props: { type?: string; step?: string; placeholder?: string; inputRef?: React.Ref<HTMLInputElement> } = {}) =>
    <label className="material-editor-field">
      <span>{label}</span>
      <input ref={props.inputRef} type={props.type ?? 'number'} step={props.step} value={value} placeholder={props.placeholder}
        onChange={(event) => setValue(event.currentTarget.value)} onKeyDown={onKeyDown} />
    </label>;

  return <>
    <div className="material-editor-backdrop" onClick={close} />
    <div className="material-editor">
      <div className="material-editor-title">{t('matEdit.title').replace('{id}', String(materialId))}</div>
      {field(t('matEdit.name'), name, setName, { type: 'text', inputRef: nameInput })}
      {field('E (MPa):', elasticity, setElasticity, { step: '1000' })}
      {field('ν:', poisson, setPoisson, { step: '0.01' })}
      {field('ρ (kN/m³):', density, setDensity, { step: '0.1' })}
      {field('fy (MPa):', yieldStrength, setYieldStrength, { step: '10', placeholder: t('matEdit.optional') })}
      <div className="material-editor-buttons">
        <button className="material-editor-ok" onClick={confirm}>OK</button>
        <button className="material-editor-cancel" onClick={close}>{t('matEdit.cancel')}</button>
      </div>
    </div>
  </>;
}
