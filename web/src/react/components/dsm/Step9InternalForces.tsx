import { useSyncExternalStore } from 'react';
import type { DSMStepData } from '../../../lib/engine/solver-detailed';
import { localeExternalStore, t } from '../../../lib/i18n/store.svelte';
import { dsmStepsStore } from '../../../lib/store';
import { useStoreRevision } from '../../store/useStoreRevision';
import { MathEquation } from './MathEquation';
import { VectorDisplay } from './VectorDisplay';
import './Step9InternalForces.css';

type Props = { data: DSMStepData };
const equation = '\\{ f \\} = [k] \\cdot [T] \\cdot \\{ u_e \\} - \\{ f_{FE} \\}';
const signClass = (value: number | undefined) => value !== undefined && value > 1e-10 ? 'pos' : value !== undefined && value < -1e-10 ? 'neg' : undefined;

export function Step9InternalForces({ data }: Props) {
  useStoreRevision(dsmStepsStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const selectedForce = data.elementForces.find((item) => item.elementId === dsmStepsStore.selectedElemForStep) ?? data.elementForces[0];
  const element = data.elements.find((item) => item.elementId === (selectedForce?.elementId ?? -1));
  const is3D = data.dofNumbering.dofsPerNode > 3;
  const isFrame = element?.type === 'frame';
  const labels = is3D
    ? (isFrame ? ['N_i', 'Vy_i', 'Vz_i', 'Mx_i', 'My_i', 'Mz_i', 'N_j', 'Vy_j', 'Vz_j', 'Mx_j', 'My_j', 'Mz_j'] : ['N_i', 'Vy_i', 'Vz_i', 'N_j', 'Vy_j', 'Vz_j'])
    : (isFrame ? ['N_i', 'V_i', 'M_i', 'N_j', 'V_j', 'M_j'] : ['N_i', 'V_i', 'N_j', 'V_j']);

  const summaryRows: Array<[string, number, number]> = is3D
    ? (isFrame
      ? [[t('dsm.step9.axial'), 0, 6], [t('dsm.step9.shearY'), 1, 7], [t('dsm.step9.shearZ'), 2, 8], [t('dsm.step9.torsion'), 3, 9], [t('dsm.step9.momentY'), 4, 10], [t('dsm.step9.momentZ'), 5, 11]]
      : [[t('dsm.step9.axial'), 0, 3], [t('dsm.step9.shearY'), 1, 4], [t('dsm.step9.shearZ'), 2, 5]])
    : [[t('dsm.step9.axial'), 0, isFrame ? 3 : 2], [t('dsm.step9.shearV'), 1, isFrame ? 4 : 3], ...(isFrame ? [[t('dsm.step9.momentM'), 2, 5] as [string, number, number]] : [])];

  return <div className="step react-dsm-step react-dsm-step-9">
    <div className="explanation"><p dangerouslySetInnerHTML={{ __html: t('dsm.step9.explanation') }} /></div>
    <MathEquation equation={equation} displayMode />
    <div className="elem-selector"><label htmlFor="elem-select-9">{t('dsm.step9.element')}</label><select id="elem-select-9" value={selectedForce?.elementId ?? ''} onChange={(event) => dsmStepsStore.selectElement(Number(event.currentTarget.value))}>{data.elementForces.map((force) => {
      const item = data.elements.find((candidate) => candidate.elementId === force.elementId);
      return <option value={force.elementId} key={force.elementId}>E{force.elementId}{item ? ` (N${item.nodeI}→N${item.nodeJ})` : ''}</option>;
    })}</select></div>
    {selectedForce && element && <>
      <VectorDisplay title={t('dsm.step9.globalDisp')} vector={selectedForce.uGlobal} labels={element.dofLabels} precision={6} horizontal />
      <VectorDisplay title={t('dsm.step9.localDisp')} vector={selectedForce.uLocal} labels={labels.map((_label, index) => `${index}`)} precision={6} horizontal />
      <div className="separator" />
      <VectorDisplay title={t('dsm.step9.forcesBeforeFEF')} vector={selectedForce.fLocalRaw} labels={labels} precision={4} horizontal />
      {selectedForce.fixedEndForces.some((value) => Math.abs(value) > 1e-10) && <VectorDisplay title={t('dsm.step9.fixedEndForces')} vector={selectedForce.fixedEndForces} labels={labels} precision={4} horizontal />}
      <div className="separator" />
      <VectorDisplay title={t('dsm.step9.finalForces')} vector={selectedForce.fLocalFinal} labels={labels} precision={4} horizontal />
      <div className="force-summary"><table className="summary-table">
        <thead><tr><th>{t('dsm.step9.force')}</th><th>{t('dsm.step9.nodeI')}</th><th>{t('dsm.step9.nodeJ')}</th></tr></thead>
        <tbody>{summaryRows.map(([name, indexI, indexJ]) => <tr key={name}>
          <td>{name}</td>
          <td className={signClass(selectedForce.fLocalFinal[indexI])}>{selectedForce.fLocalFinal[indexI]?.toFixed(4) ?? '0'}</td>
          <td className={signClass(selectedForce.fLocalFinal[indexJ])}>{selectedForce.fLocalFinal[indexJ]?.toFixed(4) ?? '0'}</td>
        </tr>)}</tbody>
      </table></div>
    </>}
  </div>;
}
