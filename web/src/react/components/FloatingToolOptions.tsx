import { useSyncExternalStore } from 'react';
import { t, localeExternalStore } from '../../lib/i18n/store';
import { modelStore, uiStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';
import { planeLevelAxis } from '../../lib/geometry/coordinate-system';
import './FloatingToolOptions.css';

function useOptionsState() {
  useStoreRevision(uiStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
}

export function ToolElementOptions() {
  useOptionsState();
  return <span className="react-tool-element">
    {(['frame', 'truss'] as const).map((kind) => <label className="ft-opt-radio" key={kind}>
      <input type="radio" name="ft-elemType" value={kind} checked={uiStore.elementCreateType === kind} onChange={() => { uiStore.elementCreateType = kind; }} />
      <span>{t(kind === 'frame' ? 'float.elementRigid' : 'float.elementTruss')}</span>
    </label>)}
    <span className="ft-sep">|</span><span className="ft-hint">{t('float.elementHint')}</span>
  </span>;
}

const SELECT_MODES = [
  { id: 'nodes', key: 'float.selectNodes', hint: 'float.selectNodesHint' },
  { id: 'elements', key: 'float.selectElements', hint: 'float.selectElementsHint' },
  { id: 'supports', key: 'float.selectSupports', hint: 'float.selectSupportsHint' },
  { id: 'loads', key: 'float.selectLoads', hint: 'float.selectLoadsHint' },
] as const;

export function ToolSelectOptions() {
  useOptionsState();
  const current = SELECT_MODES.find((mode) => mode.id === uiStore.selectMode);
  return <span className="react-tool-select">
    {SELECT_MODES.map((mode) => <button className={`ft-opt-btn${uiStore.selectMode === mode.id ? ' active' : ''}`} onClick={() => { uiStore.selectMode = mode.id; }} key={mode.id}>{t(mode.key)}</button>)}
    {current && <span className="ft-hint">{t(current.hint)}</span>}
  </span>;
}

const JOINT_TYPES = [
  { id: 'hinge', glyph: '○', label: 'float.jointHinge', hint: 'float.jointHingeHint' },
  { id: 'slideX', glyph: '↔', label: 'float.jointSlideX', hint: 'float.jointSlideXHint' },
  { id: 'slideZ', glyph: '↕', label: 'float.jointSlideZ', hint: 'float.jointSlideZHint' },
] as const;

export function ToolNodeOptions() {
  useOptionsState();
  const is3D = uiStore.analysisMode === '3d';
  const creating = uiStore.nodeMode === 'create';
  const hint = creating ? (is3D ? 'float.nodeClickPlane' : 'float.nodeClickCanvas')
    : is3D ? 'float.joint3dHint'
    : uiStore.jointType === 'hinge' ? 'float.nodeHingesHint' : 'float.jointSlideHint';

  return <span className="react-tool-node">
    <button className={`ft-opt-btn${creating ? ' active' : ''}`} onClick={() => { uiStore.nodeMode = 'create'; }}>{t('float.nodeCreate')}</button>
    <button className={`ft-opt-btn${!creating ? ' active' : ''}`} onClick={() => { uiStore.nodeMode = 'hinge'; }}>{t('float.nodeJoints')}</button>
    {!creating && !is3D && <>
      <span className="ft-sep">|</span>
      {JOINT_TYPES.map((joint) => <button className={`ft-opt-btn glyph${uiStore.jointType === joint.id ? ' active' : ''}`} onClick={() => { uiStore.jointType = joint.id; }} title={t(joint.hint)} key={joint.id}><span className="jg">{joint.glyph}</span> {t(joint.label)}</button>)}
      {uiStore.jointType !== 'hinge' && <><span className="ft-sep">|</span><span className="ft-caption">{t('float.jointAxis')}</span><button className={`ft-opt-btn${uiStore.jointAxis === 'global' ? ' active' : ''}`} onClick={() => { uiStore.jointAxis = 'global'; }} title={t('float.jointAxisGlobalHint')}>{t('float.jointAxisGlobal')}</button><button className={`ft-opt-btn${uiStore.jointAxis === 'local' ? ' active' : ''}`} onClick={() => { uiStore.jointAxis = 'local'; }} title={t('float.jointAxisLocalHint')}>{t('float.jointAxisLocal')}</button></>}
    </>}
    {!creating && is3D && <><span className="ft-sep">|</span><span className="ft-caption" title={t('float.joint3dRelease')}>{t('float.joint3dRelease')}</span>{['dx', 'dy', 'dz', 'θx', 'θy', 'θz'].map((label, index) => <button className={`ft-opt-btn glyph${uiStore.jointDof3d[index] ? ' active' : ''}`} onClick={() => uiStore.toggleJointDof3d(index)} title={t('float.joint3dDofHint')} key={label}>{label}</button>)}</>}
    {creating && is3D && <>
      <span className="ft-sep">|</span><span className="ft-caption">{t('float.nodePlane')}</span>
      {(['XY', 'XZ', 'YZ'] as const).map((plane) => <button className={`ft-opt-btn${uiStore.workingPlane === plane ? ' active' : ''}`} onClick={() => { uiStore.workingPlane = plane; }} title={t(`float.nodePlane${plane}`)} key={plane}>{plane}</button>)}
      <span className="ft-sep">|</span><label className="ft-input-group" title={t('float.nodeLevelTooltip')}><span>{t('float.nodeLevel').replace('{axis}', planeLevelAxis(uiStore.workingPlane).toUpperCase())}</span><input type="number" value={uiStore.nodeCreateZ} step="0.5" onChange={(event) => { if (Number.isFinite(event.currentTarget.valueAsNumber)) uiStore.nodeCreateZ = event.currentTarget.valueAsNumber; }} /><span className="ft-unit">m</span></label>
    </>}
    <span className="ft-sep">|</span><span className="ft-hint">{t(hint)}</span>
  </span>;
}

function NumberField({ label, value, step, title, unit, setValue }: { label: string; value: number; step: number; title?: string; unit?: string; setValue(value: number): void }) {
  return <label className="ft-input-group" title={title}><span>{label}</span><input type="number" value={value} step={step} onChange={(event) => { if (Number.isFinite(event.currentTarget.valueAsNumber)) setValue(event.currentTarget.valueAsNumber); }} />{unit && <span className="ft-unit">{unit}</span>}</label>;
}

const SUPPORT_TYPES = [
  { id: 'fixed', key: 'float.supportFixedShort', icon: '▣' },
  { id: 'pinned', key: 'float.supportPinnedShort', icon: '△' },
  { id: 'roller', key: 'float.supportRoller', icon: '' },
  { id: 'spring', key: 'float.supportSpring', icon: '⌇' },
] as const;

export function ToolSupportOptions() {
  useOptionsState();
  if (uiStore.analysisMode === '3d') {
    const degrees = [
      { label: 'Fx', title: 'float.supportRestrainTx', checked: uiStore.sup3dTx, set: (value: boolean) => { uiStore.sup3dTx = value; } },
      { label: 'Fy', title: 'float.supportRestrainTy', checked: uiStore.sup3dTy, set: (value: boolean) => { uiStore.sup3dTy = value; } },
      { label: 'Fz', title: 'float.supportRestrainTz', checked: uiStore.sup3dTz, set: (value: boolean) => { uiStore.sup3dTz = value; } },
      { label: 'Mx', title: 'float.supportRestrainRx', checked: uiStore.sup3dRx, set: (value: boolean) => { uiStore.sup3dRx = value; } },
      { label: 'My', title: 'float.supportRestrainRy', checked: uiStore.sup3dRy, set: (value: boolean) => { uiStore.sup3dRy = value; } },
      { label: 'Mz', title: 'float.supportRestrainRz', checked: uiStore.sup3dRz, set: (value: boolean) => { uiStore.sup3dRz = value; } },
    ];
    const springs = [
      { label: 'kx:', hidden: uiStore.sup3dTx, value: uiStore.sup3dKx, set: (value: number) => { uiStore.sup3dKx = value; } },
      { label: 'ky:', hidden: uiStore.sup3dTy, value: uiStore.sup3dKy, set: (value: number) => { uiStore.sup3dKy = value; } },
      { label: 'kz:', hidden: uiStore.sup3dTz, value: uiStore.sup3dKz, set: (value: number) => { uiStore.sup3dKz = value; } },
      { label: 'krx:', hidden: uiStore.sup3dRx, value: uiStore.sup3dKrx, set: (value: number) => { uiStore.sup3dKrx = value; } },
      { label: 'kry:', hidden: uiStore.sup3dRy, value: uiStore.sup3dKry, set: (value: number) => { uiStore.sup3dKry = value; } },
      { label: 'krz:', hidden: uiStore.sup3dRz, value: uiStore.sup3dKrz, set: (value: number) => { uiStore.sup3dKrz = value; } },
    ];
    return <span className="react-tool-support">
      {degrees.map((degree) => <label className="ft-chk" title={t(degree.title)} key={degree.label}><input type="checkbox" checked={degree.checked} onChange={(event) => degree.set(event.currentTarget.checked)} /> <span>{degree.label}</span></label>)}
      <span className="ft-sep">|</span>
      <button className="ft-opt-btn" onClick={() => uiStore.setSupport3DPreset('fixed')} title={t('float.supportFixed3dTitle')}>▣ {t('float.supportFixedShort')}</button>
      <button className="ft-opt-btn" onClick={() => uiStore.setSupport3DPreset('pinned')} title={t('float.supportPinned3dTitle')}>△ {t('float.supportPinnedShort')}</button>
      <span className="ft-sep">|</span>
      {springs.filter((spring) => !spring.hidden).map((spring) => <NumberField label={spring.label} value={spring.value} step={100} setValue={spring.set} key={spring.label} />)}
      <span className="ft-hint">{t('float.supportHint')}</span>
    </span>;
  }

  const globalAxes = uiStore.supportIsGlobal;
  return <span className="react-tool-support">
    {SUPPORT_TYPES.map((support) => <button className={`ft-opt-btn ft-sup-btn${uiStore.supportType === support.id ? ' active' : ''}`} onClick={() => { uiStore.supportType = support.id; }} title={t(support.key)} key={support.id}>
      {support.id === 'roller' ? <svg className="ft-sup-svg" viewBox="0 0 20 20" width="16" height="16"><polygon points="10,2 3,12 17,12" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="7" cy="16" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><circle cx="13" cy="16" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg> : support.icon}{t(support.key)}
    </button>)}
    {uiStore.supportType === 'spring' ? <>
      <span className="ft-sep">|</span>
      <NumberField label="kx:" value={uiStore.springKx} step={100} setValue={(value) => { uiStore.springKx = value; }} />
      <NumberField label="ky:" value={uiStore.springKy} step={100} setValue={(value) => { uiStore.springKy = value; }} />
      <NumberField label="kθ:" value={uiStore.springKz} step={100} setValue={(value) => { uiStore.springKz = value; }} />
      <span className="ft-sep">|</span>
      <button className={`ft-opt-btn ft-coord-btn${globalAxes ? ' active' : ''}`} onClick={() => { uiStore.supportIsGlobal = true; }} title={t('float.supportGlobalAxes')}>Gl</button>
      <button className={`ft-opt-btn ft-coord-btn${!globalAxes ? ' active' : ''}`} onClick={() => { uiStore.supportIsGlobal = false; }} title={t('float.supportLocalAxes')}>Loc</button>
      <NumberField label="α:" value={uiStore.supportAngle} step={5} unit="°" title={t('float.supportAngle')} setValue={(value) => { uiStore.supportAngle = value; }} />
    </> : uiStore.supportType === 'roller' ? <>
      <span className="ft-sep">|</span>
      <button className={`ft-opt-btn ft-dir-btn${uiStore.supportDirection === 'x' ? ' active' : ''}`} onClick={() => { uiStore.supportDirection = 'x'; }} title={globalAxes ? t('float.rollerRestrictsYGlobal') : t('float.rollerRestrictsJLocal')}>{globalAxes ? 'X' : 'i'}</button>
      <button className={`ft-opt-btn ft-dir-btn${uiStore.supportDirection === 'y' ? ' active' : ''}`} onClick={() => { uiStore.supportDirection = 'y'; }} title={globalAxes ? t('float.rollerRestrictsXGlobal') : t('float.rollerRestrictsILocal')}>{globalAxes ? 'Y' : 'j'}</button>
      <span className="ft-sep">|</span>
      <button className={`ft-opt-btn ft-coord-btn${globalAxes ? ' active' : ''}`} onClick={() => { uiStore.supportIsGlobal = true; }} title={t('float.rollerGlobalLabel')}>Gl</button>
      <button className={`ft-opt-btn ft-coord-btn${!globalAxes ? ' active' : ''}`} onClick={() => { uiStore.supportIsGlobal = false; }} title={t('float.rollerLocalLabel')}>Loc</button>
      <NumberField label="di:" value={uiStore.supportDx} step={0.001} unit="m" title={t('float.prescribedRollerDisp')} setValue={(value) => { uiStore.supportDx = value; }} />
      <NumberField label="α:" value={uiStore.supportAngle} step={5} unit="°" title={t('float.supportAngle')} setValue={(value) => { uiStore.supportAngle = value; }} />
    </> : <>
      <span className="ft-sep">|</span>
      {(uiStore.supportType === 'fixed' || uiStore.supportType === 'pinned') && <><NumberField label="dx:" value={uiStore.supportDx} step={0.001} title={t('float.prescribedDx')} setValue={(value) => { uiStore.supportDx = value; }} /><NumberField label="dy:" value={uiStore.supportDy} step={0.001} title={t('float.prescribedDy')} setValue={(value) => { uiStore.supportDy = value; }} /></>}
      {uiStore.supportType === 'fixed' && <NumberField label="dθz:" value={uiStore.supportDrz} step={0.001} title={t('float.prescribedDrz')} setValue={(value) => { uiStore.supportDrz = value; }} />}
      <NumberField label="α:" value={uiStore.supportAngle} step={5} unit="°" title={t('float.supportAngleVisual')} setValue={(value) => { uiStore.supportAngle = value; }} />
    </>}
  </span>;
}

const LOAD_TYPES = [
  { id: 'nodal', key: 'float.loadPoint' },
  { id: 'distributed', key: 'float.loadDistributed' },
  { id: 'thermal', key: 'float.loadThermal' },
] as const;

export function ToolLoadOptions() {
  useOptionsState();
  useStoreRevision(modelStore);
  const is3D = uiStore.analysisMode === '3d';
  const loadIsGlobal = uiStore.loadIsGlobal;
  const coordinateButtons = <><span className="ft-sep">|</span><button className={`ft-opt-btn ft-coord-btn${loadIsGlobal ? ' active' : ''}`} onClick={() => { uiStore.loadIsGlobal = true; }} title={t('float.loadGlobalYDir')}>Z</button><button className={`ft-opt-btn ft-coord-btn${!loadIsGlobal ? ' active' : ''}`} onClick={() => { uiStore.loadIsGlobal = false; }} title={t('float.loadPerpDir')}>⊥</button><NumberField label="α:" value={uiStore.loadAngle} step={5} unit="°" setValue={(value) => { uiStore.loadAngle = value; }} /></>;

  return <span className="react-tool-load">
    <label className="ft-selfweight-toggle" title={t('float.loadSelfWeightTooltip')}><input type="checkbox" checked={uiStore.includeSelfWeight} onChange={(event) => { uiStore.includeSelfWeight = event.currentTarget.checked; }} /><span>PP</span></label>
    <span className="ft-sep">|</span><span className="ft-case-dot" style={{ background: modelStore.getLoadCaseColor(uiStore.activeLoadCaseId) }} />
    <select className="ft-case-select" value={String(uiStore.activeLoadCaseId)} onChange={(event) => { uiStore.activeLoadCaseId = Number.parseInt(event.currentTarget.value, 10); }} title={t('float.activeLoadCase')}>{modelStore.loadCases.map((loadCase) => <option value={String(loadCase.id)} key={loadCase.id}>{loadCase.type || loadCase.name}</option>)}</select>
    <span className="ft-sep">|</span>
    {LOAD_TYPES.map((loadType) => <button className={`ft-opt-btn${uiStore.loadType === loadType.id ? ' active' : ''}`} onClick={() => { uiStore.loadType = loadType.id; }} key={loadType.id}>{t(loadType.key)}</button>)}
    <span className="ft-sep">|</span>
    {uiStore.loadType === 'nodal' ? is3D ? <>
      {([['fx', 'float.loadForceX3d', 'Fx'], ['fy', 'float.loadForceY3d', 'Fy'], ['fz', 'float.loadForceZ3d', 'Fz'], ['mx', 'float.loadMomentX3d', 'Mx'], ['my', 'float.loadMomentY3d', 'My'], ['mz', 'float.loadMomentZ3d', 'Mz']] as const).map(([id, title, label]) => <button className={`ft-opt-btn ft-dir-btn${uiStore.nodalLoadDir3D === id ? ' active' : ''}`} onClick={() => { uiStore.nodalLoadDir3D = id; }} title={t(title)} key={id}>{label}</button>)}
      <NumberField label={['mx', 'my', 'mz'].includes(uiStore.nodalLoadDir3D) ? 'M:' : 'F:'} value={uiStore.loadValue} step={1} unit={['mx', 'my', 'mz'].includes(uiStore.nodalLoadDir3D) ? 'kN·m' : 'kN'} setValue={(value) => { uiStore.loadValue = value; }} />
    </> : <>
      {([['fx', 'float.loadForceXGlobal', 'float.loadForceXLocal', 'Fx', 'Fi'], ['fz', 'float.loadForceYGlobal', 'float.loadForceYLocal', 'Fz', 'Fj'], ['my', 'float.loadMomentZ', 'float.loadMomentZ', 'My', 'My']] as const).map(([id, globalTitle, localTitle, globalLabel, localLabel]) => <button className={`ft-opt-btn ft-dir-btn${uiStore.nodalLoadDir === id ? ' active' : ''}`} onClick={() => { uiStore.nodalLoadDir = id; }} title={t(loadIsGlobal ? globalTitle : localTitle)} key={id}>{loadIsGlobal ? globalLabel : localLabel}</button>)}
      <NumberField label={uiStore.nodalLoadDir === 'my' ? 'M:' : 'F:'} value={uiStore.loadValue} step={1} unit={uiStore.nodalLoadDir === 'my' ? 'kN·m' : 'kN'} setValue={(value) => { uiStore.loadValue = value; }} />{coordinateButtons}
    </> : uiStore.loadType === 'thermal' ? <>
      <NumberField label="ΔT:" value={uiStore.thermalDT} step={5} unit="°C" setValue={(value) => { uiStore.thermalDT = value; }} />
      <NumberField label="ΔTg:" value={uiStore.thermalDTg} step={5} unit="°C" setValue={(value) => { uiStore.thermalDTg = value; }} />
    </> : <>
      <NumberField label={is3D ? 'qYI:' : 'qI:'} value={uiStore.loadValue} step={1} unit="kN/m" setValue={(value) => { uiStore.loadValue = value; }} />
      <NumberField label={is3D ? 'qYJ:' : 'qJ:'} value={uiStore.loadValueJ} step={1} unit="kN/m" setValue={(value) => { uiStore.loadValueJ = value; }} />
      {is3D ? <><NumberField label="qZI:" value={uiStore.loadValueZ} step={1} unit="kN/m" setValue={(value) => { uiStore.loadValueZ = value; }} /><NumberField label="qZJ:" value={uiStore.loadValueZJ} step={1} unit="kN/m" setValue={(value) => { uiStore.loadValueZJ = value; }} /></> : coordinateButtons}
    </>}
  </span>;
}
