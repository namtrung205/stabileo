import { t } from '../../lib/i18n/store.svelte';
import {
  TWO_D_DISPLACEMENT_LABELS, TWO_D_NODAL_LOAD_LABELS, TWO_D_REACTION_LABELS, TWO_D_VERTICAL_AXIS_LABEL,
  get2DDisplayDisplacementVertical, get2DDisplayMoment, get2DDisplayNodalLoadMoment, get2DDisplayNodalLoadVertical,
  get2DDisplayReactionVertical, get2DDisplayRotation, get2DDisplayedVertical,
} from '../../lib/geometry/coordinate-system';
import { modelStore, resultsStore, uiStore } from '../../lib/store';
import type { NodalLoad } from '../../lib/store/model.svelte';
import { toDisplay, unitLabel, type Quantity } from '../../lib/utils/units';
import { SupportDetails } from './SupportDetails';

export function NodeDetails({ showResults = false }: { showResults?: boolean }) {
  const us = uiStore.unitSystem; const dv = (v: number, q: Quantity) => toDisplay(v, q, us); const ul = (q: Quantity) => unitLabel(q, us);
  const is3D = uiStore.analysisMode === '3d' || uiStore.analysisMode === 'pro';
  const row = (label: string, value: string) => <div className="property-row"><span>{label}:</span><span>{value}</span></div>;
  const supportFor = (nodeId: number) => [...modelStore.supports.values()].find((support) => support.nodeId === nodeId);
  const updateLoad = (id: number, field: string, raw: string) => { const value = Number.parseFloat(raw); if (!Number.isNaN(value)) modelStore.updateLoad(id, { [field]: value }); };
  return <div className="panel-section"><h3>{t('prop.selectedNode')}</h3>{[...uiStore.selectedNodes].map((nodeId) => {
    const node = modelStore.getNode(nodeId); if (!node) return null;
    const support = supportFor(nodeId);
    const loads = modelStore.loads.filter((load) => load.type === 'nodal' && (load.data as NodalLoad).nodeId === nodeId).map((load) => load.data as NodalLoad);
    const hinges = modelStore.getHingesAtNode(nodeId);
    const disp3 = showResults && is3D && resultsStore.results3D ? resultsStore.getDisplacement3D(nodeId) : null;
    const react3 = showResults && is3D && resultsStore.results3D ? resultsStore.getReaction3D(nodeId) : null;
    const disp = showResults && !disp3 ? resultsStore.getDisplacement(nodeId) : null;
    const reaction = showResults && !react3 ? resultsStore.getReaction(nodeId) : null;
    return <div key={nodeId}>{row('ID', String(node.id))}{row('X', `${dv(node.x,'length').toFixed(3)} ${ul('length')}`)}{row(is3D ? 'Y' : TWO_D_VERTICAL_AXIS_LABEL, `${dv(is3D ? node.y : get2DDisplayedVertical(node),'length').toFixed(3)} ${ul('length')}`)}{is3D && row('Z', `${dv(node.z ?? 0,'length').toFixed(3)} ${ul('length')}`)}
      {disp3 && <><h4>{t('prop.displacements3d')}</h4>{row('ux',`${dv(disp3.ux,'displacement').toFixed(us === 'SI' ? 4 : 3)} ${ul('displacement')}`)}{row('uy',`${dv(disp3.uy,'displacement').toFixed(us === 'SI' ? 4 : 3)} ${ul('displacement')}`)}{row('uz',`${dv(disp3.uz,'displacement').toFixed(us === 'SI' ? 4 : 3)} ${ul('displacement')}`)}{row('θx',`${disp3.rx.toFixed(6)} rad`)}{row('θy',`${disp3.ry.toFixed(6)} rad`)}{row('θz',`${disp3.rz.toFixed(6)} rad`)}</>}
      {react3 && <><h4>{t('prop.reactions3d')}</h4>{row('Rx',`${dv(react3.fx,'force').toFixed(2)} ${ul('force')}`)}{row('Ry',`${dv(react3.fy,'force').toFixed(2)} ${ul('force')}`)}{row('Rz',`${dv(react3.fz,'force').toFixed(2)} ${ul('force')}`)}{row('Mx',`${dv(-react3.mx,'moment').toFixed(2)} ${ul('moment')}`)}{row('My',`${dv(-react3.my,'moment').toFixed(2)} ${ul('moment')}`)}{row('Mz',`${dv(-react3.mz,'moment').toFixed(2)} ${ul('moment')}`)}</>}
      {disp && <><h4>{t('prop.displacements')}</h4>{row('ux',`${dv(disp.ux,'displacement').toFixed(us === 'SI' ? 4 : 3)} ${ul('displacement')}`)}{row(TWO_D_DISPLACEMENT_LABELS.vertical,`${dv(get2DDisplayDisplacementVertical(disp),'displacement').toFixed(us === 'SI' ? 4 : 3)} ${ul('displacement')}`)}{row(TWO_D_DISPLACEMENT_LABELS.rotation,`${get2DDisplayRotation(disp).toFixed(6)} rad`)}</>}
      {reaction && <><h4>{t('prop.reactions')}</h4>{row('Rx',`${dv(reaction.rx,'force').toFixed(2)} ${ul('force')}`)}{row(TWO_D_REACTION_LABELS.vertical,`${dv(get2DDisplayReactionVertical(reaction),'force').toFixed(2)} ${ul('force')}`)}{row(TWO_D_REACTION_LABELS.moment,`${dv(-get2DDisplayMoment(reaction),'moment').toFixed(2)} ${ul('moment')}`)}</>}
      {support && <SupportDetails support={support} />}
      {loads.length > 0 && <><h4>{t('prop.nodalLoads')}</h4>{loads.map((load) => <div key={load.id}>{([['Fx',load.fx,'fx','kN'],[TWO_D_NODAL_LOAD_LABELS.vertical,get2DDisplayNodalLoadVertical(load),'fz','kN'],[TWO_D_NODAL_LOAD_LABELS.moment,get2DDisplayNodalLoadMoment(load),'my','kN·m']] as const).map(([label,value,field,unit]) => <div className="property-row" key={field}><span>{label}:</span><input className="prop-input" type="number" step="1" value={value} onChange={(e) => updateLoad(load.id, field, e.currentTarget.value)} /><span>{unit}</span></div>)}</div>)}</>}
      {hinges.length > 0 && <><h4>{t('prop.hinges')}</h4>{hinges.map((hinge) => modelStore.elements.has(hinge.elementId) ? <div className="property-row" key={`${hinge.elementId}-${hinge.end}`}><button className={`btn-small${hinge.hasHinge ? ' active' : ''}`} onClick={() => modelStore.toggleHinge(hinge.elementId, hinge.end)} title={`${t('table.elemLabel')} ${hinge.elementId} — ${t('table.nodeLabel')} ${hinge.end === 'start' ? 'I' : 'J'}`}>{hinge.hasHinge ? '○' : '●'} E{hinge.elementId}</button></div> : null)}<div style={{display:'flex',gap:4,marginTop:4}}><button className="btn-small" onClick={() => modelStore.batch(() => hinges.filter((h) => !h.hasHinge).forEach((h) => modelStore.toggleHinge(h.elementId,h.end)))}>{t('prop.hingeAll')}</button><button className="btn-small" onClick={() => modelStore.batch(() => hinges.filter((h) => h.hasHinge).forEach((h) => modelStore.toggleHinge(h.elementId,h.end)))}>{t('prop.removeAll')}</button></div></>}
      <button className="btn-small btn-danger" onClick={() => modelStore.removeNode(nodeId)}>{t('prop.deleteNode')}</button>
    </div>;
  })}</div>;
}
