import { useSyncExternalStore } from 'react';
import type { DSMStepData } from '../../../lib/engine/solver-detailed';
import { localeExternalStore, t } from '../../../lib/i18n/store';
import { dsmStepsStore } from '../../../lib/store';
import { useStoreRevision } from '../../store/useStoreRevision';
import { MathEquation } from './MathEquation';
import { MatrixDisplay } from './MatrixDisplay';
import './Step2LocalMatrices.css';

type Props = { data: DSMStepData; editable?: boolean };
const frameEquation = '[k] = \\begin{bmatrix} \\frac{EA}{L} & 0 & 0 & -\\frac{EA}{L} & 0 & 0 \\\\ 0 & \\frac{12EI}{L^3} & \\frac{6EI}{L^2} & 0 & -\\frac{12EI}{L^3} & \\frac{6EI}{L^2} \\\\ 0 & \\frac{6EI}{L^2} & \\frac{4EI}{L} & 0 & -\\frac{6EI}{L^2} & \\frac{2EI}{L} \\\\ -\\frac{EA}{L} & 0 & 0 & \\frac{EA}{L} & 0 & 0 \\\\ 0 & -\\frac{12EI}{L^3} & -\\frac{6EI}{L^2} & 0 & \\frac{12EI}{L^3} & -\\frac{6EI}{L^2} \\\\ 0 & \\frac{6EI}{L^2} & \\frac{2EI}{L} & 0 & -\\frac{6EI}{L^2} & \\frac{4EI}{L} \\end{bmatrix}';
const trussEquation = '[k] = \\frac{EA}{L} \\begin{bmatrix} 1 & 0 & -1 & 0 \\\\ 0 & 0 & 0 & 0 \\\\ -1 & 0 & 1 & 0 \\\\ 0 & 0 & 0 & 0 \\end{bmatrix}';

export function Step2LocalMatrices({ data, editable = false }: Props) {
  useStoreRevision(dsmStepsStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const element = data.elements.find((item) => item.elementId === dsmStepsStore.selectedElemForStep) ?? data.elements[0];
  const is3D = data.dofNumbering.dofsPerNode > 3;
  return <div className="step react-dsm-step react-dsm-step-2">
    <div className="explanation"><p dangerouslySetInnerHTML={{ __html: t('dsm.step2.explanation') }} /></div>
    <div className="elem-selector"><label htmlFor="elem-select">{t('dsm.step2.element')}</label><select id="elem-select" value={element?.elementId ?? ''} onChange={(event) => dsmStepsStore.selectElement(Number(event.currentTarget.value))}>{data.elements.map((item) => <option value={item.elementId} key={item.elementId}>E{item.elementId} (N{item.nodeI}→N{item.nodeJ})</option>)}</select></div>
    {element && <>
      <div className="props-row">
        <div className="prop"><span className="prop-label">{t('dsm.step2.type')}</span><span className="prop-val">{element.type}</span></div>
        <div className="prop"><span className="prop-label">L</span><span className="prop-val">{element.length.toFixed(4)} m</span></div>
        {!is3D && <div className="prop"><span className="prop-label">θ</span><span className="prop-val">{(element.angle * 180 / Math.PI).toFixed(2)}°</span></div>}
        <div className="prop"><span className="prop-label">E</span><span className="prop-val">{element.E.toExponential(2)}</span></div>
        <div className="prop"><span className="prop-label">A</span><span className="prop-val">{element.A.toExponential(2)}</span></div>
        {element.type === 'frame' && <><div className="prop"><span className="prop-label">Iz</span><span className="prop-val">{element.Iz.toExponential(2)}</span></div>{is3D && element.Iy !== undefined && <div className="prop"><span className="prop-label">Iy</span><span className="prop-val">{element.Iy.toExponential(2)}</span></div>}{is3D && element.J !== undefined && <div className="prop"><span className="prop-label">J</span><span className="prop-val">{element.J.toExponential(2)}</span></div>}</>}
      </div>
      {is3D ? <div className="formula-note">{element.type === 'frame' ? t('dsm.step2.frameNote3d') : t('dsm.step2.trussNote3d')}</div> : <MathEquation equation={element.type === 'frame' ? frameEquation : trussEquation} displayMode />}
      <MatrixDisplay title={t('dsm.step2.localMatrix').replace('{rows}', String(element.kLocal.length)).replace('{cols}', String(element.kLocal[0]?.length))} matrix={element.kLocal} rowLabels={element.dofLabels.map((_label, index) => `${index}`)} colLabels={element.dofLabels.map((_label, index) => `${index}`)} compact editable={editable} />
    </>}
  </div>;
}
