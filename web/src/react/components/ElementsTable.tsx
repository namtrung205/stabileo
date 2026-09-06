import { useState, useSyncExternalStore } from 'react';
import { isUnusualPairing } from '../../lib/data/structural-grades';
import { localeExternalStore, t } from '../../lib/i18n/store';
import { historyStore, modelStore, resultsStore, uiStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';
import { PairingNote } from './PairingNote';
import './EditorTables.css';
import './ElementsTable.css';

export function ElementsTable() {
  useStoreRevision(modelStore); useStoreRevision(resultsStore); useStoreRevision(uiStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const nodes = [...modelStore.nodes.values()]; const elements = [...modelStore.elements.values()];
  const materials = [...modelStore.materials.values()]; const sections = [...modelStore.sections.values()];
  const [nodeI, setNodeI] = useState(0); const [nodeJ, setNodeJ] = useState(0); const [type, setType] = useState<'frame' | 'truss'>('frame');
  const is3D = uiStore.analysisMode === '3d' || uiStore.analysisMode === 'pro';
  const unusual = elements.flatMap((element) => { const section = modelStore.sections.get(element.sectionId); const material = modelStore.materials.get(element.materialId); return isUnusualPairing(section?.profileFamily ?? '', material?.gradeId) === true ? [{ id: element.id, family: section?.profileFamily, gradeId: material?.gradeId }] : []; });
  function add() { if (!modelStore.getNode(nodeI) || !modelStore.getNode(nodeJ) || nodeI === nodeJ) return; historyStore.pushState(); modelStore.addElement(nodeI, nodeJ, type); resultsStore.clear(); }
  return <div className="editor-data-grid react-elements-table"><table><thead><tr><th>ID</th><th>{t('table.type')}</th><th>{t('table.nodeI')}</th><th>{t('table.nodeJ')}</th><th>{t('prop.material')}</th><th>{t('table.sectionHeader')}</th><th title={is3D ? t('prop.hinge3DDisclosure') : ''}>{t('table.hingeI')}{is3D ? ` ${t('prop.hinges3DSuffix')}` : ''}</th><th title={is3D ? t('prop.hinge3DDisclosure') : ''}>{t('table.hingeJ')}{is3D ? ` ${t('prop.hinges3DSuffix')}` : ''}</th><th>L (m)</th><th /></tr></thead><tbody>
    {elements.map((element) => <tr key={element.id}><td className="id-cell">{element.id}</td><td>{element.type}</td><td>{element.nodeI}</td><td>{element.nodeJ}</td><td><select value={element.materialId} onChange={(event) => modelStore.updateElementMaterial(element.id, Number(event.currentTarget.value))}>{materials.map((material) => <option key={material.id} value={material.id}>{material.name}</option>)}</select></td><td><select value={element.sectionId} onChange={(event) => modelStore.updateElementSection(element.id, Number(event.currentTarget.value))}>{sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}</select></td><td className="hinge-cell" title={is3D ? t('prop.hinge3DDisclosure') : ''} onClick={() => modelStore.toggleHinge(element.id, 'start')}>{element.releaseI?.mz === true ? '○' : '—'}</td><td className="hinge-cell" title={is3D ? t('prop.hinge3DDisclosure') : ''} onClick={() => modelStore.toggleHinge(element.id, 'end')}>{element.releaseJ?.mz === true ? '○' : '—'}</td><td>{modelStore.getElementLength(element.id).toFixed(3)}</td><td><button className="del" onClick={() => modelStore.removeElement(element.id)}>✕</button></td></tr>)}
  </tbody></table>
    {unusual.map((item) => <div className="pairing-note" key={item.id}><span className="pairing-elem">#{item.id}</span><PairingNote family={item.family} gradeId={item.gradeId} /></div>)}
    <div className="table-footer"><div className="add-row"><span className="add-label">I:</span><select value={nodeI} onChange={(event) => setNodeI(Number(event.currentTarget.value))} className="add-input">{nodes.map((node) => <option key={node.id} value={node.id}>{node.id}</option>)}</select><span className="add-label">J:</span><select value={nodeJ} onChange={(event) => setNodeJ(Number(event.currentTarget.value))} className="add-input">{nodes.map((node) => <option key={node.id} value={node.id}>{node.id}</option>)}</select><select value={type} onChange={(event) => setType(event.currentTarget.value as 'frame' | 'truss')} className="add-input"><option value="frame">{t('table.frame')}</option><option value="truss">{t('table.truss')}</option></select><button className="add-btn" onClick={add}>{t('table.addElement')}</button></div></div>
  </div>;
}
