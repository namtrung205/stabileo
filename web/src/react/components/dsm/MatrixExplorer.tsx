import { useState, useSyncExternalStore } from 'react';
import type { DSMStepData } from '../../../lib/engine/solver-detailed';
import { localeExternalStore, t } from '../../../lib/i18n/store';
import { dsmStepsStore } from '../../../lib/store';
import { useStoreRevision } from '../../store/useStoreRevision';
import { MatrixDisplay } from './MatrixDisplay';
import './MatrixExplorer.css';

type Props = { data: DSMStepData; editable?: boolean };
type MatrixTab = 'kLocal' | 'T' | 'kGlobal';

export function MatrixExplorer({ data, editable = false }: Props) {
  useStoreRevision(dsmStepsStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const [showGlobalK, setShowGlobalK] = useState(false);
  const [activeTab, setActiveTab] = useState<MatrixTab>('kLocal');
  const element = data.elements.find((item) => item.elementId === dsmStepsStore.selectedElemForStep) ?? data.elements[0];
  const is3D = data.dofNumbering.dofsPerNode > 3;
  const elementDofs = element ? new Set(element.dofIndices) : new Set<number>();

  return <div className="explorer react-matrix-explorer">
    <div className="explanation"><p dangerouslySetInnerHTML={{ __html: t('dsm.explorer.explanation') }} /></div>
    <div className="elem-selector"><label htmlFor="explorer-elem">{t('dsm.explorer.element')}</label><select id="explorer-elem" value={element?.elementId ?? ''} onChange={(event) => dsmStepsStore.selectElement(Number(event.currentTarget.value))}>{data.elements.map((item) => <option value={item.elementId} key={item.elementId}>E{item.elementId} (N{item.nodeI}→N{item.nodeJ}) — {item.type}</option>)}</select></div>
    {element && <>
      <div className="props-row">
        <div className="prop"><span className="prop-label">L</span><span className="prop-val">{element.length.toFixed(3)} m</span></div>
        <div className="prop"><span className="prop-label">E</span><span className="prop-val">{element.E.toExponential(2)}</span></div>
        <div className="prop"><span className="prop-label">A</span><span className="prop-val">{element.A.toExponential(2)}</span></div>
        {element.type === 'frame' && <><div className="prop"><span className="prop-label">Iz</span><span className="prop-val">{element.Iz.toExponential(2)}</span></div>{is3D && element.Iy !== undefined && <div className="prop"><span className="prop-label">Iy</span><span className="prop-val">{element.Iy.toExponential(2)}</span></div>}{is3D && element.J !== undefined && <div className="prop"><span className="prop-label">J</span><span className="prop-val">{element.J.toExponential(2)}</span></div>}</>}
        <div className="prop"><span className="prop-label">{t('dsm.explorer.dof')}</span><span className="prop-val dof-list">{element.dofIndices.map((dof) => dof + 1).join(', ')}</span></div>
      </div>
      <div className="matrix-tabs">
        <button className={activeTab === 'kLocal' ? 'active' : undefined} onClick={() => setActiveTab('kLocal')}>{t('dsm.explorer.tabLocal')}</button>
        <button className={activeTab === 'T' ? 'active' : undefined} onClick={() => setActiveTab('T')}>{t('dsm.explorer.tabTransformation')}</button>
        <button className={activeTab === 'kGlobal' ? 'active' : undefined} onClick={() => setActiveTab('kGlobal')}>{t('dsm.explorer.tabGlobal')}</button>
        <div className="tab-spacer" />
        <button className={`global-toggle${showGlobalK ? ' active' : ''}`} onClick={() => setShowGlobalK((value) => !value)}>{showGlobalK ? '▼' : '▶'} [K] Global</button>
      </div>
      <div className="matrix-panel">
        {activeTab === 'kLocal' ? <><MatrixDisplay title={t('dsm.explorer.localStiffness').replace('{rows}', String(element.kLocal.length)).replace('{cols}', String(element.kLocal[0]?.length))} matrix={element.kLocal} rowLabels={element.dofLabels} colLabels={element.dofLabels} precision={is3D ? 1 : 2} compact editable={editable} /><div className="matrix-note">{element.type === 'frame' ? t('dsm.explorer.frameLocalNote').replace('{biaxial}', is3D ? t('dsm.explorer.biaxialSuffix') : '') : t('dsm.explorer.trussLocalNote')}</div></>
          : activeTab === 'T' ? <><MatrixDisplay title={t('dsm.explorer.transformationMatrix').replace('{rows}', String(element.T.length)).replace('{cols}', String(element.T[0]?.length))} matrix={element.T} rowLabels={element.dofLabels} colLabels={element.dofLabels} precision={4} compact editable={editable} /><div className="matrix-note">{t('dsm.explorer.rotationNote').replace('{detail}', is3D ? t('dsm.explorer.cosineBlocks') : `θ = ${(element.angle * 180 / Math.PI).toFixed(2)}°`)}</div></>
          : <><MatrixDisplay title={t('dsm.explorer.globalStiffness').replace('{rows}', String(element.kGlobal.length)).replace('{cols}', String(element.kGlobal[0]?.length))} matrix={element.kGlobal} rowLabels={element.dofLabels} colLabels={element.dofLabels} precision={is3D ? 1 : 2} compact editable={editable} /><div className="matrix-note">{t('dsm.explorer.assemblyNote').replace('{dofs}', element.dofIndices.map((dof) => dof + 1).join(', '))}</div></>}
      </div>
      <div className="relationship"><span className={`rel-item${activeTab === 'kLocal' ? ' active' : ''}`}>[k]</span><span className="rel-arrow">→ Tᵀ·k·T →</span><span className={`rel-item${activeTab === 'kGlobal' ? ' active' : ''}`}>[K]ₑ</span><span className="rel-arrow">→ {t('dsm.explorer.assembly')} →</span><span className={`rel-item${showGlobalK ? ' active' : ''}`}>[K]</span></div>
      {showGlobalK && <div className="global-k-section"><MatrixDisplay title={t('dsm.explorer.globalK').replace('{rows}', String(data.K.length)).replace('{cols}', String(data.K[0]?.length)).replace('{id}', String(element.elementId))} matrix={data.K} rowLabels={data.dofLabels} colLabels={data.dofLabels} highlightRows={elementDofs} highlightCols={elementDofs} precision={is3D ? 0 : 1} compact editable={editable} /></div>}
    </>}
  </div>;
}
