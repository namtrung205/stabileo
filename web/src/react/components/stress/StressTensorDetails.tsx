import { useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import type { StressTensorState } from '../../../lib/section/tensors';
import { tensorRows } from '../../../lib/section/tensors';
import { localeExternalStore, t } from '../../../lib/i18n/store';
import { fmt } from '../../../components/stress/fmt';
import './StressTensorDetails.css';

type Props = {
  showTensors: boolean;
  onShowTensorsChange: (show: boolean) => void;
  tensors: StressTensorState | null;
  fy?: number;
};

export function StressTensorDetails({ showTensors, onShowTensorsChange, tensors, fy }: Props) {
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const stressRows = tensors ? tensorRows(tensors.stress) : [];
  const strainRows = tensors ? tensorRows(tensors.strain).map((row) => row.map((value) => value * 1e6)) : [];
  const vonMises = tensors ? Math.sqrt(3 * tensors.invariants.j2) : 0;
  const utilisation = fy && fy > 0 ? vonMises / fy : null;

  const matrix = (rows: number[][], precision?: number) => <div className="ssp-matrix">
    <span className="ssp-bracket">⎡<br />⎢<br />⎣</span>
    <div className="ssp-matrix-grid">{rows.flatMap((row, rowIndex) => row.map((value, columnIndex) => <span className={`ssp-cell${value === 0 ? ' zero' : ''}`} key={`${rowIndex}-${columnIndex}`}>{fmt(value, precision)}</span>))}</div>
    <span className="ssp-bracket">⎤<br />⎥<br />⎦</span>
  </div>;

  return <div className="react-stress-tensor">
    <button className="ssp-section-toggle" onClick={() => onShowTensorsChange(!showTensors)}>
      <span className="ssp-chevron">{showTensors ? '▾' : '▸'}</span>{t('stress.tensors')}
      <span className="ssp-help ssp-help-inline" title={t('stress.tensorsHelp')}>?</span>
    </button>
    {showTensors && (!tensors ? <p className="ssp-tensor-empty">{t('stress.tensorsNoElastic')}</p> : <div className="ssp-tensor-block">
      <div className="ssp-tensor-head"><span>{t('stress.tensorStress')}</span><span className="ssp-tensor-unit">MPa</span></div>
      {matrix(stressRows)}
      <p className="ssp-tensor-note">{t('stress.tensorZerosNote')}</p>
      <div className="ssp-tensor-head"><span>{t('stress.tensorStrain')}</span><span className="ssp-tensor-unit">µε</span></div>
      {matrix(strainRows, 0)}
      <p className="ssp-tensor-note">{t('stress.tensorPoissonNote')}</p>
      <div className="ssp-tensor-rows">
        <TensorRow label={<>σ<sub>1,2,3</sub></>} value={<>{fmt(tensors.principalStress.values[0])} / {fmt(tensors.principalStress.values[1])} / {fmt(tensors.principalStress.values[2])}<Unit>MPa</Unit></>} />
        <TensorRow label={<>θ<sub>p</sub></>} value={<>{tensors.principalStress.angleDeg.toFixed(1)}<Unit>°</Unit></>} />
        <TensorRow label={<>τ<sub>max</sub></>} value={<>{fmt(tensors.principalStress.maxShear)}<Unit>MPa</Unit></>} />
        <TensorRow label={<>I<sub>1</sub></>} value={<>{fmt(tensors.invariants.i1)}<Unit>MPa</Unit></>} />
        <TensorRow label={<>J<sub>2</sub></>} value={<>{fmt(tensors.invariants.j2)}<Unit>MPa²</Unit></>} />
        <TensorRow label={<>σ<sub>hid</sub></>} value={<>{fmt(tensors.invariants.hydrostatic)}<Unit>MPa</Unit></>} />
        <div className="ssp-trow ssp-trow-vm"><span className="ssp-tlabel">σ<sub>vM</sub></span><span className="ssp-tval">{fmt(vonMises)}<Unit>MPa</Unit>{utilisation !== null && <span className={`ssp-util${utilisation > 1 ? ' over' : ''}`}>{(utilisation * 100).toFixed(0)}% f<sub>y</sub></span>}</span></div>
        <TensorRow label={<>ε<sub>vol</sub></>} value={<>{fmt(tensors.volumetricStrain * 1e6, 0)}<Unit>µε</Unit></>} />
      </div>
    </div>)}
  </div>;
}

function Unit({ children }: { children: ReactNode }) { return <span className="ssp-tunit">{children}</span>; }
function TensorRow({ label, value }: { label: ReactNode; value: ReactNode }) { return <div className="ssp-trow"><span className="ssp-tlabel">{label}</span><span className="ssp-tval">{value}</span></div>; }
