import { useSyncExternalStore } from 'react';
import { localeExternalStore, t } from '../../lib/i18n/store.svelte';
import { modelStore, resultsStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';
import './EditorTables.css';
import './CombosTable.css';

export function CombosTable() {
  useStoreRevision(modelStore); useStoreRevision(resultsStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const dirty = () => { if (resultsStore.hasCombinations) resultsStore.combinationsDirty = true; };
  return <div className="editor-data-grid react-combos-table combos-section"><h4>{t('combos.loadCases')}</h4><table><thead><tr><th>ID</th><th>{t('table.type')}</th><th>{t('table.name')}</th><th /></tr></thead><tbody>
    {modelStore.loadCases.map((loadCase) => <tr key={loadCase.id}><td className="id-cell">{loadCase.id}</td><td><input type="text" defaultValue={loadCase.type} placeholder="—" className="case-type" onChange={(event) => { modelStore.updateLoadCaseType(loadCase.id, event.currentTarget.value); dirty(); }} /></td><td><input type="text" defaultValue={loadCase.name} onChange={(event) => modelStore.updateLoadCase(loadCase.id, event.currentTarget.value)} /></td><td><button className="del" onClick={() => { modelStore.removeLoadCase(loadCase.id); dirty(); }}>✕</button></td></tr>)}
  </tbody></table><div className="table-footer"><button className="add-btn" onClick={() => modelStore.addLoadCase('')}>{t('combos.addCase')}</button></div>
  <h4>{t('combos.combinations')}</h4><table><thead><tr><th>ID</th><th>{t('table.name')}</th><th>{t('table.factors')}</th><th /></tr></thead><tbody>
    {modelStore.combinations.map((combo) => <tr key={combo.id}><td className="id-cell">{combo.id}</td><td><input type="text" defaultValue={combo.name} onChange={(event) => modelStore.updateCombination(combo.id, { name: event.currentTarget.value })} /></td><td className="load-values">{modelStore.loadCases.map((loadCase) => <span className="load-field" key={loadCase.id}>{loadCase.type || loadCase.name}<input type="number" step="0.1" defaultValue={combo.factors.find((factor) => factor.caseId === loadCase.id)?.factor ?? 0} onChange={(event) => { const value = parseFloat(event.currentTarget.value) || 0; const factors = modelStore.loadCases.map((candidate) => ({ caseId: candidate.id, factor: candidate.id === loadCase.id ? value : combo.factors.find((factor) => factor.caseId === candidate.id)?.factor ?? 0 })).filter((factor) => Math.abs(factor.factor) > 1e-10); modelStore.updateCombination(combo.id, { factors }); dirty(); }} /></span>)}</td><td><button className="del" onClick={() => { modelStore.removeCombination(combo.id); dirty(); }}>✕</button></td></tr>)}
  </tbody></table><div className="table-footer"><button className="add-btn" onClick={() => { modelStore.addCombination(t('combos.newCombo'), modelStore.loadCases.map((loadCase) => ({ caseId: loadCase.id, factor: 1 }))); dirty(); }}>{t('combos.addCombo')}</button></div>
  {resultsStore.combinationsDirty && <div className="combo-warning">⚠ {t('combos.needsRecalcSolve')}</div>}
  </div>;
}
