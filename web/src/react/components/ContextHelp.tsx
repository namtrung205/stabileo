import { useSyncExternalStore } from 'react';
import { localeExternalStore, t } from '../../lib/i18n/store';
import { modelStore, resultsStore, uiStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';

export function ContextHelp() {
  useStoreRevision(modelStore); useStoreRevision(uiStore); useStoreRevision(resultsStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  if (!uiStore.showHelpPanel) return null;
  const help = {
    'no-model': [t('ctxHelp.firstSteps'), [t('ctxHelp.step.createNodes'), t('ctxHelp.step.connectBars'), t('ctxHelp.step.addSupports'), t('ctxHelp.step.applyLoads'), t('ctxHelp.step.pressCalculate'), t('ctxHelp.step.exploreDiagrams')], t('ctxHelp.tip.loadExample')],
    node: [t('ctxHelp.createNodes'), [t('ctxHelp.createNodes.step1'), t('ctxHelp.createNodes.step2'), t('ctxHelp.createNodes.step3')], t('ctxHelp.createNodes.tip')],
    element: [t('ctxHelp.createElements'), [t('ctxHelp.createElements.step1'), t('ctxHelp.createElements.step2'), t('ctxHelp.createElements.step3')], t('ctxHelp.createElements.tip')],
    support: [t('ctxHelp.createSupports'), [t('ctxHelp.createSupports.step1'), t('ctxHelp.createSupports.step2')], t('ctxHelp.createSupports.tip')],
    load: [t('ctxHelp.applyLoads'), [t('ctxHelp.applyLoads.step1'), t('ctxHelp.applyLoads.step2'), t('ctxHelp.applyLoads.step3')], t('ctxHelp.applyLoads.tip')],
    select: [t('ctxHelp.selectTool'), [t('ctxHelp.selectTool.step1'), t('ctxHelp.selectTool.step2'), t('ctxHelp.selectTool.step3')], t('ctxHelp.selectTool.tip')],
    influenceLine: [t('ctxHelp.influenceLine'), [t('ctxHelp.influenceLine.step1'), t('ctxHelp.influenceLine.step2'), t('ctxHelp.influenceLine.step3')], t('ctxHelp.influenceLine.tip')],
    pan: [t('ctxHelp.panView'), [t('ctxHelp.panView.step1'), t('ctxHelp.panView.step2'), t('ctxHelp.panView.step3')], t('ctxHelp.panView.tip')],
    results: [t('ctxHelp.results'), [t('ctxHelp.results.step1'), t('ctxHelp.results.step2'), t('ctxHelp.results.step3'), t('ctxHelp.results.step4')], t('ctxHelp.results.tip')],
  } satisfies Record<string, [string, string[], string]>;
  const key = modelStore.nodes.size === 0 && modelStore.elements.size === 0 ? 'no-model' : resultsStore.results && uiStore.currentTool === 'select' ? 'results' : uiStore.currentTool;
  const [title, steps, tip] = help[key as keyof typeof help] ?? help.select;
  return <div className="help-panel"><h3 className="help-title">{title}</h3><ul className="help-steps">{steps.map((step, index) => <li key={index}>{step}</li>)}</ul><p className="help-tip">{tip}</p></div>;
}
