import { useSyncExternalStore } from 'react';
import type { DSMStepData } from '../../../lib/engine/solver-detailed';
import { localeExternalStore, t } from '../../../lib/i18n/store';
import { MathEquation } from './MathEquation';
import { VectorDisplay } from './VectorDisplay';
import './Step5LoadVector.css';

type Props = { data: DSMStepData };
const equation = '\\{ F \\} = \\{ F_{\\text{nodal}} \\} + \\{ F_{\\text{equiv}} \\}';

export function Step5LoadVector({ data }: Props) {
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const nonZero = data.F.reduce((indices, value, index) => {
    if (Math.abs(value) > 1e-10) indices.add(index);
    return indices;
  }, new Set<number>());
  return <div className="step react-dsm-step react-dsm-step-5">
    <div className="explanation"><p dangerouslySetInnerHTML={{ __html: t('dsm.step5.explanation') }} /></div>
    <MathEquation equation={equation} displayMode />
    <VectorDisplay title={t('dsm.step5.globalVector')} vector={data.F} labels={data.dofLabels} highlightIndices={nonZero} precision={4} />
    {data.loadContributions.length > 0 ? <div className="contrib-section">
      <div className="contrib-title">{t('dsm.step5.contributions')}</div>
      <div className="contrib-scroll"><table className="contrib-table">
        <thead><tr><th>{t('dsm.step5.dof')}</th><th>{t('dsm.step5.value')}</th><th>{t('dsm.step5.source')}</th></tr></thead>
        <tbody>{data.loadContributions.map((contribution, index) => <tr key={`${contribution.dofIndex}-${index}`}>
          <td className="dof-cell">{contribution.dofLabel} [{contribution.dofIndex}]</td>
          <td className={`val-cell${contribution.value > 1e-10 ? ' pos' : contribution.value < -1e-10 ? ' neg' : ''}`}>{contribution.value.toFixed(4)}</td>
          <td className="src-cell">{contribution.source}</td>
        </tr>)}</tbody>
      </table></div>
    </div> : <div className="no-loads">{t('dsm.step5.noLoads')}</div>}
  </div>;
}
