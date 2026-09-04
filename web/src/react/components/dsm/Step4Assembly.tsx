import { useSyncExternalStore } from 'react';
import type { DSMStepData } from '../../../lib/engine/solver-detailed';
import { localeExternalStore, t } from '../../../lib/i18n/store.svelte';
import { dsmStepsStore } from '../../../lib/store';
import { useStoreRevision } from '../../store/useStoreRevision';
import { MathEquation } from './MathEquation';
import { MatrixDisplay } from './MatrixDisplay';
import './Step4Assembly.css';

type Props = { data: DSMStepData; editable?: boolean };
const equation = '[K] = \\sum_{e=1}^{n_e} [L_e]^T \\cdot [K]_e \\cdot [L_e]';

export function Step4Assembly({ data, editable = false }: Props) {
  useStoreRevision(dsmStepsStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const selected = dsmStepsStore.selectedElemForStep;
  const element = selected === null ? null : data.elements.find((candidate) => candidate.elementId === selected);
  const highlighted = element ? new Set(element.dofIndices) : new Set<number>();
  const size = data.K.length;
  return <div className="step react-dsm-step react-dsm-step-4">
    <div className="explanation"><p dangerouslySetInnerHTML={{ __html: t('dsm.step4.explanation') }} /></div>
    <MathEquation equation={equation} displayMode />
    <div className="elem-selector">
      <label htmlFor="elem-select-4">{t('dsm.step4.highlightElement')}</label>
      <select id="elem-select-4" value={selected ?? ''} onChange={(event) => dsmStepsStore.selectElement(event.currentTarget.value === '' ? null! : Number(event.currentTarget.value))}>
        <option value="">{t('dsm.step4.none')}</option>
        {data.elements.map((item) => <option value={item.elementId} key={item.elementId}>E{item.elementId} (N{item.nodeI}→N{item.nodeJ})</option>)}
      </select>
    </div>
    <MatrixDisplay title={`[K] global (${size}×${size})`} matrix={data.K} rowLabels={data.dofLabels} colLabels={data.dofLabels} highlightRows={highlighted} highlightCols={highlighted} compact precision={2} editable={editable} />
    <div className="size-info">{t('dsm.step4.sizeInfo').replaceAll('{n}', String(size)).replaceAll('{nElem}', String(data.elements.length))}</div>
  </div>;
}
