import { useState, useSyncExternalStore, type ChangeEvent, type ReactNode } from 'react';
import {
  TWO_D_DISPLACEMENT_LABELS,
  TWO_D_REACTION_LABELS,
  get2DDisplayDisplacementVertical,
  get2DDisplayMoment,
  get2DDisplayReactionVertical,
  get2DDisplayRotation,
} from '../../lib/geometry/coordinate-system';
import { localeExternalStore, t } from '../../lib/i18n/store';
import { modelStore, resultsStore, uiStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';
import './ResultsTable.css';

type ResultsSubTab = 'displacements' | 'reactions' | 'forces' | 'diagnostics';

function Table({ head, children }: { head: ReactNode; children: ReactNode }) {
  return <table><thead><tr>{head}</tr></thead><tbody>{children}</tbody></table>;
}

export function ResultsTable() {
  useStoreRevision(modelStore);
  useStoreRevision(uiStore);
  useStoreRevision(resultsStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const [resultsSubTab, setResultsSubTab] = useState<ResultsSubTab>('displacements');

  const allDiagnostics: Array<{ source: string; type: string; message: string; severity: string }> = [];
  const assemblyDiagnostics = uiStore.analysisMode === '3d' ? resultsStore.diagnostics3D : resultsStore.diagnostics;
  for (const diagnostic of assemblyDiagnostics) {
    const elementIds = diagnostic.elementIds?.length
      ? t('results.elemLabel').replace('{id}', String(diagnostic.elementIds[0]))
      : '';
    allDiagnostics.push({ source: elementIds || diagnostic.source, type: diagnostic.code, message: diagnostic.message, severity: diagnostic.severity });
  }
  const solverDiagnostics = uiStore.analysisMode === '3d' ? resultsStore.solverDiagnostics3D : resultsStore.solverDiagnostics;
  for (const diagnostic of solverDiagnostics) {
    allDiagnostics.push({ source: diagnostic.source, type: diagnostic.code, message: diagnostic.message, severity: diagnostic.severity });
  }
  const caseKeys = [...resultsStore.perCase.keys()];

  function changeCase(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.currentTarget.value;
    if (value === 'single') { resultsStore.activeCaseId = null; resultsStore.activeView = 'single'; }
    else if (value === 'envelope') { resultsStore.activeCaseId = null; resultsStore.activeView = 'envelope'; }
    else if (value.startsWith('case_')) resultsStore.activeCaseId = Number(value.slice(5));
    else if (value.startsWith('combo_')) {
      resultsStore.activeCaseId = null;
      resultsStore.activeView = 'combo';
      resultsStore.activeComboId = Number(value.slice(6));
    }
  }

  const caseValue = resultsStore.activeView === 'envelope' ? 'envelope'
    : resultsStore.activeCaseId !== null ? `case_${resultsStore.activeCaseId}`
    : resultsStore.activeView === 'combo' ? `combo_${resultsStore.activeComboId ?? ''}`
    : 'single';

  let content: ReactNode = null;
  if (resultsStore.results3D && uiStore.analysisMode === '3d') {
    const result = resultsStore.results3D;
    if (resultsSubTab === 'displacements') content = <Table head={<><th>{t('table.nodeLabel')}</th><th>ux (mm)</th><th>uy (mm)</th><th>uz (mm)</th><th>rx (mrad)</th><th>ry (mrad)</th><th>rz (mrad)</th></>}>
      {result.displacements.map((item) => <tr key={item.nodeId}><td className="id-cell">{item.nodeId}</td><td className="num">{(item.ux * 1000).toFixed(4)}</td><td className="num">{(item.uy * 1000).toFixed(4)}</td><td className="num">{(item.uz * 1000).toFixed(4)}</td><td className="num">{(item.rx * 1000).toFixed(4)}</td><td className="num">{(item.ry * 1000).toFixed(4)}</td><td className="num">{(item.rz * 1000).toFixed(4)}</td></tr>)}
    </Table>;
    else if (resultsSubTab === 'reactions') content = <Table head={<><th>{t('table.nodeLabel')}</th><th>Rx (kN)</th><th>Ry (kN)</th><th>Rz (kN)</th><th>Mx (kN&middot;m)</th><th>My (kN&middot;m)</th><th>Mz (kN&middot;m)</th></>}>
      {result.reactions.map((item) => <tr key={item.nodeId}><td className="id-cell">{item.nodeId}</td><td className="num">{item.fx.toFixed(4)}</td><td className="num">{item.fy.toFixed(4)}</td><td className="num">{item.fz.toFixed(4)}</td><td className="num">{(-item.mx).toFixed(4)}</td><td className="num">{(-item.my).toFixed(4)}</td><td className="num">{(-item.mz).toFixed(4)}</td></tr>)}
    </Table>;
    else if (resultsSubTab === 'forces') content = <Table head={<><th>{t('table.elemLabel')}</th><th>Ni</th><th>Nj</th><th>Vyi</th><th>Vyj</th><th>Vzi</th><th>Vzj</th><th>Mxi</th><th>Mxj</th><th>Myi</th><th>Myj</th><th>Mzi</th><th>Mzj</th></>}>
      {result.elementForces.map((item) => <tr key={item.elementId}><td className="id-cell">{item.elementId}</td><td className="num">{item.nStart.toFixed(2)}</td><td className="num">{item.nEnd.toFixed(2)}</td><td className="num">{item.vyStart.toFixed(2)}</td><td className="num">{item.vyEnd.toFixed(2)}</td><td className="num">{item.vzStart.toFixed(2)}</td><td className="num">{item.vzEnd.toFixed(2)}</td><td className="num">{(-item.mxStart).toFixed(2)}</td><td className="num">{(-item.mxEnd).toFixed(2)}</td><td className="num">{(-item.myStart).toFixed(2)}</td><td className="num">{(-item.myEnd).toFixed(2)}</td><td className="num">{(-item.mzStart).toFixed(2)}</td><td className="num">{(-item.mzEnd).toFixed(2)}</td></tr>)}
    </Table>;
  } else if (resultsStore.results) {
    const result = resultsStore.results;
    if (resultsSubTab === 'displacements') content = <Table head={<><th>{t('table.nodeLabel')}</th><th>{TWO_D_DISPLACEMENT_LABELS.horizontal} (mm)</th><th>{TWO_D_DISPLACEMENT_LABELS.vertical} (mm)</th><th>{TWO_D_DISPLACEMENT_LABELS.rotation} (mrad)</th></>}>
      {result.displacements.map((item) => <tr key={item.nodeId}><td className="id-cell">{item.nodeId}</td><td className="num">{(item.ux * 1000).toFixed(4)}</td><td className="num">{(get2DDisplayDisplacementVertical(item) * 1000).toFixed(4)}</td><td className="num">{(get2DDisplayRotation(item) * 1000).toFixed(4)}</td></tr>)}
    </Table>;
    else if (resultsSubTab === 'reactions') content = <Table head={<><th>{t('table.nodeLabel')}</th><th>{TWO_D_REACTION_LABELS.horizontal} (kN)</th><th>{TWO_D_REACTION_LABELS.vertical} (kN)</th><th>{TWO_D_REACTION_LABELS.moment} (kN&middot;m)</th></>}>
      {result.reactions.map((item) => <tr key={item.nodeId}><td className="id-cell">{item.nodeId}</td><td className="num">{item.rx.toFixed(4)}</td><td className="num">{get2DDisplayReactionVertical(item).toFixed(4)}</td><td className="num">{(-get2DDisplayMoment(item)).toFixed(4)}</td></tr>)}
    </Table>;
    else if (resultsSubTab === 'forces') content = <Table head={<><th>{t('table.elemLabel')}</th><th>Ni (kN)</th><th>Nj (kN)</th><th>Vi (kN)</th><th>Vj (kN)</th><th>Mi (kN&middot;m)</th><th>Mj (kN&middot;m)</th></>}>
      {result.elementForces.map((item) => <tr key={item.elementId}><td className="id-cell">{item.elementId}</td><td className="num">{item.nStart.toFixed(4)}</td><td className="num">{item.nEnd.toFixed(4)}</td><td className="num">{item.vStart.toFixed(4)}</td><td className="num">{item.vEnd.toFixed(4)}</td><td className="num">{(-item.mStart).toFixed(4)}</td><td className="num">{(-item.mEnd).toFixed(4)}</td></tr>)}
    </Table>;
  }

  if (resultsSubTab === 'diagnostics' && allDiagnostics.length) content = <Table head={<><th>{t('results.diagSource')}</th><th>{t('results.diagType')}</th><th>{t('results.diagMessage')}</th><th>{t('results.diagSeverity')}</th></>}>
    {allDiagnostics.map((item, index) => <tr key={`${item.source}-${item.type}-${index}`}><td className="id-cell">{item.source}</td><td>{item.type}</td><td>{item.message}</td><td className={item.severity === 'warning' ? 'severity-warn' : item.severity === 'error' ? 'severity-err' : ''}>{item.severity}</td></tr>)}
  </Table>;

  return <div className="react-results-table">
    {(resultsStore.hasCombinations || caseKeys.length > 0) && <div className="results-case-bar">
      <select id="results-case" aria-label={t('results.primary')} value={caseValue} onChange={changeCase}>
        <option value="single">{t('results.simpleLoads')}</option>
        {caseKeys.map((id) => { const loadCase = modelStore.model.loadCases.find((item) => item.id === id); return <option key={`case-${id}`} value={`case_${id}`}>{loadCase?.name ?? `${t('results.caseFallback')} ${id}`}</option>; })}
        {modelStore.combinations.map((combo) => <option key={`combo-${combo.id}`} value={`combo_${combo.id}`}>{combo.name}</option>)}
        {resultsStore.hasCombinations && <option value="envelope">{t('resultsTable.envelope')}</option>}
      </select>
    </div>}
    <div className="results-sub-tabs">
      <button className={resultsSubTab === 'displacements' ? 'active' : ''} onClick={() => setResultsSubTab('displacements')}>{t('resultsTable.displacements')}</button>
      <button className={resultsSubTab === 'reactions' ? 'active' : ''} onClick={() => setResultsSubTab('reactions')}>{t('resultsTable.reactions')}</button>
      <button className={resultsSubTab === 'forces' ? 'active' : ''} onClick={() => setResultsSubTab('forces')}>{t('resultsTable.internalForces')}</button>
      {allDiagnostics.length > 0 && <button className={resultsSubTab === 'diagnostics' ? 'active' : ''} onClick={() => setResultsSubTab('diagnostics')}>{t('resultsTable.diagnostics')} ({allDiagnostics.length})</button>}
    </div>
    <div className="results-content">{content}</div>
  </div>;
}
