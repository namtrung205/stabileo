import { useSyncExternalStore } from 'react';
import type { DSMStepData } from '../../../lib/engine/solver-detailed';
import { localeExternalStore, t } from '../../../lib/i18n/store.svelte';
import { MathEquation } from './MathEquation';
import { MatrixDisplay } from './MatrixDisplay';
import { VectorDisplay } from './VectorDisplay';
import './Step6Partitioning.css';

type Props = { data: DSMStepData; editable?: boolean };
const partitionEquation = '\\begin{bmatrix} K_{ff} & K_{fr} \\\\ K_{rf} & K_{rr} \\end{bmatrix} \\begin{Bmatrix} u_f \\\\ u_r \\end{Bmatrix} = \\begin{Bmatrix} F_f \\\\ F_r \\end{Bmatrix}';
const modifiedEquation = '\\{ F_{mod} \\} = \\{ F_f \\} - [K_{fr}] \\cdot \\{ u_r \\}';

export function Step6Partitioning({ data, editable = false }: Props) {
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const free = data.dofNumbering.nFree;
  const restrained = data.dofNumbering.nTotal - free;
  const hasPrescribed = data.uPrescribed.some((value) => Math.abs(value) > 1e-10);
  return <div className="step react-dsm-step react-dsm-step-6">
    <div className="explanation"><p dangerouslySetInnerHTML={{ __html: t('dsm.step6.explanation') }} /></div>
    <MathEquation equation={partitionEquation} displayMode />
    <div className="info-row">
      <div className="info-card"><span className="info-label">{t('dsm.step6.freeDof')}</span><span className="info-value free">{free}</span></div>
      <div className="info-card"><span className="info-label">{t('dsm.step6.restrainedDof')}</span><span className="info-value restr">{restrained}</span></div>
    </div>
    <MatrixDisplay title={`[K_ff] (${free}×${free})`} matrix={data.Kff} rowLabels={data.freeDofLabels} colLabels={data.freeDofLabels} compact precision={2} editable={editable} />
    {data.Kfr.length > 0 && data.Kfr[0]?.length > 0 && <MatrixDisplay title={`[K_fr] (${free}×${restrained})`} matrix={data.Kfr} rowLabels={data.freeDofLabels} colLabels={data.restrDofLabels} compact precision={2} editable={editable} />}
    <div className="separator" />
    <VectorDisplay title="{F_f}" vector={data.Ff} labels={data.freeDofLabels} precision={4} />
    {hasPrescribed && <>
      <VectorDisplay title={`{u_r} (${t('dsm.step6.prescribedDisp')})`} vector={data.uPrescribed} labels={data.restrDofLabels} precision={6} />
      <div className="explanation"><p dangerouslySetInnerHTML={{ __html: t('dsm.step6.prescribedNote') }} /></div>
      <MathEquation equation={modifiedEquation} displayMode />
    </>}
    <VectorDisplay title={t('dsm.step6.loadVectorToSolve').replace('{name}', hasPrescribed ? '{F_mod}' : '{F_f}')} vector={data.FfMod} labels={data.freeDofLabels} precision={4} />
  </div>;
}
