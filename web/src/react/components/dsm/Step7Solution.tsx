import { useSyncExternalStore } from 'react';
import type { DSMStepData } from '../../../lib/engine/solver-detailed';
import { localeExternalStore, t } from '../../../lib/i18n/store.svelte';
import { MathEquation } from './MathEquation';
import { VectorDisplay } from './VectorDisplay';
import './Step7Solution.css';

type Props = { data: DSMStepData };
const equation = '\\{ u_f \\} = [K_{ff}]^{-1} \\cdot \\{ F_{mod} \\}';

export function Step7Solution({ data }: Props) {
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  let maxValue = 0;
  let maxIndex = -1;
  for (let index = 0; index < data.uAll.length; index += 1) {
    if (Math.abs(data.uAll[index]) > maxValue) { maxValue = Math.abs(data.uAll[index]); maxIndex = index; }
  }
  const highlighted = maxIndex >= 0 ? new Set([maxIndex]) : new Set<number>();
  return <div className="step react-dsm-step react-dsm-step-7">
    <div className="explanation"><p dangerouslySetInnerHTML={{ __html: t('dsm.step7.explanation') }} /></div>
    <MathEquation equation={equation} displayMode />
    <VectorDisplay title={t('dsm.step7.freeDisp').replace('{n}', String(data.dofNumbering.nFree))} vector={data.uFree} labels={data.freeDofLabels} precision={6} />
    <div className="separator" />
    <div className="explanation"><p dangerouslySetInnerHTML={{ __html: t('dsm.step7.fullVector') }} /></div>
    <VectorDisplay title={t('dsm.step7.fullDisp').replace('{n}', String(data.uAll.length))} vector={data.uAll} labels={data.dofLabels} highlightIndices={highlighted} precision={6} />
  </div>;
}
