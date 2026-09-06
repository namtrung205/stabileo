import { useSyncExternalStore } from 'react';
import type { DSMStepData } from '../../../lib/engine/solver-detailed';
import { localeExternalStore, t } from '../../../lib/i18n/store';
import { MathEquation } from './MathEquation';
import './Step1DOFNumbering.css';

type Props = { data: DSMStepData };
const equations = {
  frame2d: '\\text{Cada nodo tiene: } u_x, \\; u_z, \\; \\theta_y',
  truss2d: '\\text{Cada nodo tiene: } u_x, \\; u_z',
  frame3d: '\\text{Cada nodo tiene: } u_x, \\; u_y, \\; u_z, \\; \\theta_x, \\; \\theta_y, \\; \\theta_z',
  truss3d: '\\text{Cada nodo tiene: } u_x, \\; u_y, \\; u_z',
};

export function Step1DOFNumbering({ data }: Props) {
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const { nFree, nTotal, dofsPerNode, dofs } = data.dofNumbering;
  const is3D = dofsPerNode > 3;
  const names = is3D ? (dofsPerNode === 6 ? ['ux', 'uy', 'uz', 'θx', 'θy', 'θz'] : ['ux', 'uy', 'uz']) : ['ux', 'uz', 'θy'];
  const equation = is3D ? (dofsPerNode === 6 ? equations.frame3d : equations.truss3d) : (dofsPerNode === 3 ? equations.frame2d : equations.truss2d);
  return <div className="step react-dsm-step react-dsm-step-1">
    <div className="explanation">
      <p dangerouslySetInnerHTML={{ __html: t('dsm.step1.explanation') }} />
      <p dangerouslySetInnerHTML={{ __html: t('dsm.step1.ordering').replace('{nFree}', String(nFree - 1)).replace('{nFreeStart}', String(nFree)).replace('{nTotal}', String(nTotal - 1)) }} />
    </div>
    <div className="info-row">
      <div className="info-card"><span className="info-label">{t('dsm.step1.dofPerNode')}</span><span className="info-value">{dofsPerNode}</span></div>
      <div className="info-card"><span className="info-label">{t('dsm.step1.freeDof')}</span><span className="info-value free">{nFree}</span></div>
      <div className="info-card"><span className="info-label">{t('dsm.step1.restrainedDof')}</span><span className="info-value restr">{nTotal - nFree}</span></div>
      <div className="info-card"><span className="info-label">{t('dsm.step1.totalDof')}</span><span className="info-value">{nTotal}</span></div>
    </div>
    <MathEquation equation={equation} displayMode />
    <div className="dof-table-scroll"><table className="dof-table">
      <thead><tr><th>{t('dsm.step1.nodeHeader')}</th><th>{t('dsm.step1.localDof')}</th><th>{t('dsm.step1.globalIndex')}</th><th>Label</th><th>{t('dsm.step1.state')}</th></tr></thead>
      <tbody>{dofs.map((dof, index) => <tr className={dof.isFree ? 'free-row' : 'restr-row'} key={`${dof.nodeId}-${dof.localDof}-${index}`}>
        <td>{dof.nodeId}</td><td>{names[dof.localDof] ?? `dof${dof.localDof}`}</td><td className="idx">{dof.globalIndex}</td><td className="label-cell">{dof.label}</td>
        <td><span className={`badge ${dof.isFree ? 'badge-free' : 'badge-restr'}`}>{dof.isFree ? t('dsm.step1.free') : t('dsm.step1.restrained')}</span></td>
      </tr>)}</tbody>
    </table></div>
  </div>;
}
