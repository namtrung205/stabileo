import { useState, useSyncExternalStore } from 'react';
import { t, localeExternalStore } from '../../lib/i18n/store';
import { modelStore, uiStore } from '../../lib/store';
import { toDisplay, unitLabel } from '../../lib/utils/units';
import { useStoreRevision } from '../store/useStoreRevision';
import './StatusBar.css';

function selectionText(): string {
  const nNodes = uiStore.selectedNodes.size;
  const nSupports = uiStore.selectedSupports.size;
  const nLoads = uiStore.selectedLoads.size;
  const shellMode = uiStore.selectMode === 'shells';
  let nElements = 0;
  let nShells = 0;
  for (const id of uiStore.selectedElements) {
    const isShell = modelStore.plates.has(id) || modelStore.quads.has(id);
    const isElement = modelStore.elements.has(id);
    if (isShell && isElement) shellMode ? nShells++ : nElements++;
    else if (isShell) nShells++;
    else if (isElement) nElements++;
  }
  if (nNodes === 0 && nElements === 0 && nShells === 0 && nSupports === 0 && nLoads === 0) return '—';
  const parts: string[] = [];
  if (nNodes) parts.push(`${nNodes} ${nNodes > 1 ? t('status.nodesPlural') : t('status.nodes')}`);
  if (nElements) parts.push(`${nElements} ${nElements > 1 ? t('status.elemsPlural') : t('status.elems')}`);
  if (nShells) parts.push(`${nShells} ${nShells > 1 ? t('status.shellsPlural') : t('status.shells')}`);
  if (nSupports) parts.push(`${nSupports} ${nSupports > 1 ? t('status.supportsPlural') : t('status.supports')}`);
  if (nLoads) parts.push(`${nLoads} ${nLoads > 1 ? t('status.loadsPlural') : t('status.loads')}`);
  return parts.join(', ');
}

function modelSummary(): string {
  const nodes = modelStore.nodes.size;
  const elements = modelStore.elements.size;
  const supports = modelStore.supports.size;
  const parts: string[] = [];
  if (nodes) parts.push(`${nodes} ${nodes > 1 ? t('status.nodesPlural') : t('status.nodes')}`);
  if (elements) parts.push(`${elements} ${elements > 1 ? t('status.barsPlural') : t('status.bars')}`);
  if (supports) parts.push(`${supports} ${supports > 1 ? t('status.supportsPlural') : t('status.supports')}`);
  return parts.length ? parts.join(', ') : t('status.empty');
}

function CadProvenanceDialog({ onClose }: { onClose(): void }) {
  const provenance = modelStore.model.provenance;
  if (!provenance) return null;

  function markReviewed() {
    modelStore.markProvenanceReviewed();
    uiStore.toast(t('cad.markedReviewed'), 'success');
    onClose();
  }

  return <div className="cad-provenance" role="presentation" onClick={onClose}>
    <div className="cad-dialog" role="dialog" aria-label={t('cad.provTitle')} onClick={(event) => event.stopPropagation()}>
      <div className="cad-header"><h2>{t('cad.provTitle')}</h2><button className="cad-close" onClick={onClose} title={t('cad.cancel')}>✕</button></div>
      <div className="cad-body">
        <div className="cad-meta">
          <div><span className="cad-label">{t('cad.provFile')}</span> <span className="cad-mono">{provenance.fileName}</span></div>
          <div><span className="cad-label">{t('cad.provDate')}</span> {provenance.importedAtIso.slice(0, 10)}</div>
          <div><span className="cad-label">{t('cad.provStatus')}</span> <span className={`cad-status ${provenance.status === 'cad-draft-unreviewed' ? 'unrev' : 'rev'}`}>{provenance.status === 'cad-draft-unreviewed' ? t('cad.provUnreviewed') : t('cad.provReviewed')}</span></div>
        </div>
        <h3>{t('cad.assumptions')}</h3>
        <div className="cad-assumptions">{provenance.assumptions.map((assumption, index) => <div className="cad-assumption" key={`${index}-${assumption}`}>• {assumption}</div>)}</div>
        {provenance.layerMappings?.length > 0 && <><h3>{t('cad.provLayerMap')}</h3><div className="cad-role-summary">{provenance.layerMappings.filter((mapping) => mapping.role !== 'ignore').map((mapping) => <span className="cad-mono" key={mapping.layer}>{mapping.layer} → {t(`cad.role.${mapping.role}`)}</span>)}</div></>}
      </div>
      <div className="cad-footer"><button className="cad-btn" onClick={onClose}>{t('cad.cancel')}</button><span className="cad-spacer" />{provenance.status === 'cad-draft-unreviewed' && <button className="cad-btn apply" onClick={markReviewed}>{t('cad.markReviewedBtn')}</button>}</div>
    </div>
  </div>;
}

export function StatusBar() {
  useStoreRevision(uiStore);
  useStoreRevision(modelStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const [showProvenance, setShowProvenance] = useState(false);
  const provenance = modelStore.model.provenance;

  return <>
    <div className="status-bar">
      {provenance?.status === 'cad-draft-unreviewed' && <button className="draft-badge" title={t('cad.badgeTooltipView').replace('{file}', provenance.fileName).replace('{date}', provenance.importedAtIso.slice(0, 10))} onClick={() => setShowProvenance(true)}>⚠ {t('cad.draftBadge')}</button>}
      <div className="status-item"><span className="status-label">{t('status.pos')}:</span><span className="status-value">({toDisplay(uiStore.worldX, 'length', uiStore.unitSystem).toFixed(2)}, {toDisplay(uiStore.worldY, 'length', uiStore.unitSystem).toFixed(2)}) {unitLabel('length', uiStore.unitSystem)}</span></div>
      {uiStore.analysisMode !== '3d' && <div className="status-item"><span className="status-label">{t('status.zoom')}:</span><span className="status-value">{Math.round(uiStore.zoom)} px/m</span></div>}
      <div className="status-item"><span className="status-label">{t('status.model')}:</span><span className="status-value">{modelSummary()}</span></div>
      <div className="status-item"><span className="status-label">{t('status.selection')}:</span><span className="status-value">{selectionText()}</span></div>
      {uiStore.snapToGrid && <div className="status-item"><span className="status-label">{t('status.grid')}:</span><span className="status-value">{toDisplay(uiStore.gridSize, 'length', uiStore.unitSystem).toFixed(2)} {unitLabel('length', uiStore.unitSystem)}</span></div>}
    </div>
    {showProvenance && <CadProvenanceDialog onClose={() => setShowProvenance(false)} />}
  </>;
}
