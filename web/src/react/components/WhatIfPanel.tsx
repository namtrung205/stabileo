import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { get2DDisplayNodalLoadMoment, get2DDisplayNodalLoadVertical } from '../../lib/geometry/coordinate-system';
import { solve } from '../../lib/engine/wasm-solver';
import { localeExternalStore, t } from '../../lib/i18n/store.svelte';
import { modelStore, resultsStore, uiStore } from '../../lib/store';
import type { ModelSnapshot } from '../../lib/store/history.svelte';
import { useStoreRevision } from '../store/useStoreRevision';
import './WhatIfPanel.css';

type Props = { docked?: boolean };

/** React owner for the Basic What-if analysis, in docked and floating layouts. */
export function WhatIfPanel({ docked = false }: Props) {
  useStoreRevision(uiStore);
  useStoreRevision(modelStore);
  useStoreRevision(resultsStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);

  const [baseline, setBaseline] = useState<ModelSnapshot | null>(null);
  const baselineRef = useRef<ModelSnapshot | null>(null);
  const [loadFactors, setLoadFactors] = useState<number[]>([]);
  const loadFactorsRef = useRef<number[]>([]);
  const [eFactor, setEFactor] = useState(1);
  const eFactorRef = useRef(1);
  const [aFactor, setAFactor] = useState(1);
  const aFactorRef = useRef(1);
  const [izFactor, setIzFactor] = useState(1);
  const izFactorRef = useRef(1);
  const [baselineE, setBaselineE] = useState(0);
  const [baselineA, setBaselineA] = useState(0);
  const [baselineIz, setBaselineIz] = useState(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const solveCurrentModel = useCallback(() => {
    if (uiStore.analysisMode === '3d' || uiStore.analysisMode === 'pro') {
      try {
        const isPro = uiStore.analysisMode === 'pro';
        const result = modelStore.solve3D(uiStore.includeSelfWeight, uiStore.axisConvention3D === 'leftHand', isPro);
        if (result && typeof result !== 'string') resultsStore.setResults3D(result);
      } catch { /* Keep the interactive panel responsive when a trial model cannot solve. */ }
      return;
    }
    const input = modelStore.buildSolverInput(uiStore.includeSelfWeight);
    if (!input) return;
    try {
      resultsStore.setResults(solve(input));
    } catch { /* Keep the previous result while the trial model is invalid. */ }
  }, []);

  const applyAndSolve = useCallback(() => {
    const original = baselineRef.current;
    if (!original) return;
    if (debounceTimer.current !== null) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null;
      const currentBaseline = baselineRef.current;
      if (!currentBaseline) return;
      modelStore.restore(currentBaseline);

      const loads = modelStore.model.loads;
      for (let index = 0; index < loads.length; index += 1) {
        const factor = loadFactorsRef.current[index] ?? 1;
        const load = loads[index];
        if (load.type === 'nodal') {
          const data = load.data as { fx: number; fz?: number; fy?: number; my?: number; mz?: number };
          const base = currentBaseline.loads[index]?.data as typeof data;
          if (base) {
            data.fx = base.fx * factor;
            data.fz = get2DDisplayNodalLoadVertical(base) * factor;
            data.my = get2DDisplayNodalLoadMoment(base) * factor;
          }
        } else if (load.type === 'distributed') {
          const data = load.data as { qI: number; qJ: number };
          const base = currentBaseline.loads[index]?.data as typeof data;
          if (base) { data.qI = base.qI * factor; data.qJ = base.qJ * factor; }
        } else if (load.type === 'pointOnElement') {
          const data = load.data as { p: number };
          const base = currentBaseline.loads[index]?.data as typeof data;
          if (base) data.p = base.p * factor;
        } else if (load.type === 'thermal') {
          const data = load.data as { dtUniform: number; dtGradient: number };
          const base = currentBaseline.loads[index]?.data as typeof data;
          if (base) { data.dtUniform = base.dtUniform * factor; data.dtGradient = base.dtGradient * factor; }
        } else if (load.type === 'nodal3d') {
          const data = load.data as { fx: number; fy: number; fz: number; mx: number; my: number; mz: number };
          const base = currentBaseline.loads[index]?.data as typeof data;
          if (base) {
            data.fx = base.fx * factor; data.fy = base.fy * factor; data.fz = base.fz * factor;
            data.mx = base.mx * factor; data.my = base.my * factor; data.mz = base.mz * factor;
          }
        } else if (load.type === 'distributed3d') {
          const data = load.data as { qYI: number; qYJ: number; qZI: number; qZJ: number };
          const base = currentBaseline.loads[index]?.data as typeof data;
          if (base) {
            data.qYI = base.qYI * factor; data.qYJ = base.qYJ * factor;
            data.qZI = base.qZI * factor; data.qZJ = base.qZJ * factor;
          }
        }
      }

      for (const material of modelStore.model.materials.values()) {
        const base = currentBaseline.materials.find(([id]) => id === material.id);
        if (base) material.e = base[1].e * eFactorRef.current;
      }
      for (const section of modelStore.model.sections.values()) {
        const base = currentBaseline.sections.find(([id]) => id === section.id);
        if (base) {
          section.a = base[1].a * aFactorRef.current;
          section.iz = base[1].iz * izFactorRef.current;
          (section as any).iy = ((base[1] as any).iy ?? base[1].iz) * izFactorRef.current;
          if (uiStore.analysisMode === '3d') (section as any).j = ((base[1] as any).j ?? base[1].iz * 2) * izFactorRef.current;
        }
      }
      solveCurrentModel();
    }, 60);
  }, [solveCurrentModel]);

  useEffect(() => {
    if (uiStore.showWhatIf && !baselineRef.current) {
      const original = modelStore.snapshot();
      baselineRef.current = original;
      setBaseline(original);
      const factors = modelStore.model.loads.map(() => 1);
      loadFactorsRef.current = factors;
      setLoadFactors(factors);
      eFactorRef.current = 1; setEFactor(1);
      aFactorRef.current = 1; setAFactor(1);
      izFactorRef.current = 1; setIzFactor(1);
      const firstMaterial = modelStore.model.materials.values().next().value;
      const firstSection = modelStore.model.sections.values().next().value;
      setBaselineE(firstMaterial?.e ?? 200000);
      setBaselineA(firstSection?.a ?? 0.01);
      setBaselineIz(firstSection?.iz ?? 1e-4);
    } else if (!uiStore.showWhatIf && baselineRef.current) {
      baselineRef.current = null;
      setBaseline(null);
    }
  }, [uiStore.showWhatIf]);

  useEffect(() => () => {
    if (debounceTimer.current !== null) clearTimeout(debounceTimer.current);
  }, []);

  const close = () => {
    if (debounceTimer.current !== null) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    const original = baselineRef.current;
    if (original) {
      modelStore.restore(original);
      solveCurrentModel();
      baselineRef.current = null;
      setBaseline(null);
    }
    uiStore.showWhatIf = false;
  };

  const resetAll = () => {
    const factors = loadFactorsRef.current.map(() => 1);
    loadFactorsRef.current = factors;
    setLoadFactors(factors);
    eFactorRef.current = 1; setEFactor(1);
    aFactorRef.current = 1; setAFactor(1);
    izFactorRef.current = 1; setIzFactor(1);
    applyAndSolve();
  };

  const loadLabel = (index: number) => {
    const load = baseline?.loads[index];
    if (!load) return t('whatif.loadFallback').replace('{n}', String(index + 1));
    if (load.type === 'nodal') {
      const data = load.data as { fx: number; fz?: number; fy?: number; my?: number; mz?: number };
      const parts: string[] = [];
      if (data.fx) parts.push(`Fx=${data.fx}`);
      if (get2DDisplayNodalLoadVertical(data)) parts.push(`Fz=${get2DDisplayNodalLoadVertical(data)}`);
      if (get2DDisplayNodalLoadMoment(data)) parts.push(`My=${get2DDisplayNodalLoadMoment(data)}`);
      return parts.join(', ') || `Nodal ${index + 1}`;
    }
    if (load.type === 'distributed') {
      const data = load.data as { qI: number; qJ: number };
      return data.qI === data.qJ ? `q=${data.qI}` : `q=${data.qI}→${data.qJ}`;
    }
    if (load.type === 'pointOnElement') return `P=${(load.data as { p: number }).p}`;
    if (load.type === 'thermal') return t('whatif.thermal');
    if (load.type === 'nodal3d') {
      const data = load.data as { nodeId: number; fx: number; fy: number; fz: number };
      const parts: string[] = [];
      if (data.fx) parts.push(`Fx=${data.fx}`);
      if (data.fy) parts.push(`Fy=${data.fy}`);
      if (data.fz) parts.push(`Fz=${data.fz}`);
      return parts.join(', ') || `3D N${data.nodeId}`;
    }
    if (load.type === 'distributed3d') return `Dist3D E${(load.data as { elementId: number }).elementId}`;
    return t('whatif.loadFallback').replace('{n}', String(index + 1));
  };

  const formatSci = (value: number) => Math.abs(value) >= 0.01 && Math.abs(value) < 10000 ? value.toPrecision(4) : value.toExponential(2);
  if (!uiStore.showWhatIf) return null;

  return <div className={`wif-panel${docked ? ' docked' : ''}`}>
    <div className="wif-header">
      <span className="wif-title">{t('whatif.title')}</span>
      <button className="wif-reset" onClick={resetAll} title={t('whatif.restoreOriginals')}>Reset</button>
      <button className="wif-close" onClick={close} title={t('whatif.closeAndRestore')}>✕</button>
    </div>
    <div className="wif-body">
      <div className="wif-section">
        <div className="wif-section-title">{t('whatif.loads')}</div>
        {loadFactors.map((factor, index) => <div className="wif-slider-row" key={index}>
          <label className="wif-label" title={loadLabel(index)}>{loadLabel(index)}</label>
          <input type="range" className="wif-range" min="0" max="3" step="0.05" value={factor} aria-label={loadLabel(index)} onChange={(event) => {
            const next = [...loadFactorsRef.current];
            next[index] = Number(event.currentTarget.value);
            loadFactorsRef.current = next;
            setLoadFactors(next);
            applyAndSolve();
          }} />
          <span className="wif-val">{factor.toFixed(2)}x</span>
        </div>)}
      </div>
      <div className="wif-section">
        <div className="wif-section-title">{t('whatif.material')}</div>
        <div className="wif-slider-row">
          <label className="wif-label">E</label>
          <input type="range" className="wif-range" min="0.1" max="5" step="0.05" value={eFactor} aria-label="E" onChange={(event) => { const next = Number(event.currentTarget.value); eFactorRef.current = next; setEFactor(next); applyAndSolve(); }} />
          <span className="wif-val" title={`${(baselineE * eFactor).toFixed(0)} MPa`}>{eFactor.toFixed(2)}x</span>
        </div>
        <div className="wif-current">E = {formatSci(baselineE * eFactor)} MPa</div>
      </div>
      <div className="wif-section">
        <div className="wif-section-title">{t('whatif.section')}</div>
        <div className="wif-slider-row">
          <label className="wif-label">A</label>
          <input type="range" className="wif-range" min="0.1" max="5" step="0.05" value={aFactor} aria-label="A" onChange={(event) => { const next = Number(event.currentTarget.value); aFactorRef.current = next; setAFactor(next); applyAndSolve(); }} />
          <span className="wif-val">{aFactor.toFixed(2)}x</span>
        </div>
        <div className="wif-current">A = {formatSci(baselineA * aFactor)} m²</div>
        <div className="wif-slider-row">
          <label className="wif-label">Iz</label>
          <input type="range" className="wif-range" min="0.1" max="5" step="0.05" value={izFactor} aria-label="Iz" onChange={(event) => { const next = Number(event.currentTarget.value); izFactorRef.current = next; setIzFactor(next); applyAndSolve(); }} />
          <span className="wif-val">{izFactor.toFixed(2)}x</span>
        </div>
        <div className="wif-current">Iz = {formatSci(baselineIz * izFactor)} m⁴</div>
      </div>
    </div>
  </div>;
}
