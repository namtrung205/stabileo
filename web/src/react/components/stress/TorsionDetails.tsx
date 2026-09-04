import { useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import type { ResolvedSection } from '../../../lib/engine/section-stress';
import { computeTorsionFlow, closedVersusOpen, compareTorsionTheories } from '../../../lib/engine/torsion-flow';
import { warpingProperties, withLambda, warpingResponse } from '../../../lib/engine/warping';
import { localeExternalStore, t } from '../../../lib/i18n/store.svelte';
import { fmt } from '../../../components/stress/fmt';
import './TorsionDetails.css';

type Props = { showTorsion: boolean; onShowTorsionChange: (show: boolean) => void; torque: number; resolved: ResolvedSection | undefined; length: number; e?: number; nu: number };
const FORMULA: Record<string, string> = { cauchy: 'stress.tt.formulaCauchy', bredt: 'stress.tt.formulaBredt', saintVenant: 'stress.tt.formulaSV' };

export function TorsionDetails({ showTorsion, onShowTorsionChange, torque, resolved, length, e, nu }: Props) {
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const [restraint, setRestraint] = useState<'cantilever' | 'simple'>('cantilever');
  const flow = resolved ? computeTorsionFlow(torque, resolved) : null;
  const slitPenalty = resolved ? closedVersusOpen(resolved) : null;
  const theories = resolved ? compareTorsionTheories(torque, resolved) : [];
  const governingTau = theories.find((theory) => theory.governs)?.tauMax ?? null;
  const warp = resolved && e !== undefined ? withLambda(warpingProperties(resolved), e, nu) : null;
  const response = resolved && warp && e !== undefined ? warpingResponse(resolved, warp, torque, length, e, restraint, nu) : null;
  return <div className="react-torsion-details">
    <button className="ssp-section-toggle" onClick={() => onShowTorsionChange(!showTorsion)}><span className="ssp-chevron">{showTorsion ? '▾' : '▸'}</span>{t('stress.torsion')}<Help title={t('stress.torsionHelp')} /></button>
    {showTorsion && (!flow ? <p className="ssp-tor-empty">{t('stress.torsionNone')}</p> : <div className="ssp-tor">
      <div className="ssp-tor-theory"><span className="ssp-tor-badge">{t(flow.labelKey)}</span></div>
      <TorRow label="T" value={fmt(Math.abs(torque))} unit="kN·m" />
      <TorRow label={<>τ<sub>max</sub></>} value={fmt(flow.tauMax)} unit="MPa" peak />
      <TorRow label="J" value={fmt(flow.j * 1e8)} unit="cm⁴" />
      <p className="ssp-tor-note">{t(`${flow.labelKey}Note`)}</p>
      <div className="ssp-tt"><div className="ssp-tt-head">{t('stress.tt.title')}<Help title={t('stress.tt.help')} /></div>
        {theories.map((theory) => <div className={`ssp-tt-row${!theory.applies ? ' na' : ''}${theory.governs ? ' governs' : ''}`} key={theory.id}>
          <div className="ssp-tt-top"><span className="ssp-tt-name">{t(`stress.tt.${theory.id}`)}</span><span className="ssp-tt-formula">{t(FORMULA[theory.id])}</span>{theory.governs && <span className="ssp-tt-badge">{t('stress.tt.governs')}</span>}</div>
          {theory.applies && theory.tauMax !== null ? <><div className="ssp-tt-value"><span className="ssp-tt-tau">τ<sub>max</sub> = {fmt(theory.tauMax)}<span className="ssp-tor-unit">MPa</span></span>{!theory.governs && governingTau && governingTau > 1e-9 ? <span className="ssp-tt-delta">{t('stress.tt.vsGoverning').replace('{pct}', (theory.tauMax / governingTau * 100).toFixed(0))}</span> : null}</div>{theory.terms.length > 0 && <div className="ssp-tt-terms">{theory.terms.map((term, index) => <span className="ssp-tt-term" key={`${term.symbol}-${index}`}>{term.symbol} = {fmt(term.value)} {term.unit}</span>)}</div>}</> : <div className="ssp-tt-value ssp-tt-na">{t('stress.tt.na')}</div>}
          <p className="ssp-tt-why">{t(theory.reasonKey)}</p>
        </div>)}
      </div>
      {warp && warp.cw > 0 ? <div className="ssp-tor-warp"><div className="ssp-tor-warp-head">{t('warp.title')}</div>
        <div className="ssp-tor-row"><span className="ssp-tor-label">C<sub>w</sub></span><span className="ssp-tor-val">{fmt(warp.cw * 1e12)}<span className="ssp-tor-unit">cm⁶</span>{warp.fidelity === 'thinWall' && <span className="ssp-tor-approx" title={t('warp.thinWallHelp')}>≈</span>}</span></div>
        {warp.lambda && <><TorRow label={<>λ = √(EC<sub>w</sub>/GJ)</>} value={fmt(warp.lambda)} unit="m" /><TorRow label="L / λ" value={fmt(length / warp.lambda)} /></>}
        {response && <><div className="ssp-tor-restraint"><button className={`ssp-tor-rtab${restraint === 'cantilever' ? ' active' : ''}`} onClick={() => setRestraint('cantilever')}>{t('warp.case.cantilever')}</button><button className={`ssp-tor-rtab${restraint === 'simple' ? ' active' : ''}`} onClick={() => setRestraint('simple')}>{t('warp.case.simple')}</button></div><TorqueSplit saintVenantShare={response.saintVenantShare} /><TorRow label={<>σ<sub>w</sub></>} value={fmt(response.sigmaW)} unit="MPa" peak /><p className="ssp-tor-note ssp-tor-warn">{t('warp.addsToBending')}</p></>}
        <p className="ssp-tor-note">{t(warp.labelKey + 'Note')}</p>
      </div> : resolved && e === undefined ? <div className="ssp-tor-warp"><div className="ssp-tor-warp-head">{t('warp.title')}</div><div className="ssp-tt-value ssp-tt-na">{t('warp.noModulus')}</div></div> : null}
      {slitPenalty !== null && <p className="ssp-tor-slit">{t('stress.torsionSlit').replace('{factor}', slitPenalty.toFixed(0))}</p>}
    </div>)}
  </div>;
}

function Help({ title }: { title: string }) { return <span className="ssp-help ssp-help-inline" title={title}>?</span>; }
function TorRow({ label, value, unit, peak = false }: { label: ReactNode; value: string; unit?: string; peak?: boolean }) { return <div className={`ssp-tor-row${peak ? ' ssp-tor-peak' : ''}`}><span className="ssp-tor-label">{label}</span><span className="ssp-tor-val">{value}{unit && <span className="ssp-tor-unit">{unit}</span>}</span></div>; }
function TorqueSplit({ saintVenantShare }: { saintVenantShare: number }) { const sv = Math.round(saintVenantShare * 100); return <div className="ssp-tor-split" title={t('warp.splitHelp')}><div className="ssp-tor-bar"><div className="ssp-tor-sv" style={{ width: `${sv}%` }} /></div><div className="ssp-tor-legend"><span>{t('warp.bySaintVenant').replace('{pct}', String(sv))}</span><span>{t('warp.byWarping').replace('{pct}', String(100 - sv))}</span></div></div>; }
