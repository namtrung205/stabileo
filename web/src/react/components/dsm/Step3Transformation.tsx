import { useSyncExternalStore } from 'react';
import type { DSMStepData } from '../../../lib/engine/solver-detailed';
import { localeExternalStore, t } from '../../../lib/i18n/store';
import { dsmStepsStore } from '../../../lib/store';
import { useStoreRevision } from '../../store/useStoreRevision';
import { MathEquation } from './MathEquation';
import { MatrixDisplay } from './MatrixDisplay';
import './Step3Transformation.css';

type Props = { data: DSMStepData; editable?: boolean };
const frameTransform = '[T] = \\begin{bmatrix} c & s & 0 & 0 & 0 & 0 \\\\ -s & c & 0 & 0 & 0 & 0 \\\\ 0 & 0 & 1 & 0 & 0 & 0 \\\\ 0 & 0 & 0 & c & s & 0 \\\\ 0 & 0 & 0 & -s & c & 0 \\\\ 0 & 0 & 0 & 0 & 0 & 1 \\end{bmatrix}';
const trussTransform = '[T] = \\begin{bmatrix} c & s & 0 & 0 \\\\ -s & c & 0 & 0 \\\\ 0 & 0 & c & s \\\\ 0 & 0 & -s & c \\end{bmatrix}';

export function Step3Transformation({ data, editable = false }: Props) {
  useStoreRevision(dsmStepsStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const element = data.elements.find((item) => item.elementId === dsmStepsStore.selectedElemForStep) ?? data.elements[0];
  const is3D = data.dofNumbering.dofsPerNode > 3;
  return <div className="step react-dsm-step react-dsm-step-3">
    <div className="explanation"><p dangerouslySetInnerHTML={{ __html: t('dsm.step3.explanation') }} /><p dangerouslySetInnerHTML={{ __html: t('dsm.step3.thenGlobal') }} /></div>
    <MathEquation equation="[K]_e = [T]^T \\cdot [k] \\cdot [T]" displayMode />
    <div className="elem-selector"><label htmlFor="elem-select-3">{t('dsm.step3.element')}</label><select id="elem-select-3" value={element?.elementId ?? ''} onChange={(event) => dsmStepsStore.selectElement(Number(event.currentTarget.value))}>{data.elements.map((item) => <option value={item.elementId} key={item.elementId}>E{item.elementId} (N{item.nodeI}→N{item.nodeJ})</option>)}</select></div>
    {element && <>
      {is3D ? <div className="angle-info" dangerouslySetInnerHTML={{ __html: t('dsm.step3.cosinesNote').replace('{rows}', String(element.T.length)).replace('{cols}', String(element.T[0]?.length)) }} /> : <><div className="angle-info">θ = {(element.angle * 180 / Math.PI).toFixed(2)}° → cos θ = {Math.cos(element.angle).toFixed(4)}, sin θ = {Math.sin(element.angle).toFixed(4)}</div><MathEquation equation={element.type === 'frame' ? frameTransform : trussTransform} displayMode /></>}
      <MatrixDisplay title={t('dsm.step3.transformation')} matrix={element.T} precision={4} compact editable={editable} />
      <div className="separator" />
      <MatrixDisplay title={t('dsm.step3.globalStiffness')} matrix={element.kGlobal} rowLabels={element.dofLabels} colLabels={element.dofLabels} compact editable={editable} />
      <div className="dof-mapping"><span className="map-label">{t('dsm.step3.dofMapping')}</span>{element.dofIndices.map((dofIndex, index) => <span className="dof-chip" key={`${dofIndex}-${index}`}>{element.dofLabels[index]} → [{dofIndex}]</span>)}</div>
    </>}
  </div>;
}
