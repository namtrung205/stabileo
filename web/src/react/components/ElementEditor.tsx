import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { localeExternalStore, t } from '../../lib/i18n/store.svelte';
import { historyStore, modelStore, uiStore } from '../../lib/store';
import { NO_RELEASE } from '../../lib/store/model.svelte';
import { useStoreRevision } from '../store/useStoreRevision';
import './ElementEditor.css';

const DOF_3D_LABELS = ['dx', 'dy', 'dz', 'θx', 'θy', 'θz'];
const EMPTY_JOINT = [false, false, false, false, false, false];
type Slide = '' | 'x' | 'z';
type Axis = 'global' | 'local';

export function ElementEditor() {
  useStoreRevision(uiStore);
  useStoreRevision(modelStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const editorRef = useRef<HTMLDivElement>(null);
  const elementId = uiStore.editingElementId;
  const element = elementId !== null ? modelStore.elements.get(elementId) : undefined;
  const rawPosition = uiStore.editScreenPos;
  const is3D = uiStore.analysisMode === '3d' || uiStore.analysisMode === 'pro';
  const [position, setPosition] = useState(rawPosition);
  const [hingeStart, setHingeStart] = useState(false);
  const [hingeEnd, setHingeEnd] = useState(false);
  const [materialId, setMaterialId] = useState(1);
  const [sectionId, setSectionId] = useState(1);
  const [slideStart, setSlideStart] = useState<Slide>('');
  const [slideEnd, setSlideEnd] = useState<Slide>('');
  const [slideStartAxis, setSlideStartAxis] = useState<Axis>('global');
  const [slideEndAxis, setSlideEndAxis] = useState<Axis>('global');
  const [jointStart, setJointStart] = useState<boolean[]>(EMPTY_JOINT);
  const [jointEnd, setJointEnd] = useState<boolean[]>(EMPTY_JOINT);

  useLayoutEffect(() => {
    if (!element) return;
    setHingeStart(element.releaseI?.mz === true);
    setHingeEnd(element.releaseJ?.mz === true);
    setSlideStart(element.releaseI?.slide ?? '');
    setSlideEnd(element.releaseJ?.slide ?? '');
    setSlideStartAxis(element.releaseI?.slideAxis ?? 'global');
    setSlideEndAxis(element.releaseJ?.slideAxis ?? 'global');
    setJointStart(element.jointI ? [...element.jointI.dof] : [...EMPTY_JOINT]);
    setJointEnd(element.jointJ ? [...element.jointJ.dof] : [...EMPTY_JOINT]);
    setMaterialId(element.materialId);
    setSectionId(element.sectionId);
  }, [elementId]);

  useLayoutEffect(() => {
    if (!element) return;
    const rect = editorRef.current?.getBoundingClientRect();
    let x = rawPosition.x;
    let y = rawPosition.y;
    if (rect) {
      if (y + rect.height + 10 > window.innerHeight) y = Math.max(10, window.innerHeight - rect.height - 10);
      const halfWidth = rect.width / 2;
      if (x - halfWidth < 10) x = halfWidth + 10;
      if (x + halfWidth > window.innerWidth - 10) x = window.innerWidth - halfWidth - 10;
    }
    setPosition({ x, y });
  }, [elementId, rawPosition.x, rawPosition.y, is3D]);

  if (!element || elementId === null) return null;
  const close = () => { uiStore.editingElementId = null; };
  const confirm = () => {
    const changed =
      hingeStart !== (element.releaseI?.mz === true) || hingeEnd !== (element.releaseJ?.mz === true) ||
      slideStart !== (element.releaseI?.slide ?? '') || slideEnd !== (element.releaseJ?.slide ?? '') ||
      slideStartAxis !== (element.releaseI?.slideAxis ?? 'global') || slideEndAxis !== (element.releaseJ?.slideAxis ?? 'global') ||
      (is3D && jointStart.some((value, index) => value !== (element.jointI?.dof[index] ?? false))) ||
      (is3D && jointEnd.some((value, index) => value !== (element.jointJ?.dof[index] ?? false))) ||
      materialId !== element.materialId || sectionId !== element.sectionId;
    if (changed) {
      historyStore.pushState();
      const releaseI = { ...(element.releaseI ?? NO_RELEASE), mz: hingeStart } as typeof element.releaseI;
      const releaseJ = { ...(element.releaseJ ?? NO_RELEASE), mz: hingeEnd } as typeof element.releaseJ;
      if (slideStart === '') { delete releaseI.slide; delete releaseI.slideAxis; }
      else { releaseI.slide = slideStart; releaseI.slideAxis = slideStartAxis; }
      if (slideEnd === '') { delete releaseJ.slide; delete releaseJ.slideAxis; }
      else { releaseJ.slide = slideEnd; releaseJ.slideAxis = slideEndAxis; }
      element.releaseI = releaseI;
      element.releaseJ = releaseJ;
      element.materialId = materialId;
      element.sectionId = sectionId;
      if (is3D) {
        if (jointStart.some(Boolean)) element.jointI = { dof: [...jointStart] as never };
        else delete element.jointI;
        if (jointEnd.some(Boolean)) element.jointJ = { dof: [...jointEnd] as never };
        else delete element.jointJ;
      }
    }
    close();
  };
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') { event.preventDefault(); confirm(); }
    else if (event.key === 'Escape') { event.preventDefault(); close(); }
    event.stopPropagation();
  };
  const toggleJoint = (values: boolean[], setValues: (values: boolean[]) => void, index: number) => {
    const next = [...values]; next[index] = !next[index]; setValues(next);
  };

  return <>
    <div className="element-editor-backdrop" onClick={close} />
    <div ref={editorRef} className="element-editor" style={{ left: position.x, top: position.y }} onKeyDown={onKeyDown}>
      <div className="element-editor-title">{t('editor.element')} {elementId}</div>
      <label className="element-editor-field">
        <span>{t('editor.material')}:</span>
        <select value={materialId} onChange={(event) => setMaterialId(Number(event.currentTarget.value))}>
          {[...modelStore.materials.values()].map((material) => <option value={material.id} key={material.id}>{material.name}</option>)}
        </select>
      </label>
      <label className="element-editor-field">
        <span>{t('editor.section')}:</span>
        <select value={sectionId} onChange={(event) => setSectionId(Number(event.currentTarget.value))}>
          {[...modelStore.sections.values()].map((section) => <option value={section.id} key={section.id}>{section.name}</option>)}
        </select>
      </label>
      <div className="element-editor-field"><label title={is3D ? t('prop.hinge3DDisclosure') : ''}>
        <input type="checkbox" checked={hingeStart} onChange={(event) => setHingeStart(event.currentTarget.checked)} />
        {t('editor.hingeStart')}{is3D ? ` ${t('prop.hinges3DSuffix')}` : ''}
      </label></div>
      <div className="element-editor-field"><label title={is3D ? t('prop.hinge3DDisclosure') : ''}>
        <input type="checkbox" checked={hingeEnd} onChange={(event) => setHingeEnd(event.currentTarget.checked)} />
        {t('editor.hingeEnd')}{is3D ? ` ${t('prop.hinges3DSuffix')}` : ''}
      </label></div>

      {!is3D && element.type === 'frame' && <>
        <label className="element-editor-field"><span>{t('editor.slideStart')}:</span>
          <select value={slideStart} onChange={(event) => setSlideStart(event.currentTarget.value as Slide)}>
            <option value="">{t('editor.slideNone')}</option><option value="x">{t('editor.slideX')}</option><option value="z">{t('editor.slideZ')}</option>
          </select>
          {slideStart !== '' && <select value={slideStartAxis} title={t('float.jointAxis')} onChange={(event) => setSlideStartAxis(event.currentTarget.value as Axis)}>
            <option value="global">{t('float.jointAxisGlobal')}</option><option value="local">{t('float.jointAxisLocal')}</option>
          </select>}
        </label>
        <label className="element-editor-field"><span>{t('editor.slideEnd')}:</span>
          <select value={slideEnd} onChange={(event) => setSlideEnd(event.currentTarget.value as Slide)}>
            <option value="">{t('editor.slideNone')}</option><option value="x">{t('editor.slideX')}</option><option value="z">{t('editor.slideZ')}</option>
          </select>
          {slideEnd !== '' && <select value={slideEndAxis} title={t('float.jointAxis')} onChange={(event) => setSlideEndAxis(event.currentTarget.value as Axis)}>
            <option value="global">{t('float.jointAxisGlobal')}</option><option value="local">{t('float.jointAxisLocal')}</option>
          </select>}
        </label>
      </>}

      {is3D && element.type === 'frame' && <div className="element-editor-joint3d" title={t('editor.joint3dHint')}>
        <div className="element-editor-joint-title">{t('editor.joint3dTitle')}</div>
        {([['I', jointStart, setJointStart], ['J', jointEnd, setJointEnd]] as const).map(([end, values, setValues]) =>
          <div className="element-editor-joint-row" key={end}><span className="element-editor-joint-end">{end}</span>
            {DOF_3D_LABELS.map((label, index) => <label className="element-editor-joint-dof" key={label}>
              <input type="checkbox" checked={values[index]} onChange={() => toggleJoint(values, setValues, index)} />{label}
            </label>)}
          </div>)}
      </div>}

      <div className="element-editor-info">{t('editor.nodesLabel')}: {element.nodeI} → {element.nodeJ} | L = {modelStore.getElementLength(elementId).toFixed(3)} m</div>
      <div className="element-editor-buttons">
        <button className="element-editor-ok" onClick={confirm}>OK</button>
        <button className="element-editor-cancel" onClick={close}>{t('editor.cancel')}</button>
      </div>
    </div>
  </>;
}
