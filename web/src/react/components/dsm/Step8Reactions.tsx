import { useSyncExternalStore } from 'react';
import type { DSMStepData } from '../../../lib/engine/solver-detailed';
import { localeExternalStore, t } from '../../../lib/i18n/store';
import { MathEquation } from './MathEquation';
import { VectorDisplay } from './VectorDisplay';
import './Step8Reactions.css';

type Props = { data: DSMStepData };
const equation = '\\{ R \\} = [K_{rf}] \\cdot \\{ u_f \\} + [K_{rr}] \\cdot \\{ u_r \\} - \\{ F_r \\}';

export function Step8Reactions({ data }: Props) {
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const nonZero = data.reactionsRaw.reduce((indices, value, index) => {
    if (Math.abs(value) > 1e-10) indices.add(index);
    return indices;
  }, new Set<number>());
  const restrainedCount = data.dofNumbering.nTotal - data.dofNumbering.nFree;
  return <div className="step react-dsm-step react-dsm-step-8">
    <div className="explanation"><p dangerouslySetInnerHTML={{ __html: t('dsm.step8.explanation') }} /></div>
    <MathEquation equation={equation} displayMode />
    <VectorDisplay title={t('dsm.step8.reactions').replace('{n}', String(restrainedCount))} vector={data.reactionsRaw} labels={data.restrDofLabels} highlightIndices={nonZero} precision={4} />
    <div className="separator" />
    <div className="reactions-table-scroll">
      <table className="reactions-table">
        <thead><tr><th>{t('dsm.step8.dof')}</th><th>{t('dsm.step8.label')}</th><th>{t('dsm.step8.reaction')}</th></tr></thead>
        <tbody>{data.reactionsRaw.map((value, index) => <tr key={index}>
          <td className="idx">{data.dofNumbering.nFree + index}</td>
          <td className="label-cell">{data.restrDofLabels[index]}</td>
          <td className={`val-cell${value > 1e-10 ? ' pos' : value < -1e-10 ? ' neg' : ' zero'}`}>{Math.abs(value) < 1e-10 ? '0' : value.toFixed(4)}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </div>;
}
