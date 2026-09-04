import { useSyncExternalStore } from 'react';
import type { CentralCore, ResolvedSection } from '../../../lib/engine/section-stress';
import { localeExternalStore, t } from '../../../lib/i18n/store.svelte';
import { fmt } from '../../../components/stress/fmt';
import './CentralCoreDetails.css';

type Props = {
  showCentralCoreInfo: boolean;
  onShowCentralCoreInfoChange: (show: boolean) => void;
  centralCore: CentralCore | null;
  resolved: ResolvedSection | undefined;
  kern: { z: [number, number]; y: [number, number] } | null;
};

const shapeKey = (shape: string) => {
  switch (shape) {
    case 'rect': return 'stress.shapeRect';
    case 'I': case 'H': return 'stress.shapeIH';
    case 'CHS': return 'stress.shapeCHS';
    case 'RHS': return 'stress.shapeRHS';
    case 'T': return 'stress.shapeT';
    case 'L': return 'stress.shapeL';
    case 'C': return 'stress.shapeC';
    default: return null;
  }
};

export function CentralCoreDetails({ showCentralCoreInfo, onShowCentralCoreInfoChange, centralCore, resolved, kern }: Props) {
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const labelKey = resolved ? shapeKey(resolved.shape) : null;
  const shapeLabel = resolved ? (labelKey ? t(labelKey) : resolved.shape) : '';
  const coreShape = resolved?.shape === 'CHS' ? t('stress.coreCircular') : resolved?.shape === 'I' || resolved?.shape === 'H' ? t('stress.coreHexagonal') : t('stress.coreDiamond');
  const noteKey = resolved?.shape === 'rect' ? 'stress.ccRectNote' : resolved?.shape === 'I' || resolved?.shape === 'H' ? 'stress.ccIHNote' : resolved?.shape === 'CHS' ? 'stress.ccCHSNote' : 'stress.ccDefaultNote';

  return <div className="react-central-core">
    <button className="ssp-section-toggle" onClick={() => onShowCentralCoreInfoChange(!showCentralCoreInfo)}>
      <span className="ssp-chevron">{showCentralCoreInfo ? '▾' : '▸'}</span>{t('stress.centralCore')}
      <span className="ssp-help ssp-help-inline" title={t('stress.centralCoreHelp')}>?</span>
    </button>
    {showCentralCoreInfo && centralCore && resolved && <div className="nc-detail">
      <p className="nc-desc" dangerouslySetInnerHTML={{ __html: t('stress.ccDesc1') }} />
      <p className="nc-desc">{t('stress.ccDesc2')}</p>
      {kern && <div className="nc-limits">
        <div className="nc-limit"><span className="nc-limit-label">{t('stress.ccLimitZ')}</span><span className="nc-limit-val">{(kern.z[0] * 1000).toFixed(1)} … {(kern.z[1] * 1000).toFixed(1)} mm</span></div>
        <div className="nc-limit"><span className="nc-limit-label">{t('stress.ccLimitY')}</span><span className="nc-limit-val">{(kern.y[0] * 1000).toFixed(1)} … {(kern.y[1] * 1000).toFixed(1)} mm</span></div>
      </div>}
      <div className="nc-divider" />
      <div className="nc-eq-title">{t('stress.ccEquations')}</div>
      <p className="nc-eq" dangerouslySetInnerHTML={{ __html: t('stress.ccEqDesc') }} />
      <div className="nc-formula">e = W / A = I / (A · d)</div>
      <p className="nc-eq">{t('stress.ccEqWhere')}</p>
      <div className="nc-divider" />
      <div className="nc-row"><span className="nc-label">{t('stress.sectionLabel')}</span><span className="nc-val">{shapeLabel}</span></div>
      <div className="nc-row"><span className="nc-label">{t('stress.ccShapeLabel')}</span><span className="nc-val">{coreShape}</span></div>
      <p className="nc-eq nc-shape-note" dangerouslySetInnerHTML={{ __html: t(noteKey) }} />
      <div className="nc-divider" />
      <div className="nc-row"><span className="nc-label">e<sub>y,max</sub> =</span><span className="nc-val mono">{fmt(centralCore.eyMax * 1000, 1)} mm</span></div>
      <div className="nc-row"><span className="nc-label">e<sub>z,max</sub> =</span><span className="nc-val mono">{fmt(centralCore.ezMax * 1000, 1)} mm</span></div>
    </div>}
  </div>;
}
