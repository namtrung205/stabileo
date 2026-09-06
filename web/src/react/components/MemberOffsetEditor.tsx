import { useEffect, useState, useSyncExternalStore } from 'react';
import { shouldEmbedFlat2DModelIn3D } from '../../lib/engine/solver-service';
import { localeExternalStore, t } from '../../lib/i18n/store';
import type { MemberOffset } from '../../lib/model/element-3d-metadata';
import { modelStore, uiStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';
import './MemberOffsetEditor.css';

export function MemberOffsetEditor() {
  useStoreRevision(modelStore); useStoreRevision(uiStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const ids = [...uiStore.selectedElements]; const count = ids.length;
  const selected = count === 1 ? modelStore.elements.get(ids[0]) : undefined;
  const current = selected?.offset;
  const [frame, setFrame] = useState<'local' | 'global'>('local');
  const [values, setValues] = useState({ x: '0', y: '0', z: '0' });
  useEffect(() => { const vector = selected?.offset?.i ?? selected?.offset?.j; setFrame(selected?.offset?.frame ?? 'local'); setValues(vector ? { x: String(vector.x), y: String(vector.y), z: String(vector.z) } : { x: '0', y: '0', z: '0' }); }, [selected?.id, current]);
  if (!['3d', 'pro'].includes(uiStore.analysisMode) || count === 0) return null;
  const blocked = shouldEmbedFlat2DModelIn3D({ nodes: modelStore.nodes, elements: modelStore.elements, supports: modelStore.supports, loads: modelStore.loads, materials: modelStore.materials, sections: modelStore.sections, plates: modelStore.plates, quads: modelStore.quads });
  const clear = () => { count === 1 ? modelStore.setElementOffset(ids[0], null) : modelStore.setElementsOffset(ids, null); setValues({ x: '0', y: '0', z: '0' }); };
  const apply = () => { const x = Number(values.x), y = Number(values.y), z = Number(values.z); if (![x, y, z].every(Number.isFinite)) return; if (x === 0 && y === 0 && z === 0) return clear(); const offset: MemberOffset = { frame, i: { x, y, z }, j: { x, y, z } }; count === 1 ? modelStore.setElementOffset(ids[0], offset) : modelStore.setElementsOffset(ids, offset); };
  return <div className="mo"><div className="mo-title">{t('pro.memberOffset')} <span className="mo-count">({count})</span></div><div className="mo-row"><label>{t('pro.offsetFrame')}<select value={frame} onChange={(e) => setFrame(e.currentTarget.value as 'local' | 'global')}><option value="local">{t('pro.offsetLocal')}</option><option value="global">{t('pro.offsetGlobal')}</option></select></label></div><div className="mo-row mo-vec">{(['x','y','z'] as const).map((axis) => <label key={axis}>{frame === 'local' ? ({x:'x∥',y:'y',z:'z↑'}[axis]) : axis.toUpperCase()}<input type="number" step="any" value={values[axis]} onChange={(e) => setValues({ ...values, [axis]: e.currentTarget.value })} /></label>)}<span className="mo-unit">m</span></div>{blocked && <div className="mo-warn">⚠ {t('pro.offsetEmbedWarn')}</div>}<div className="mo-actions"><button className="mo-btn" onClick={apply} disabled={blocked}>{t('pro.offsetApply')}</button><button className="mo-btn mo-clear" onClick={clear} disabled={count === 1 && !current}>{t('pro.offsetClear')}</button></div>{current && <div className="mo-active">{t('pro.offsetActive')}</div>}<div className="mo-warn">⚠ {t('pro.offsetWarn')}</div></div>;
}
