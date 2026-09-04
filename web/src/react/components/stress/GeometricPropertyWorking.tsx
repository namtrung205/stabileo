import { useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import type { ResolvedSection } from '../../../lib/engine/section-stress';
import { centroidWorking, shearCentreWorking } from '../../../lib/engine/section-teaching';
import { localeExternalStore, t } from '../../../lib/i18n/store.svelte';
import { fmt } from '../../../components/stress/fmt';
import './GeometricPropertyWorking.css';

type Props = { showCentroidWork: boolean; onShowCentroidWorkChange: (show: boolean) => void; showShearCentreWork: boolean; onShowShearCentreWorkChange: (show: boolean) => void; resolved: ResolvedSection | undefined; engineShearCentre: [number, number] | null };
const mm = (value: number) => fmt(value * 1000, 1);
const cm2 = (value: number) => fmt(value * 1e4, 2);
const cm3 = (value: number) => fmt(value * 1e6, 1);

export function GeometricPropertyWorking({ showCentroidWork, onShowCentroidWorkChange, showShearCentreWork, onShowShearCentreWorkChange, resolved, engineShearCentre }: Props) {
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const work = resolved ? centroidWorking(resolved) : null;
  const sc = resolved ? shearCentreWorking(resolved) : null;
  return <div className="react-geometric-working">
    <button className="ssp-section-toggle" onClick={() => onShowCentroidWorkChange(!showCentroidWork)}><span className="ssp-chevron">{showCentroidWork ? '▾' : '▸'}</span>{t('teach.centroidTitle')}<Help title={t('teach.centroidHelp')} /></button>
    {showCentroidWork && work && <div className="tw">
      <p className="tw-lead">{t('teach.centroidLead')}</p>
      {(work.bySymmetry.horizontal || work.bySymmetry.vertical) && <p className="tw-sym">{work.bySymmetry.horizontal && work.bySymmetry.vertical ? t('teach.symBoth') : work.bySymmetry.vertical ? t('teach.symVertical') : t('teach.symHorizontal')}</p>}
      <div className="tw-table" role="table">
        <div className="tw-row tw-head" role="row"><span role="columnheader">{t('teach.colPart')}</span><span role="columnheader">A<sub>i</sub></span><span role="columnheader">y<sub>i</sub></span><span role="columnheader">A<sub>i</sub>·y<sub>i</sub></span></div>
        {work.parts.map((part, index) => <div className={`tw-row${part.area < 0 ? ' tw-void' : ''}`} role="row" key={`${part.labelKey}-${index}`}><span role="cell" className="tw-name">{t(part.labelKey)}</span><span role="cell">{cm2(part.area)}</span><span role="cell">{mm(part.yi)}</span><span role="cell">{cm3(part.area * part.yi)}</span></div>)}
        <div className="tw-row tw-total" role="row"><span role="cell">Σ</span><span role="cell">{cm2(work.totalArea)}</span><span role="cell" /><span role="cell">{cm3(work.sumAy)}</span></div>
      </div>
      <p className="tw-units">{t('teach.unitsNote')}</p>
      <Result formula={<>ȳ = ΣA<sub>i</sub>y<sub>i</sub> / ΣA<sub>i</sub></>} value={`${mm(work.yBar)} mm`} />
      {!work.bySymmetry.vertical && <Result formula={<>z̄ = ΣA<sub>i</sub>z<sub>i</sub> / ΣA<sub>i</sub></>} value={`${mm(work.zBar)} mm`} />}
      <p className="tw-note">{t(work.originKey)}</p><p className="tw-note">{t('teach.filletNote')}</p>
    </div>}
    <button className="ssp-section-toggle" onClick={() => onShowShearCentreWorkChange(!showShearCentreWork)}><span className="ssp-chevron">{showShearCentreWork ? '▾' : '▸'}</span>{t('teach.shearCentreTitle')}<Help title={t('teach.shearCentreHelp')} /></button>
    {showShearCentreWork && sc && <div className="tw">
      <p className="tw-lead">{t('teach.shearCentreLead')}</p><div className="tw-rule"><span className="tw-rule-badge">{t(sc.labelKey)}</span></div><p className="tw-note">{t(`${sc.labelKey}Note`)}</p>
      {sc.terms.length > 0 && <div className="tw-terms">{sc.terms.map((term, index) => <div className="tw-term" key={`${term.symbolKey}-${index}`}><span className="tw-term-sym">{t(term.symbolKey)}</span><span className="tw-term-val">{fmt(term.value)}<span className="tw-term-unit">{term.unit}</span></span></div>)}</div>}
      <Result formula={t('teach.scOffset')} value={`${mm(sc.ez)} · ${mm(sc.ey)} mm`} />
      {sc.outsideSection && <p className="tw-outside">{t('teach.scOutside')}</p>}
      {engineShearCentre && <Result className="tw-check" formula={t('teach.scEngine')} value={`${mm(engineShearCentre[0])} · ${mm(engineShearCentre[1])} mm`} />}
    </div>}
  </div>;
}

function Help({ title }: { title: string }) { return <span className="ssp-help ssp-help-inline" title={title}>?</span>; }
function Result({ formula, value, className = '' }: { formula: ReactNode; value: string; className?: string }) { return <div className={`tw-result ${className}`}><span className="tw-formula">{formula}</span><span className="tw-value">{value}</span></div>; }
