import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  openCalcReport,
  type AnalysisModeLabel,
  type CalcReportConfig,
  type CalcReportData,
  type ResultProvenance,
} from '../../lib/engine/calc-report';
import { localeExternalStore, t } from '../../lib/i18n/store';
import { modelStore, resultsStore, uiStore, verificationStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';
import './CalcReportDialog.css';

/** React owner for calculation-report configuration and generation. */
export function CalcReportDialog() {
  useStoreRevision(modelStore);
  useStoreRevision(resultsStore);
  useStoreRevision(uiStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);

  const [open, setOpen] = useState(false);
  const [projectName, setProjectName] = useState(modelStore.model.name || 'Structural Analysis');
  const [engineerName, setEngineerName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const handleOpen = () => {
      setProjectName(modelStore.model.name || 'Structural Analysis');
      setOpen(true);
    };
    window.addEventListener('stabileo-open-calc-report', handleOpen);
    return () => window.removeEventListener('stabileo-open-calc-report', handleOpen);
  }, []);

  const is3D = uiStore.analysisMode === '3d' || uiStore.analysisMode === 'pro';
  const hasResults = is3D ? resultsStore.results3D !== null : resultsStore.results !== null;
  const modeLabel: AnalysisModeLabel = uiStore.analysisMode === 'pro' ? 'PRO' : uiStore.analysisMode === '3d' ? '3D' : '2D';

  const deriveProvenance = (): ResultProvenance => {
    const view = resultsStore.activeView;
    if (view === 'envelope') return { kind: 'envelope' };
    if (view === 'combo') {
      const comboId = resultsStore.activeComboId;
      const combo = comboId !== null ? modelStore.model.combinations.find((item) => item.id === comboId) : undefined;
      return { kind: 'combo', comboName: combo?.name ?? `Combination ${comboId}` };
    }
    const caseId = resultsStore.activeCaseId;
    const caseName = caseId !== null ? modelStore.getLoadCaseName(caseId) : undefined;
    return { kind: 'single', caseName: caseName || undefined };
  };

  const generateReport = () => {
    if (!hasResults) return;
    const config: CalcReportConfig = {
      projectName,
      engineerName,
      companyName,
      date: new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }),
      notes,
    };

    const loads = modelStore.loads.map((load) => {
      const data = load.data as Record<string, any>;
      let description = '';
      const caseLabel = modelStore.getLoadCaseName(data.caseId ?? 1) || undefined;
      if (load.type === 'nodal' || load.type === 'nodal3d') {
        const parts: string[] = [];
        if (data.fx) parts.push(`Fx=${data.fx} kN`);
        if (data.fy) parts.push(`Fy=${data.fy} kN`);
        if (data.fz) parts.push(`Fz=${data.fz} kN`);
        if (data.my || data.mz) parts.push(`M=${data.my || data.mz} kN·m`);
        description = `Node ${data.nodeId}: ${parts.join(', ') || 'zero'}`;
      } else if (load.type === 'distributed' || load.type === 'distributed3d') {
        const qI = data.qI ?? (data.qZI || data.qYI || 0);
        const qJ = data.qJ ?? (data.qZJ || data.qYJ || 0);
        description = `Elem ${data.elementId}: q=${qI}→${qJ} kN/m`;
      } else if (load.type === 'pointOnElement') {
        description = `Elem ${data.elementId}: P=${data.p} kN at ${data.a} m`;
      } else if (load.type === 'thermal') {
        description = `Elem ${data.elementId}: ΔT=${data.dtUniform}°C, ΔTg=${data.dtGradient}°C`;
      } else {
        description = `${load.type} on ${data.elementId ?? data.nodeId ?? '?'}`;
      }
      return { type: load.type, description, caseLabel };
    });

    const combinations = modelStore.model.combinations.map((combination) => ({
      id: combination.id,
      name: combination.name,
      factors: combination.factors.map((factor) => ({
        caseName: modelStore.getLoadCaseName(factor.caseId) || `Case ${factor.caseId}`,
        factor: factor.factor,
      })),
    }));

    const report: CalcReportData = {
      config,
      is3D,
      analysisMode: modeLabel,
      provenance: deriveProvenance(),
      hasDesignChecks: verificationStore.hasResults,
      nodes: [...modelStore.nodes.values()],
      elements: [...modelStore.elements.values()],
      materials: [...modelStore.materials.values()],
      sections: [...modelStore.sections.values()],
      supports: [...modelStore.supports.values()],
      loads,
      loadCases: modelStore.model.loadCases ?? [],
      combinations,
      results2D: !is3D ? resultsStore.results ?? undefined : undefined,
      results3D: is3D ? resultsStore.results3D ?? undefined : undefined,
    };

    openCalcReport(report);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="dialog-overlay calc-report-overlay" onClick={() => setOpen(false)}>
      <div className="dialog" onClick={(event) => event.stopPropagation()}>
        <h3>{t('calcReport.title')}</h3>
        <div className="form">
          <label><span>{t('calcReport.projectName')}</span><input type="text" value={projectName} onChange={(event) => setProjectName(event.currentTarget.value)} /></label>
          <label><span>{t('calcReport.engineerName')}</span><input type="text" value={engineerName} onChange={(event) => setEngineerName(event.currentTarget.value)} placeholder={t('calcReport.optional')} /></label>
          <label><span>{t('calcReport.companyName')}</span><input type="text" value={companyName} onChange={(event) => setCompanyName(event.currentTarget.value)} placeholder={t('calcReport.optional')} /></label>
          <label><span>{t('calcReport.notes')}</span><textarea value={notes} onChange={(event) => setNotes(event.currentTarget.value)} rows={2} placeholder={t('calcReport.optional')} /></label>
        </div>
        {!hasResults && <div className="no-results-warning">{t('calcReport.noResults')}</div>}
        <div className="actions">
          <button className="btn-secondary" onClick={() => setOpen(false)}>{t('calcReport.cancel')}</button>
          <button className="btn-primary" onClick={generateReport} disabled={!hasResults}>{t('calcReport.generate')}</button>
        </div>
      </div>
    </div>
  );
}
