import { useSyncExternalStore } from 'react';
import type { MohrCircle } from '../../../lib/engine/section-stress';
import { localeExternalStore, t } from '../../../lib/i18n/store.svelte';
import { fmt } from '../../../components/stress/fmt';
import './MohrCircleDisplay.css';

type Props = {
  showMohr: boolean;
  onShowMohrChange: (show: boolean) => void;
  mohrData: MohrCircle | null;
  mohrSigma: number;
  mohrTau: number;
};

export function MohrCircleDisplay({ showMohr, onShowMohrChange, mohrData, mohrSigma, mohrTau }: Props) {
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const maxVal = mohrData ? Math.max(Math.abs(mohrData.sigma1), Math.abs(mohrData.sigma2), mohrData.radius, 1) : 1;
  const mScale = 80 / maxVal;

  return <div className="react-mohr-circle">
    <button className="ssp-section-toggle" onClick={() => onShowMohrChange(!showMohr)}>
      <span className="ssp-chevron">{showMohr ? '▾' : '▸'}</span>
      {t('stress.mohrCircle')}
      <span className="ssp-help ssp-help-inline" title={t('stress.mohrCircleHelp')}>?</span>
    </button>
    {showMohr && mohrData && <>
      <div className="ssp-svg-container">
        <svg viewBox="-110 -110 220 220" className="ssp-mohr-svg">
          <line x1="-100" y1="0" x2="100" y2="0" stroke="var(--st-text-3)" strokeWidth="0.5" />
          <line x1="0" y1="-100" x2="0" y2="100" stroke="var(--st-text-3)" strokeWidth="0.5" />
          <text x="95" y="-5" fill="var(--st-text-3)" fontSize="8">σ</text>
          <text x="5" y="-90" fill="var(--st-text-3)" fontSize="8">τ</text>
          <circle cx={mohrData.center * mScale} cy="0" r={mohrData.radius * mScale} fill="none" stroke="var(--st-value)" strokeWidth="1.5" opacity="0.8" />
          {mohrData.radius > 0.01 && <>
            <line x1={mohrData.center * mScale} y1="0" x2={mohrData.center * mScale} y2={-mohrData.radius * mScale} stroke="var(--st-value)" strokeWidth="0.5" strokeDasharray="2,2" opacity="0.5" />
            <text x={mohrData.center * mScale + 4} y={-mohrData.radius * mScale / 2} fill="var(--st-value)" fontSize="6" opacity="0.7">τ<tspan fontSize="4.5" dy="1.5">max</tspan></text>
          </>}
          {Math.abs(mohrData.center) > 0.01 && <>
            <line x1={mohrData.center * mScale} y1="2" x2={mohrData.center * mScale} y2="6" stroke="var(--st-text-3)" strokeWidth="0.5" />
            <text x={mohrData.center * mScale} y="13" fill="var(--st-text-3)" fontSize="5.5" textAnchor="middle">C</text>
          </>}
          <circle cx={mohrSigma * mScale} cy={-mohrTau * mScale} r="4" fill="var(--st-accent)" />
          <circle cx="0" cy={mohrTau * mScale} r="3" fill="var(--st-accent)" opacity="0.5" />
          <line x1={mohrSigma * mScale} y1={-mohrTau * mScale} x2="0" y2={mohrTau * mScale} stroke="var(--st-accent)" strokeWidth="0.8" strokeDasharray="3,2" />
          <circle cx={mohrData.sigma1 * mScale} cy="0" r="3" fill="var(--st-value)" />
          <circle cx={mohrData.sigma2 * mScale} cy="0" r="3" fill="var(--st-value)" />
          <text x={mohrData.sigma1 * mScale} y="12" fill="var(--st-value)" fontSize="7" textAnchor="middle">σ<tspan fontSize="5" dy="1">1</tspan></text>
          <text x={mohrData.sigma2 * mScale} y="12" fill="var(--st-value)" fontSize="7" textAnchor="middle">σ<tspan fontSize="5" dy="1">2</tspan></text>
          <text x={mohrSigma * mScale + 6} y={-mohrTau * mScale - 5} fill="var(--st-accent)" fontSize="5.5">(σ, τ)</text>
        </svg>
      </div>
      <div className="ssp-mohr-values">
        <div className="ssp-mohr-row"><span className="ssp-mohr-label">σ<sub>1</sub></span><span className="ssp-mohr-val">{fmt(mohrData.sigma1)} MPa</span><span className="ssp-help" title={t('stress.sigma1Help')}>?</span></div>
        <div className="ssp-mohr-row"><span className="ssp-mohr-label">σ<sub>2</sub></span><span className="ssp-mohr-val">{fmt(mohrData.sigma2)} MPa</span></div>
        <div className="ssp-mohr-row"><span className="ssp-mohr-label">θ<sub>p</sub></span><span className="ssp-mohr-val">{(mohrData.thetaP * 180 / Math.PI).toFixed(1)}°</span><span className="ssp-help" title={t('stress.thetaPHelp')}>?</span></div>
      </div>
    </>}
  </div>;
}
