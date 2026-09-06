import { useSyncExternalStore } from 'react';
import type { SectionStressResult } from '../../../lib/engine/section-stress';
import type { SectionStressResult3D } from '../../../lib/engine/section-stress-3d';
import { localeExternalStore, t } from '../../../lib/i18n/store';
import { fmt } from '../../../components/stress/fmt';
import './StressStateDetails.css';

type Props = {
  showTensional: boolean;
  onShowTensionalChange: (show: boolean) => void;
  is3D: boolean;
  isMassive: boolean;
  analysis2D: SectionStressResult | null;
  analysis3D: SectionStressResult3D | null;
};

const ratioClass = (ok: boolean) => `ssp-ratio ${ok ? 'ok' : 'fail'}`;

export function StressStateDetails({ showTensional, onShowTensionalChange, is3D, isMassive, analysis2D, analysis3D }: Props) {
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const result = is3D ? analysis3D : analysis2D;

  return <div className="react-stress-state">
    <button className="ssp-section-toggle" onClick={() => onShowTensionalChange(!showTensional)}>
      <span className="ssp-chevron">{showTensional ? '▾' : '▸'}</span>{t('stress.stressState')}
    </button>
    {showTensional && <div className="ssp-stress-detail">
      {is3D && analysis3D ? <ThreeDimensionalState analysis={analysis3D} /> : analysis2D ? <TwoDimensionalState analysis={analysis2D} isMassive={isMassive} /> : null}
      {result && <FailureRows failure={result.failure} mohrTauMax={result.mohr.tauMax} />}
      {analysis3D?.failure.fy && is3D ? <YieldBar fy={analysis3D.failure.fy} ok={Boolean(analysis3D.failure.ok)} ratio={analysis3D.failure.ratioVM} /> : null}
      {analysis2D?.failure.fy && !is3D ? <YieldBar fy={analysis2D.failure.fy} ok={Boolean(analysis2D.failure.ok)} ratio={analysis2D.failure.ratioVM} /> : null}
      {is3D && analysis3D?.neutralAxis.exists && <><div className="ssp-divider" /><div className="ssp-stress-row"><span>{t('stress.neutralAxis')}</span><span className="ssp-stress-val">{analysis3D.neutralAxis.slope === Infinity ? `vertical (z = ${fmt(analysis3D.neutralAxis.intercept * 1000)} mm)` : Math.abs(analysis3D.neutralAxis.slope) < .001 ? `horizontal (y = ${fmt(analysis3D.neutralAxis.intercept * 1000)} mm)` : `θ = ${(analysis3D.neutralAxis.angle * 180 / Math.PI).toFixed(1)}°`}</span><Help title={t('stress.neutralAxis3dHelp')} /></div></>}
      {!is3D && analysis2D?.neutralAxisY !== null && analysis2D && <><div className="ssp-divider" /><div className="ssp-stress-row"><span>{t('stress.neutralAxis')}</span><span className="ssp-stress-val">y = {fmt(analysis2D.neutralAxisY * 1000, 1)} mm</span><Help title={t('stress.neutralAxis2dHelp')} /></div></>}
    </div>}
  </div>;
}

function ThreeDimensionalState({ analysis }: { analysis: SectionStressResult3D }) {
  return <>
    <div className="ssp-stress-row"><span>σ<sub>x</sub> =</span><span className={`ssp-stress-val${analysis.sigmaAtFiber > 0 ? ' tension' : analysis.sigmaAtFiber < 0 ? ' compression' : ''}`}>{fmt(analysis.sigmaAtFiber)} MPa</span><Help title={t('stress.sigmaBiaxHelp')} /></div>
    <div className="ssp-stress-row"><span>τ<sub>Vy</sub> =</span><span className="ssp-stress-val">{fmt(analysis.tauVyAtFiber)} MPa</span><span className="ssp-stress-hint">(Jourawski, {t('stress.planeXY')})</span></div>
    <div className="ssp-stress-row"><span>τ<sub>Vz</sub> =</span><span className="ssp-stress-val">{fmt(analysis.tauVzAtFiber)} MPa</span><span className="ssp-stress-hint">(Jourawski, {t('stress.planeXZ')})</span></div>
    {Math.abs(analysis.tauTorsion) > .001 && <div className="ssp-stress-row"><span>τ<sub>T</sub> =</span><span className="ssp-stress-val">{fmt(analysis.tauTorsion)} MPa</span><span className="ssp-stress-hint">(torsion{analysis.resolved.shape === 'RHS' || analysis.resolved.shape === 'CHS' ? ' Bredt' : ' St-Venant'})</span></div>}
    <div className="ssp-stress-row"><span>τ<sub>total</sub> =</span><span className="ssp-stress-val">{fmt(analysis.tauTotal)} MPa</span><Help title={t('stress.tauTotalHelp')} /></div>
    <div className="ssp-divider" />
  </>;
}

function TwoDimensionalState({ analysis, isMassive }: { analysis: SectionStressResult; isMassive: boolean }) {
  const maxAbsTau = Math.max(...analysis.distribution.map((point) => Math.abs(point.tau)));
  return <>
    <div className="ssp-stress-row"><span>σ =</span><span className={`ssp-stress-val${analysis.sigmaAtY > 0 ? ' tension' : analysis.sigmaAtY < 0 ? ' compression' : ''}`}>{fmt(analysis.sigmaAtY)} MPa</span><Help title={t('stress.sigma2dHelp')} /></div>
    <div className="ssp-stress-row"><span>τ<sub>xy</sub> =</span><span className="ssp-stress-val">{fmt(analysis.tauAtY)} MPa</span><Help title={isMassive ? t('stress.tauMassiveHelp') : t('stress.tauThinHelp')} /></div>
    {maxAbsTau > .01 && <div className="ssp-stress-row ssp-tau-note"><span>τ<sub>max</sub> =</span><span className="ssp-stress-val">{fmt(maxAbsTau)} MPa</span><span className="ssp-stress-hint">({t('stress.neutralAxisLabel')})</span></div>}
    <div className="ssp-stress-row ssp-2d-note"><span>{t('stress.note2dTauOnly')}</span></div>
    <div className="ssp-stress-row ssp-2d-note"><span>{t('stress.note2dNoTorsion')}</span></div>
    <div className="ssp-divider" />
  </>;
}

type Failure = SectionStressResult['failure'];
function FailureRows({ failure, mohrTauMax }: { failure: Failure; mohrTauMax: number }) {
  return <>
    <div className="ssp-stress-row"><span>σ<sub>vm</sub> =</span><span className="ssp-stress-val">{fmt(failure.vonMises)} MPa</span>{failure.ratioVM !== null && <span className={ratioClass(Boolean(failure.ok))}>({(failure.ratioVM * 100).toFixed(1)}% f<sub>y</sub>)</span>}<Help title={t('stress.vonMisesHelp')} /></div>
    <div className="ssp-stress-row"><span>Tresca:</span><span className="ssp-stress-val">τ<sub>max</sub> = {fmt(mohrTauMax)} MPa</span>{failure.ratioTresca !== null && <span className={ratioClass(failure.ratioTresca <= 1)}>({(failure.ratioTresca * 100).toFixed(1)}% f<sub>y</sub>)</span>}<Help title={t('stress.trescaHelp')} /></div>
    <div className="ssp-stress-row"><span>Rankine:</span><span className="ssp-stress-val">σ<sub>max</sub> = {fmt(failure.rankine)} MPa</span>{failure.ratioRankine !== null && <span className={ratioClass(failure.ratioRankine <= 1)}>({(failure.ratioRankine * 100).toFixed(1)}% f<sub>y</sub>)</span>}<Help title={t('stress.rankineHelp')} /></div>
  </>;
}

function YieldBar({ fy, ok, ratio }: { fy: number; ok: boolean; ratio: number | null }) { return <><div className="ssp-fy-bar"><div className={`ssp-fy-fill ${ok ? 'ok' : 'fail'}`} style={{ width: `${Math.min(100, (ratio ?? 0) * 100)}%` }} /></div><div className="ssp-fy-legend"><span>0</span><span>f<sub>y</sub> = {fy} MPa</span></div></>; }
function Help({ title }: { title: string }) { return <span className="ssp-help" title={title}>?</span>; }
