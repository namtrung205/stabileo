import { useSyncExternalStore } from 'react';
import { inspectMember, inspectNode } from '../../lib/canvas/draw-despiece';
import { localeExternalStore, t } from '../../lib/i18n/store.svelte';
import { modelStore, resultsStore, uiStore } from '../../lib/store';
import { inspectMember3D, inspectNode3D } from '../../lib/three/despiece-3d';
import { useStoreRevision } from '../store/useStoreRevision';
import './DespieceInspector.css';

type Action = { elementId: number; end: 'I' | 'J'; nodeId: number; components: Array<{ label: string; value: number }> };

export function DespieceInspector() {
  useStoreRevision(uiStore); useStoreRevision(modelStore); useStoreRevision(resultsStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const inspect = uiStore.despieceInspect;
  const is3D = uiStore.analysisMode === '3d' || uiStore.analysisMode === 'pro';
  const active = resultsStore.diagramType === 'despiece' && inspect !== null;
  if (!active || !inspect) return null;

  const args2D = {
    elements: [...modelStore.elements.values()].map((element) => ({ id: element.id, nodeI: element.nodeI, nodeJ: element.nodeJ })),
    getNode: (id: number) => { const node = modelStore.getNode(id); return node ? { x: node.x, y: node.y } : undefined; },
    getElementForces: (id: number) => {
      const forces = resultsStore.getElementForces(id);
      return forces ? { elementId: forces.elementId, nStart: forces.nStart, nEnd: forces.nEnd, vStart: forces.vStart, vEnd: forces.vEnd, mStart: forces.mStart, mEnd: forces.mEnd } : undefined;
    },
    basis: uiStore.despieceBasis,
  };
  const args3D = {
    elements: [...modelStore.elements.values()].map((element) => ({ id: element.id, nodeI: element.nodeI, nodeJ: element.nodeJ, localYx: element.localYx, localYy: element.localYy, localYz: element.localYz, rollAngle: element.rollAngle })),
    getNode: (id: number) => { const node = modelStore.getNode(id); return node ? { x: node.x, y: node.y, z: node.z ?? 0 } : undefined; },
    getForces: (id: number) => resultsStore.getElementForces3D(id),
    basis: uiStore.despieceBasis,
    leftHand: uiStore.axisConvention3D === 'leftHand',
  };
  const actions: Action[] = is3D
    ? inspect.type === 'member' ? (inspectMember3D(args3D, inspect.id)?.ends ?? []) : inspectNode3D(args3D, inspect.id).actions
    : inspect.type === 'member' ? (inspectMember(args2D, inspect.id)?.ends ?? []) : inspectNode(args2D, inspect.id).actions;
  let reaction: string | null = null;
  if (inspect.type === 'node' && is3D && resultsStore.showReactions) {
    const value = (resultsStore.results3D?.reactions ?? []).find((item) => item.nodeId === inspect.id);
    if (value) reaction = `Fx ${value.fx.toFixed(2)}  Fy ${value.fy.toFixed(2)}  Fz ${value.fz.toFixed(2)}`;
  }

  return <div className="dsp-inspect">
    <div className="dsp-head"><span className="dsp-title">
      {(inspect.type === 'node' ? t('despiece.inspectNode') : t('despiece.inspectMember')).replace('{id}', String(inspect.id))}
      <span className="dsp-basis"> ({uiStore.despieceBasis === 'global' ? t('despiece.basisGlobal') : t('despiece.basisLocal')})</span>
    </span><button className="dsp-close" onClick={() => { uiStore.despieceInspect = null; }} title={t('editor.cancel')}>✕</button></div>
    {actions.length === 0 ? <div className="dsp-empty">{t('despiece.inspectEmpty')}</div> : <table className="dsp-table">
      <thead><tr><th>{t('despiece.colMember')}</th>{actions[0].components.map((component) => <th key={component.label}>{component.label}</th>)}</tr></thead>
      <tbody>{actions.map((action) => <tr key={`${action.elementId}-${action.end}`}><td>E{action.elementId}·{action.end} <span className="dsp-node">(n{action.nodeId})</span></td>{action.components.map((component) => <td key={component.label}>{component.value.toFixed(2)}</td>)}</tr>)}</tbody>
    </table>}
    {reaction && <div className="dsp-react">{t('despiece.legendReaction')}: {reaction}</div>}
  </div>;
}
