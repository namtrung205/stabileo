import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import { modelStore, uiStore, resultsStore, historyStore } from '../../lib/store';
import { localeExternalStore, t } from '../../lib/i18n/store';
import { parseCadDxf, unsupportedFileKind, suggestUnitFromExtent } from '../../lib/cad/parse';
import { suggestLayerMappings, extractArchPlan } from '../../lib/cad/classify';
import { drawCadPreview, drawSemanticPreview, planBBox, ROLE_COLORS, fitView, zoomAround, panView, type PreviewView } from '../../lib/cad/preview';
import { drawDraftPreview } from '../../lib/cad/draft-preview';
import { diagnoseDraft, type DraftDiagnostics } from '../../lib/cad/diagnostics';
import { buildDraft, validateFloorRanges, type InferenceOptions, type FloorPlanSpec } from '../../lib/cad/draft-build';
import { cropDoc, densestPlanWindow, type PlanWindow } from '../../lib/cad/infer';
import { buildStabileoTemplateDxf } from '../../lib/cad/template';
import { parseScheduleRow } from '../../lib/cad/specs';
import {
  LAYER_ROLES, CONCRETE_GRADES,
  type CadDocument, type CadUnit, type LayerMapping, type LayerRole,
  type ConcreteGrade, type RcDraftAssumptions, type RcDraftResult,
  type SectionScheduleEntry,
} from '../../lib/cad/types';
import { useStoreRevision } from '../store/useStoreRevision';
import './CadImportWizard.css';

type PreviewMode = 'raw' | 'extracted' | 'draft';
type ScheduleRow = { kind: SectionScheduleEntry['kind']; mark: string; floors: string; dims: string };
type FloorRegion = PlanWindow & { fromFloor: number; toFloor: number; label: string };

type AssumptionForm = {
  nFloors: number; storyHeight: number; storyHeightsCsv: string; concreteGrade: ConcreteGrade;
  colB: number; colH: number; beamB: number; beamH: number; slabThickness: number; wallThickness: number;
  baseSupport: 'fixed3d' | 'pinned3d'; deadLoad: number; liveLoad: number; useRoofLr: boolean;
  roofLiveLoad: number; detectOffsets: boolean; offsetTolerance: number; roomBasedLiveLoads: boolean;
  generateCombos: boolean; meshSlabs: boolean; meshMode: 'targetSize' | 'fixedDivisions';
  meshTargetSize: number; meshDivisions: number; splitBeams: boolean; snapTolerance: number;
  infPruneBeams: boolean; infInferSlabs: boolean; infSnapColumns: boolean; infPruneFloating: boolean;
};

const DEFAULT_FORM: AssumptionForm = {
  nFloors: 1, storyHeight: 3, storyHeightsCsv: '', concreteGrade: 'H-30',
  colB: 0.3, colH: 0.3, beamB: 0.2, beamH: 0.5, slabThickness: 0.15, wallThickness: 0.15,
  baseSupport: 'fixed3d', deadLoad: 2, liveLoad: 2, useRoofLr: true, roofLiveLoad: 1,
  detectOffsets: true, offsetTolerance: 0.03, roomBasedLiveLoads: false, generateCombos: true,
  meshSlabs: true, meshMode: 'targetSize', meshTargetSize: 1, meshDivisions: 4,
  splitBeams: true, snapTolerance: 0.01, infPruneBeams: false, infInferSlabs: false,
  infSnapColumns: true, infPruneFloating: false,
};

const PREVIEW_ISO = '1970-01-01T00:00:00.000Z';
const STEP_LABELS = ['cad.step1', 'cad.step2', 'cad.step3', 'cad.step4'];
const GUIDE_ROLES: LayerRole[] = ['column', 'beam', 'wall', 'slab', 'opening', 'grid', 'text', 'ignore'];
const LEGEND_ROLES: LayerRole[] = ['column', 'beam', 'wall', 'slab', 'opening', 'grid'];

const numeric = (value: string) => Number.isFinite(Number(value)) ? Number(value) : 0;

function warningText(code: string): string {
  const [head, ...rest] = code.split(':');
  const base = t(`cad.warn.${head}`);
  if (base === `cad.warn.${head}`) return code;
  return base.replace('{n}', rest.at(-1) ?? '').replace('{type}', rest[0] ?? '');
}

export function CadImportEventHost() {
  useStoreRevision(uiStore);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const pickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const usesCadWizard = () => uiStore.analysisMode === '3d' || uiStore.analysisMode === 'pro';
    const importDxf = () => {
      if (usesCadWizard()) { setFile(null); setOpen(true); }
      else pickerRef.current?.click();
    };
    const dropDxf = (event: Event) => {
      const dropped = (event as CustomEvent<File>).detail;
      if (usesCadWizard()) { setFile(dropped); setOpen(true); }
      else window.dispatchEvent(new CustomEvent('stabileo-open-dxf-dialog', { detail: dropped }));
    };
    window.addEventListener('stabileo-import-dxf', importDxf);
    window.addEventListener('stabileo-dxf-drop', dropDxf);
    return () => {
      window.removeEventListener('stabileo-import-dxf', importDxf);
      window.removeEventListener('stabileo-dxf-drop', dropDxf);
    };
  }, []);

  return <>
    <input ref={pickerRef} type="file" accept=".dxf" hidden onChange={(event) => {
      const chosen = event.currentTarget.files?.[0];
      if (chosen) window.dispatchEvent(new CustomEvent('stabileo-open-dxf-dialog', { detail: chosen }));
      event.currentTarget.value = '';
    }} />
    <CadImportWizard open={open} file={file} onClose={() => { setOpen(false); setFile(null); }} />
  </>;
}

export function CadImportWizard({ open, file, onClose }: { open: boolean; file: File | null; onClose(): void }) {
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const [step, setStep] = useState(1);
  const [doc, setDoc] = useState<CadDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [unit, setUnit] = useState<CadUnit>('m');
  const [mappings, setMappings] = useState<LayerMapping[]>([]);
  const [draft, setDraft] = useState<RcDraftResult | null>(null);
  const [genError, setGenError] = useState<{ message: string; detail?: string } | null>(null);
  const [cadView, setCadView] = useState<PreviewView | null>(null);
  const [hoveredLayer, setHoveredLayer] = useState<string | null>(null);
  const [previewMode, setPreviewModeState] = useState<PreviewMode>('extracted');
  const [livePreviewDraft, setLivePreviewDraft] = useState<RcDraftResult | null>(null);
  const [livePreviewDiag, setLivePreviewDiag] = useState<DraftDiagnostics | null>(null);
  const [livePreviewBusy, setLivePreviewBusy] = useState(false);
  const [livePreviewError, setLivePreviewError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [form, setForm] = useState<AssumptionForm>(DEFAULT_FORM);
  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>([]);
  const [levelsPrefilled, setLevelsPrefilled] = useState(false);
  const [cropEnabled, setCropEnabled] = useState(false);
  const [cropWin, setCropWin] = useState<PlanWindow>({ x0: 0, x1: 0, y0: 0, y1: 0 });
  const [floorRegions, setFloorRegions] = useState<FloorRegion[]>([]);
  const [allowFloorGaps, setAllowFloorGaps] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DraftDiagnostics | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const previewCanvas = useRef<HTMLCanvasElement>(null);
  const readerRef = useRef<FileReader | null>(null);
  const dragPoint = useRef({ x: 0, y: 0 });

  const field = <K extends keyof AssumptionForm>(key: K, value: AssumptionForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const sanitizeWin = (win: PlanWindow): PlanWindow => ({
    x0: Number.isFinite(win.x0) ? win.x0 : doc?.bbox?.minX ?? 0,
    x1: Number.isFinite(win.x1) ? win.x1 : doc?.bbox?.maxX ?? 0,
    y0: Number.isFinite(win.y0) ? win.y0 : doc?.bbox?.minY ?? 0,
    y1: Number.isFinite(win.y1) ? win.y1 : doc?.bbox?.maxY ?? 0,
  });
  const effectiveDoc = useMemo(() => doc ? (cropEnabled ? cropDoc(doc, sanitizeWin(cropWin)) : doc) : null, [doc, cropEnabled, cropWin]);
  const plan = useMemo(() => effectiveDoc && !error ? extractArchPlan(effectiveDoc, mappings, unit) : null, [effectiveDoc, error, mappings, unit]);
  const unitWarning = useMemo(() => doc?.bbox ? suggestUnitFromExtent(doc.bbox, unit) : null, [doc, unit]);
  const inference: InferenceOptions = {
    pruneDisconnectedBeams: form.infPruneBeams,
    inferSlabPanels: form.infInferSlabs,
    snapPanelsToColumns: form.infSnapColumns,
    pruneFloatingMembers: form.infPruneFloating,
  };
  const anyInference = form.infPruneBeams || form.infInferSlabs || form.infPruneFloating;
  const effectiveMode: PreviewMode = step === 1 ? 'raw' : previewMode;
  const canPanZoom = !(step === 2 && previewMode === 'draft');
  const roleOf = (layer: string): LayerRole => mappings.find((mapping) => mapping.layer === layer)?.role ?? 'ignore';

  const layerContrib = useMemo(() => {
    const values = new Map<string, { columns: number; beams: number; walls: number; slabs: number }>();
    const bump = (layer: string | undefined, key: 'columns' | 'beams' | 'walls' | 'slabs') => {
      if (!layer) return;
      const value = values.get(layer) ?? { columns: 0, beams: 0, walls: 0, slabs: 0 };
      value[key] += 1; values.set(layer, value);
    };
    plan?.columns.forEach((item) => bump(item.srcLayer, 'columns'));
    plan?.beams.forEach((item) => bump(item.srcLayer, 'beams'));
    plan?.walls.forEach((item) => bump(item.srcLayer, 'walls'));
    plan?.slabs.forEach((item) => bump(item.srcLayer, 'slabs'));
    return values;
  }, [plan]);

  function reset() {
    readerRef.current?.abort();
    setStep(1); setDoc(null); setError(null); setFileName(''); setUnit('m'); setMappings([]);
    setDraft(null); setGenError(null); setCadView(null); setHoveredLayer(null); setPreviewModeState('extracted');
    setLivePreviewDraft(null); setLivePreviewDiag(null); setLivePreviewBusy(false); setLivePreviewError(null);
    setForm(DEFAULT_FORM); setScheduleRows([]); setLevelsPrefilled(false); setCropEnabled(false);
    setCropWin({ x0: 0, x1: 0, y0: 0, y1: 0 }); setFloorRegions([]); setAllowFloorGaps(false); setDiagnostics(null);
  }

  function loadFile(chosen: File) {
    readerRef.current?.abort();
    setFileName(chosen.name); setLevelsPrefilled(false);
    const kind = unsupportedFileKind(chosen.name);
    if (kind) { setDoc(null); setError(t(`cad.unsupported.${kind}`)); return; }
    const reader = new FileReader(); readerRef.current = reader;
    reader.onload = () => {
      try {
        const parsed = parseCadDxf(String(reader.result ?? ''), chosen.name);
        if (parsed.warnings.includes('parseError') || parsed.entities.length === 0) {
          setDoc(parsed); setError(parsed.warnings.includes('parseError') ? t('cad.parseError') : t('cad.emptyFile')); return;
        }
        setError(null); setDoc(parsed); setUnit(parsed.suggestedUnit ?? 'm');
        setMappings(suggestLayerMappings(parsed, parsed.suggestedUnit ?? 'm'));
        if (parsed.bbox) setCropWin({ x0: parsed.bbox.minX, x1: parsed.bbox.maxX, y0: parsed.bbox.minY, y1: parsed.bbox.maxY });
        setCadView(null); setHoveredLayer(null); setPreviewModeState('extracted'); setDraft(null); setStep(1);
      } catch { setError(t('cad.parseError')); }
    };
    reader.onerror = () => setError(t('cad.readError'));
    reader.readAsText(chosen);
  }

  useEffect(() => {
    if (!open) return;
    reset();
    if (file) loadFile(file);
    return () => readerRef.current?.abort();
  }, [open, file]);

  useEffect(() => {
    if (!open) return;
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [open, onClose]);

  useEffect(() => {
    const target = canvas.current;
    if (!target || !doc || !(step === 1 || step === 2)) return;
    if (effectiveMode === 'draft') {
      if (livePreviewDraft) drawDraftPreview(target, livePreviewDraft.snapshot, { highlightFailures: true });
      else { const context = target.getContext('2d'); context?.clearRect(0, 0, target.width, target.height); if (context) { context.fillStyle = '#10101c'; context.fillRect(0, 0, target.width, target.height); } }
      return;
    }
    if (effectiveMode === 'extracted' && plan) {
      const bbox = planBBox(plan); drawSemanticPreview(target, plan, { view: cadView ?? (bbox ? fitView(bbox, target.width, target.height) : null), highlightLayer: hoveredLayer });
      return;
    }
    drawCadPreview(target, doc, roleOf, { view: cadView ?? (doc.bbox ? fitView(doc.bbox, target.width, target.height) : null), crop: step === 1 && cropEnabled ? sanitizeWin(cropWin) : null, highlightLayer: step === 2 ? hoveredLayer : null });
  }, [doc, step, effectiveMode, plan, cadView, hoveredLayer, cropEnabled, cropWin, mappings, livePreviewDraft]);

  const schedules = () => scheduleRows.flatMap((row) => {
    const parsed = parseScheduleRow(`${row.mark.trim() || '*'} ${row.floors.trim()} ${row.dims.trim()}`, row.kind);
    return parsed ? [{ ...parsed, source: 'wizard' as const }] : [];
  });
  const assumptions = (): RcDraftAssumptions => {
    const heights = form.storyHeightsCsv.trim() ? form.storyHeightsCsv.split(',').map((part) => Number.parseFloat(part.trim())).filter((value) => value > 0) : [];
    return {
      nFloors: form.nFloors,
      storyHeights: heights.length === form.nFloors ? heights : Array.from({ length: form.nFloors }, () => form.storyHeight),
      concreteGrade: form.concreteGrade, columnSection: { b: form.colB, h: form.colH }, beamSection: { b: form.beamB, h: form.beamH },
      slabThickness: form.slabThickness, wallThickness: form.wallThickness, baseSupport: form.baseSupport,
      deadLoad: form.deadLoad, liveLoad: form.liveLoad, generateCombos: form.generateCombos,
      roofLiveLoad: form.useRoofLr ? form.roofLiveLoad : undefined, roomBasedLiveLoads: form.roomBasedLiveLoads,
      meshSlabs: form.meshSlabs, meshMode: form.meshMode, meshTargetSize: form.meshTargetSize,
      meshDivisions: form.meshDivisions, splitBeams: form.splitBeams, snapTolerance: form.snapTolerance,
      detectOffsets: form.detectOffsets, offsetTolerance: form.offsetTolerance, schedules: schedules(),
    };
  };

  useEffect(() => {
    if (!(step === 2 && previewMode === 'draft') || !doc || !plan) return;
    setLivePreviewBusy(true);
    const handle = window.setTimeout(() => {
      try {
        const result = buildDraft({ plan, assumptions: assumptions(), source: { fileName, importedAtIso: PREVIEW_ISO }, inference: anyInference ? inference : undefined });
        setLivePreviewDraft(result); setLivePreviewDiag(diagnoseDraft(result)); setLivePreviewError(null);
      } catch (reason) { setLivePreviewDraft(null); setLivePreviewDiag(null); setLivePreviewError(reason instanceof Error ? reason.message : String(reason)); }
      setLivePreviewBusy(false);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [step, previewMode, doc, plan, mappings, form, fileName]);

  useEffect(() => { if (previewCanvas.current && draft && step === 4) drawDraftPreview(previewCanvas.current, draft.snapshot, { highlightFailures: true }); }, [draft, step]);
  useEffect(() => { setCadView(null); }, [step, unit]);
  useEffect(() => { setAllowFloorGaps(false); }, [floorRegions, form.nFloors]);

  const currentBBox = () => effectiveMode === 'extracted' && plan ? planBBox(plan) : doc?.bbox ?? null;
  const ensureView = () => {
    if (cadView) return cadView;
    const bbox = currentBBox(), target = canvas.current;
    return target && bbox ? fitView(bbox, target.width, target.height) : { scale: 1, offsetX: 0, offsetY: 0 };
  };
  const canvasPoint = (clientX: number, clientY: number) => {
    const target = canvas.current!; const rect = target.getBoundingClientRect();
    return { sx: (clientX - rect.left) * target.width / rect.width, sy: (clientY - rect.top) * target.height / rect.height };
  };
  const onWheel = (event: ReactWheelEvent<HTMLCanvasElement>) => {
    if (!doc?.bbox || !canPanZoom) return; event.preventDefault(); const point = canvasPoint(event.clientX, event.clientY);
    setCadView(zoomAround(ensureView(), point.sx, point.sy, event.deltaY < 0 ? 1.15 : 1 / 1.15));
  };
  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!doc?.bbox || !canPanZoom) return; setDragging(true); dragPoint.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!dragging || !canvas.current) return; const rect = canvas.current.getBoundingClientRect();
    const dx = (event.clientX - dragPoint.current.x) * canvas.current.width / rect.width;
    const dy = (event.clientY - dragPoint.current.y) * canvas.current.height / rect.height;
    dragPoint.current = { x: event.clientX, y: event.clientY }; setCadView(panView(ensureView(), dx, dy));
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => { setDragging(false); try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* already released */ } };

  const assumptionsValid = form.nFloors >= 1 && form.storyHeight > 0 && form.colB > 0 && form.colH > 0
    && form.beamB > 0 && form.beamH > 0 && form.slabThickness > 0 && form.wallThickness > 0
    && form.deadLoad >= 0 && form.liveLoad >= 0 && form.meshDivisions >= 1 && form.snapTolerance > 0
    && (!form.meshSlabs || form.meshMode !== 'targetSize' || (form.meshTargetSize > 0 && Number.isFinite(form.meshTargetSize)));
  const classifiedCount = mappings.filter((mapping) => !['ignore', 'text', 'grid'].includes(mapping.role)).length;
  const skippedGroups = useMemo(() => {
    const groups = new Map<string, number>();
    plan?.skipped.forEach((item) => { const key = `${item.reason}|${item.layer}`; groups.set(key, (groups.get(key) ?? 0) + 1); });
    return [...groups].map(([key, count]) => { const [reason, layer] = key.split('|'); return { reason, layer, count }; });
  }, [plan]);

  function addFloorRegion() {
    const used = new Set(floorRegions.map((region) => region.label)); let index = 0; let label = '';
    do { label = `Plan ${index < 26 ? String.fromCharCode(65 + index) : `#${index + 1}`}`; index += 1; } while (used.has(label));
    const nextFloor = floorRegions.length ? Math.max(...floorRegions.map((region) => region.toFloor)) + 1 : 1;
    setFloorRegions((current) => [...current, { ...sanitizeWin(cropWin), fromFloor: nextFloor, toFloor: nextFloor, label }]);
  }

  function prefillFromPlan() {
    if (levelsPrefilled || !plan?.levelHeights?.length) return;
    setForm((current) => ({ ...current, nFloors: plan.levelHeights!.length, storyHeight: plan.levelHeights!.at(-1)!, storyHeightsCsv: plan.levelHeights!.join(', ') }));
    setLevelsPrefilled(true);
  }

  function goPreview() {
    if (!plan) return;
    if (!plan.columns.length && !plan.beams.length && !plan.walls.length && !plan.slabs.length) { setError(t('cad.nothingClassified')); return; }
    setError(null); setGenError(null);
    try {
      const source = { fileName, importedAtIso: new Date().toISOString() };
      let result: RcDraftResult;
      if (floorRegions.length && doc) {
        const floorPlans: FloorPlanSpec[] = floorRegions.map((region) => ({ plan: extractArchPlan(cropDoc(doc, sanitizeWin(region)), mappings, unit), fromFloor: region.fromFloor, toFloor: region.toFloor, label: region.label }));
        const hardErrors = validateFloorRanges(floorPlans, form.nFloors, allowFloorGaps).filter((issue) => issue.severity === 'error');
        if (hardErrors.length) {
          const gapOnly = hardErrors.every((issue) => issue.message.startsWith('floorRangeGap:'));
          setGenError({ message: gapOnly ? t('cad.floorGapConfirm') : t('cad.floorRangeError'), detail: hardErrors.map((issue) => warningText(issue.message)).join('\n') });
          if (gapOnly) setAllowFloorGaps(true); return;
        }
        result = buildDraft({ floorPlans, assumptions: assumptions(), source, inference: anyInference ? inference : undefined, allowFloorGaps });
      } else result = buildDraft({ plan, assumptions: assumptions(), source, inference: anyInference ? inference : undefined });
      setDraft(result); setDiagnostics(diagnoseDraft(result)); setStep(4);
    } catch (reason) {
      setGenError({ message: t('cad.generateFailed'), detail: import.meta.env.DEV || import.meta.env.MODE === 'test' ? (reason instanceof Error ? reason.stack ?? reason.message : String(reason)) : undefined });
    }
  }

  function applyDraft() {
    if (!draft) return; historyStore.pushState(); modelStore.restore(draft.snapshot); resultsStore.clear();
    uiStore.toast(t('cad.applied').replace('{nodes}', String(draft.counts.nodes)).replace('{elems}', String(draft.counts.columns + draft.counts.beams)).replace('{shells}', String(draft.counts.slabQuads + draft.counts.wallQuads)), 'success');
    onClose();
  }

  if (!open) return null;

  return <div className="cad-react-wizard overlay" role="presentation">
    <div className="dialog" role="dialog" aria-modal="true" aria-label={t('cad.title')}>
      <div className="header"><h2>{t('cad.title')}</h2><span className="file-name">{fileName}</span><button className="close-btn" onClick={onClose} title={t('cad.cancel')}>✕</button></div>
      <div className="steps">{STEP_LABELS.map((label, index) => <span key={label} className={`step-chip${step === index + 1 ? ' active' : ''}${step > index + 1 ? ' done' : ''}`}>{index + 1}. {t(label)}</span>)}</div>
      <div className="body">
        {step === 1 && <>
          <input ref={fileInput} type="file" accept=".dxf" hidden onChange={(event) => { const chosen = event.currentTarget.files?.[0]; if (chosen) loadFile(chosen); event.currentTarget.value = ''; }} />
          <div className="open-actions"><button className="btn" onClick={() => { const url = URL.createObjectURL(new Blob([buildStabileoTemplateDxf()], { type: 'application/dxf' })); const link = document.createElement('a'); link.href = url; link.download = 'stabileo-template.dxf'; link.click(); URL.revokeObjectURL(url); }}>⬇ {t('cad.downloadTemplate')}</button><button className="btn primary" onClick={() => fileInput.current?.click()}>📂 {t('cad.openFile')}</button></div>
          <div className="row hint">{t('cad.downloadTemplateHint')}</div>{!doc && !error && <div className="row hint open-prompt">{t('cad.openPrompt')}</div>}
        </>}
        {error && <div className="error">{error}</div>}
        {doc && !error && (step === 1 || step === 2) && <div className="split">
          <div className="left">
            {step === 1 ? <>
              <h3>{t('cad.unitsTitle')}</h3><div className="row"><label htmlFor="cad-unit">{t('cad.units')}</label><select id="cad-unit" value={unit} onChange={(event) => { const next = event.currentTarget.value as CadUnit; setUnit(next); setMappings(suggestLayerMappings(doc, next)); }}><option value="m">{t('cad.meters')}</option><option value="cm">{t('cad.centimeters')}</option><option value="mm">{t('cad.millimeters')}</option></select><span className="hint">{doc.suggestedUnit ? t('cad.unitSuggested').replace('{u}', doc.suggestedUnit) : t('cad.unitUnknown')}</span></div>
              {unitWarning && <div className="unit-warn" role="alert">⚠ {t('cad.unitSanity').replace('{cur}', unit).replace('{curM}', unitWarning.currentExtentM.toFixed(2)).replace('{sug}', unitWarning.suggested).replace('{sugM}', unitWarning.suggestedExtentM.toFixed(2))}<button className="btn mini" onClick={() => { setUnit(unitWarning.suggested); setMappings(suggestLayerMappings(doc, unitWarning.suggested)); }}>{t('cad.unitUseSuggested').replace('{u}', unitWarning.suggested)}</button></div>}
              {doc.bbox && <div className="row hint">{t('cad.extents').replace('{w}', ((doc.bbox.maxX - doc.bbox.minX) * (unit === 'm' ? 1 : unit === 'cm' ? .01 : .001)).toFixed(2)).replace('{h}', ((doc.bbox.maxY - doc.bbox.minY) * (unit === 'm' ? 1 : unit === 'cm' ? .01 : .001)).toFixed(2))}</div>}
              <details className="panel crop-panel"><summary>{t('cad.cropTitle')}</summary><div className="hint">{t('cad.cropHint')}</div><label className="check"><input type="checkbox" checked={cropEnabled} onChange={(event) => setCropEnabled(event.currentTarget.checked)} />{t('cad.cropEnable')}</label><div className={`crop-grid${cropEnabled ? '' : ' disabled'}`}>{(['x0','x1','y0','y1'] as const).map((key) => <label key={key}>{key[0]}<sub>{key[1]}</sub><input type="number" step="0.1" value={cropWin[key]} disabled={!cropEnabled} onChange={(event) => setCropWin((current) => ({ ...current, [key]: numeric(event.currentTarget.value) }))} /></label>)}</div><div className="crop-actions"><button className="btn mini" onClick={() => { const win = densestPlanWindow(doc); if (win) { setCropWin(win); setCropEnabled(true); } }}>{t('cad.cropAuto')}</button><button className="btn mini" disabled={!cropEnabled} onClick={() => doc.bbox && setCropWin({ x0: doc.bbox.minX, x1: doc.bbox.maxX, y0: doc.bbox.minY, y1: doc.bbox.maxY })}>{t('cad.cropFull')}</button></div></details>
              <h3>{t('cad.contents')}</h3><div className="row hint">{doc.entities.length} {t('cad.entities')} · {doc.layers.length} {t('cad.layersN')}</div>{Object.entries(doc.unsupported).map(([type, count]) => <div className="warn-line" key={type}>⚠ {t('cad.warn.unsupportedEntity').replace('{type}', type).replace('{n}', String(count))}</div>)}
            </> : <>
              <h3>{t('cad.layerRoles')}</h3><div className="hint">{t('cad.layerRolesHint')}</div><div className="table-wrap"><table className="layer-table"><thead><tr><th>{t('cad.layer')}</th><th>#</th><th>{t('cad.suggested')}</th><th>{t('cad.role')}</th><th>{t('cad.generates')}</th></tr></thead><tbody>{mappings.map((mapping) => {
                const layer = doc.layers.find((item) => item.name === mapping.layer); const breakdown = Object.entries(layer?.entityCounts ?? {}).map(([kind, count]) => `${count} ${kind}`).join(', '); const contrib = layerContrib.get(mapping.layer);
                return <tr key={mapping.layer} className={hoveredLayer === mapping.layer ? 'hl' : ''} onMouseEnter={() => setHoveredLayer(mapping.layer)} onMouseLeave={() => setHoveredLayer((current) => current === mapping.layer ? null : current)}><td className="layer-name"><span className="role-dot" style={{ background: ROLE_COLORS[mapping.role] }} />{mapping.layer}{breakdown && <div className="layer-breakdown">{breakdown}</div>}</td><td className="num">{layer?.total ?? 0}</td><td className="suggested" title={mapping.evidence}>{t(`cad.role.${mapping.suggested}`)}<span className={`conf conf-${mapping.confidence}`}>{t(`cad.conf.${mapping.confidence}`)}</span></td><td><select value={mapping.role} onChange={(event) => setMappings((current) => current.map((item) => item.layer === mapping.layer ? { ...item, role: event.currentTarget.value as LayerRole } : item))}>{LAYER_ROLES.map((role) => <option value={role} key={role}>{t(`cad.role.${role}`)}</option>)}</select></td><td className="contrib">{contrib ? <>{contrib.columns > 0 && <span>🟥{contrib.columns}</span>}{contrib.beams > 0 && <span>🟦{contrib.beams}</span>}{contrib.walls > 0 && <span>🟧{contrib.walls}</span>}{contrib.slabs > 0 && <span>🔷{contrib.slabs}</span>}</> : !['ignore','text','grid'].includes(mapping.role) && <span className="contrib-zero">0</span>}</td></tr>;
              })}</tbody></table></div>
              {plan && <div className="row hint">{t('cad.classified').replace('{cols}', String(plan.columns.length)).replace('{beams}', String(plan.beams.length)).replace('{walls}', String(plan.walls.length)).replace('{slabs}', String(plan.slabs.length))}</div>}
              <details className="role-guide"><summary>{t('cad.roleGuide')}</summary><dl>{GUIDE_ROLES.map((role) => <div className="role-guide-row" key={role}><dt><span className="role-dot" style={{ background: ROLE_COLORS[role] }} />{t(`cad.role.${role}`)}</dt><dd>{t(`cad.roleGuide.${role}`)}</dd></div>)}</dl></details>
            </>}
          </div>
          <div className="right">{step === 2 && <div className="preview-modes" role="tablist" aria-label={t('cad.previewModeLabel')}>{(['raw','extracted','draft'] as const).map((mode) => <button className={`pmode${previewMode === mode ? ' active' : ''}`} role="tab" aria-selected={previewMode === mode} key={mode} onClick={() => { setPreviewModeState(mode); setCadView(null); }}>{t(`cad.preview${mode[0].toUpperCase()}${mode.slice(1)}`)}</button>)}</div>}
            <canvas ref={canvas} width={380} height={320} className={`preview-canvas${dragging ? ' dragging' : ''}${canPanZoom ? '' : ' iso'}`} onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp} />
            <div className="preview-toolbar"><span className="preview-hint">{canPanZoom ? t('cad.previewNav') : t('cad.previewIso')}</span>{canPanZoom && <button className="btn mini" onClick={() => setCadView(null)}>⤢ {t('cad.previewFit')}</button>}</div>
            {step === 1 && cropEnabled && <div className="preview-status crop-on">◈ {t('cad.cropActive')}</div>}
            {step === 2 && effectiveMode === 'draft' && <>{livePreviewBusy ? <div className="preview-status muted">⏳ {t('cad.previewUpdating')}</div> : livePreviewError ? <div className="preview-status err">⚠ {t('cad.previewDraftFailed')}</div> : livePreviewDiag && livePreviewDraft && <><div className={`preview-status ${livePreviewDiag.level === 'error' ? 'err' : livePreviewDiag.level === 'warn' ? 'warnc' : ''}`}>{livePreviewDiag.level === 'ok' ? '✓' : livePreviewDiag.level === 'warn' ? '⚠' : '✕'} {livePreviewDraft.counts.columns}🟥 · {livePreviewDraft.counts.beams}🟦 · {livePreviewDraft.counts.slabQuads}🔷 · {livePreviewDraft.counts.nodes} {t('cad.cNodes')}</div><div className="preview-status muted">{t('cad.previewDraftNote')}</div></>}</>}
            {step === 2 && effectiveMode !== 'draft' && <>{hoveredLayer ? <div className="preview-status"><span className="role-dot" style={{ background: ROLE_COLORS[roleOf(hoveredLayer)] }} /><code>{hoveredLayer}</code> → {t(`cad.role.${roleOf(hoveredLayer)}`)}</div> : <div className="preview-status muted">{t('cad.layerHoverHint')}</div>}{plan && <div className="preview-status counts"><span>🟥 {plan.columns.length}</span><span>🟦 {plan.beams.length}</span><span>🟧 {plan.walls.length}</span><span>🔷 {plan.slabs.length}</span>{plan.openings.length > 0 && <span>⬚ {plan.openings.length}</span>}</div>}</>}
            <div className="legend">{LEGEND_ROLES.map((role) => <span key={role}><span className="role-dot" style={{ background: ROLE_COLORS[role] }} />{t(`cad.role.${role}`)}</span>)}</div>
          </div>
        </div>}

        {doc && !error && step === 3 && <StepThree form={form} field={field} plan={plan} genError={genError} scheduleRows={scheduleRows} setScheduleRows={setScheduleRows} cropEnabled={cropEnabled} floorRegions={floorRegions} setFloorRegions={setFloorRegions} addFloorRegion={addFloorRegion} />}
        {doc && !error && step === 4 && draft && <StepFour draft={draft} diagnostics={diagnostics} mappings={mappings} skippedGroups={skippedGroups} previewCanvas={previewCanvas} />}
      </div>
      <div className="footer"><button className="btn" onClick={onClose}>{t('cad.cancel')}</button><span className="spacer" />{step > 1 && <button className="btn" onClick={() => setStep((current) => current - 1)}>{t('cad.back')}</button>}{step < 3 ? <button className="btn primary" disabled={!doc || !!error} onClick={() => { if (step === 2) prefillFromPlan(); setStep((current) => current + 1); }}>{t('cad.next')}</button> : step === 3 ? <button className="btn primary" disabled={!plan || !assumptionsValid || classifiedCount === 0} onClick={goPreview}>{t('cad.generateDraft')}</button> : <button className="btn apply" disabled={!draft} onClick={applyDraft}>{t('cad.apply')}</button>}</div>
    </div>
  </div>;
}

type StepThreeProps = {
  form: AssumptionForm;
  field: <K extends keyof AssumptionForm>(key: K, value: AssumptionForm[K]) => void;
  plan: ReturnType<typeof extractArchPlan> | null;
  genError: { message: string; detail?: string } | null;
  scheduleRows: ScheduleRow[]; setScheduleRows: React.Dispatch<React.SetStateAction<ScheduleRow[]>>;
  cropEnabled: boolean; floorRegions: FloorRegion[]; setFloorRegions: React.Dispatch<React.SetStateAction<FloorRegion[]>>; addFloorRegion(): void;
};

function StepThree({ form, field, plan, genError, scheduleRows, setScheduleRows, cropEnabled, floorRegions, setFloorRegions, addFloorRegion }: StepThreeProps) {
  const numberField = <K extends keyof AssumptionForm>(key: K, options: { min?: number; max?: number; step?: number; disabled?: boolean } = {}) => <input type="number" value={form[key] as number} {...options} onChange={(event) => field(key, numeric(event.currentTarget.value) as AssumptionForm[K])} />;
  const check = <K extends keyof AssumptionForm>(key: K, disabled = false) => <input type="checkbox" checked={Boolean(form[key])} disabled={disabled} onChange={(event) => field(key, event.currentTarget.checked as AssumptionForm[K])} />;
  return <>
    {genError && <div className="gen-error" role="alert"><strong>⚠ {genError.message}</strong><div className="gen-error-note">{t('cad.modelNotModified')}</div>{genError.detail && <pre className="gen-error-detail">{genError.detail}</pre>}</div>}
    <div className="banner">{t('cad.replicatedBanner')}</div><div className="form-grid">
      <details className="panel" open><summary>{t('cad.geometry')}</summary><label>{t('cad.nFloors')}{numberField('nFloors', { min: 1, max: 50, step: 1 })}</label><label>{t('cad.storyHeight')}{numberField('storyHeight', { min: .1, step: .1 })}</label><label>{t('cad.storyHeightsCsv')}<input type="text" placeholder="3, 3, 2.8" value={form.storyHeightsCsv} onChange={(event) => field('storyHeightsCsv', event.currentTarget.value)} /></label></details>
      <details className="panel" open><summary>{t('cad.materialSections')}</summary><label>{t('cad.concreteGrade')}<select value={form.concreteGrade} onChange={(event) => field('concreteGrade', event.currentTarget.value as ConcreteGrade)}>{Object.keys(CONCRETE_GRADES).map((grade) => <option key={grade}>{grade}</option>)}</select></label><label>{t('cad.colSection')}<span className="pair">{numberField('colB', { min: .05, step: .05 })} × {numberField('colH', { min: .05, step: .05 })}</span></label><label>{t('cad.beamSection')}<span className="pair">{numberField('beamB', { min: .05, step: .05 })} × {numberField('beamH', { min: .05, step: .05 })}</span></label><label>{t('cad.slabThickness')}{numberField('slabThickness', { min: .05, step: .01 })}</label><label>{t('cad.wallThickness')}{numberField('wallThickness', { min: .05, step: .01 })}</label></details>
      <details className="panel" open><summary>{t('cad.supportsLoads')}</summary><label>{t('cad.baseSupport')}<select value={form.baseSupport} onChange={(event) => field('baseSupport', event.currentTarget.value as AssumptionForm['baseSupport'])}><option value="fixed3d">{t('cad.fixed')}</option><option value="pinned3d">{t('cad.pinned')}</option></select></label><label>{t('cad.deadLoad')}{numberField('deadLoad', { min: 0, step: .5 })}</label><label>{t('cad.liveLoad')}{numberField('liveLoad', { min: 0, step: .5 })}</label><label className="check">{check('useRoofLr')}{t('cad.useRoofLr')}</label><label>{t('cad.roofLiveLoad')}{numberField('roofLiveLoad', { min: 0, step: .5, disabled: !form.useRoofLr })}</label><div className="hint">{t('cad.loadsHint')}</div><label className="check">{check('roomBasedLiveLoads', !plan?.roomLabels.length)}{t('cad.roomBasedLive')}</label>{plan?.roomLabels.length ? <><div className="hint">{t('cad.roomLabelsFound').replace('{n}', String(plan.roomLabels.length))}</div>{form.roomBasedLiveLoads && <div className="room-map">{[...new Map(plan.roomLabels.map((room) => [room.category, room.q]))].map(([category, q]) => <span key={category}>{t(`cad.roomCat.${category}`)} → {q} kN/m²</span>)}</div>}</> : <div className="hint">{t('cad.roomNoLabels')}</div>}<label className="check">{check('generateCombos')}{t('cad.generateCombos')}</label></details>
      <details className="panel" open><summary>{t('cad.meshing')}</summary><label className="check">{check('meshSlabs')}{t('cad.meshSlabs')}</label><label>{t('cad.meshMode')}<select value={form.meshMode} disabled={!form.meshSlabs} onChange={(event) => field('meshMode', event.currentTarget.value as AssumptionForm['meshMode'])}><option value="targetSize">{t('cad.meshModeTarget')}</option><option value="fixedDivisions">{t('cad.meshModeFixed')}</option></select></label>{form.meshMode === 'targetSize' ? <><label>{t('cad.meshTargetSize')}{numberField('meshTargetSize', { min: .25, max: 5, step: .25, disabled: !form.meshSlabs })}</label><div className="hint">{t('cad.meshTargetHint')}</div></> : <label>{t('cad.meshDivisions')}{numberField('meshDivisions', { min: 1, max: 12, step: 1, disabled: !form.meshSlabs })}</label>}<label className="check">{check('splitBeams')}{t('cad.splitBeams')}</label><label>{t('cad.snapTolerance')}{numberField('snapTolerance', { min: .001, max: .1, step: .001 })}</label></details>
      <details className="panel"><summary>{t('cad.schedulesPanel')}</summary><div className="hint">{t('cad.schedulesHint')}</div>{plan && plan.schedules.length > 0 && <div className="hint">{t('cad.schedulesFromCad').replace('{n}', String(plan.schedules.length))}</div>}{scheduleRows.map((row, index) => <div className="sched-row" key={index}><select value={row.kind} onChange={(event) => setScheduleRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, kind: event.currentTarget.value as ScheduleRow['kind'] } : item))}>{(['column','beam','wall','slab'] as const).map((kind) => <option value={kind} key={kind}>{t(`cad.role.${kind}`)}</option>)}</select>{(['mark','floors','dims'] as const).map((key) => <input key={key} type="text" value={row[key]} placeholder={key === 'mark' ? 'C1 | *' : key === 'floors' ? '1-3' : '40x60 | 20'} onChange={(event) => setScheduleRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: event.currentTarget.value } : item))} />)}<button className="btn mini" onClick={() => setScheduleRows((current) => current.filter((_, itemIndex) => itemIndex !== index))}>✕</button></div>)}<button className="btn mini" onClick={() => setScheduleRows((current) => [...current, { kind: 'column', mark: '*', floors: `1-${form.nFloors}`, dims: '' }])}>+ {t('cad.schedRowAdd')}</button></details>
      <details className="panel"><summary>{t('cad.offsetsPanel')}</summary><label className="check">{check('detectOffsets')}{t('cad.detectOffsets')}</label><label>{t('cad.offsetTol')}{numberField('offsetTolerance', { min: .01, max: .2, step: .01, disabled: !form.detectOffsets })}</label><div className="hint">{t('cad.offsetsHint')}</div></details>
      <details className="panel infer-panel"><summary>{t('cad.inferPanel')}</summary><div className="hint warn-text">{t('cad.inferHint')}</div><label className="check">{check('infPruneBeams')}{t('cad.inferPruneBeams')}</label><label className="check">{check('infInferSlabs')}{t('cad.inferSlabs')}</label><label className={`check sub${form.infInferSlabs ? '' : ' disabled'}`}>{check('infSnapColumns', !form.infInferSlabs)}{t('cad.inferSnapColumns')}</label><label className="check">{check('infPruneFloating')}{t('cad.inferPruneFloating')}</label></details>
      <details className="panel floors-panel"><summary>{t('cad.floorPlansPanel')}</summary><div className="hint">{t('cad.floorPlansHint')}</div>{floorRegions.map((region, index) => <div className="region-row" key={index}><input type="text" className="region-label" value={region.label} onChange={(event) => setFloorRegions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.currentTarget.value } : item))} /><span className="region-range">{t('cad.floors')} <input type="number" min="1" value={region.fromFloor} onChange={(event) => setFloorRegions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, fromFloor: numeric(event.currentTarget.value) } : item))} />–<input type="number" min="1" value={region.toFloor} onChange={(event) => setFloorRegions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, toFloor: numeric(event.currentTarget.value) } : item))} /></span><span className="region-win">[{region.x0.toFixed(1)},{region.y0.toFixed(1)}]–[{region.x1.toFixed(1)},{region.y1.toFixed(1)}]</span><button className="btn mini" onClick={() => setFloorRegions((current) => current.filter((_, itemIndex) => itemIndex !== index))}>✕</button></div>)}<button className="btn mini" onClick={addFloorRegion} disabled={!cropEnabled}>+ {t('cad.floorPlanAdd')}</button>{!cropEnabled && <div className="hint">{t('cad.floorPlanNeedCrop')}</div>}</details>
    </div>
  </>;
}

function StepFour({ draft, diagnostics, mappings, skippedGroups, previewCanvas }: { draft: RcDraftResult; diagnostics: DraftDiagnostics | null; mappings: LayerMapping[]; skippedGroups: Array<{ reason: string; layer: string; count: number }>; previewCanvas: React.RefObject<HTMLCanvasElement | null> }) {
  const countRows: Array<[string, number]> = [['cad.cNodes', draft.counts.nodes], ['cad.cColumns', draft.counts.columns], ['cad.cBeams', draft.counts.beams], ['cad.cSlabQuads', draft.counts.slabQuads], ['cad.cWallQuads', draft.counts.wallQuads], ['cad.cSupports', draft.counts.supports], ['cad.cLoads', draft.counts.loads], ['cad.cCombos', draft.counts.combinations], ['cad.cSplits', draft.counts.beamsSplit], ['cad.cOffsets', draft.counts.beamsWithOffsets], ['cad.cAmbiguous', draft.counts.offsetsAmbiguous], ['cad.cSchedAssign', draft.counts.scheduleAssignments]];
  const previewLegend: Array<[string, string]> = [
    ['#e94560', 'cad.role.column'], ['#4ecdc4', 'cad.role.beam'],
    ['#6a9fe0', 'cad.role.slab'], ['#f0a500', 'cad.role.wall'],
    ['#ff5d5d', 'cad.diagFloatingNode'],
  ];
  return <>
    <div className="banner">{t('cad.draftBanner')}</div>
    <div className="preview-row">
      <div className="preview-pane">
        <canvas ref={previewCanvas} width={420} height={320} />
        <div className="legend">{previewLegend.map(([color, label]) => <span key={label}><span className="role-dot" style={{ background: color }} />{t(label)}</span>)}</div>
      </div>
      {diagnostics && <div className={`diag-pane diag-${diagnostics.level}`}>
        <div className="diag-head">{diagnostics.level === 'ok' ? '✅' : diagnostics.level === 'warn' ? '⚠' : '⛔'} <strong>{t(`cad.diagVerdict.${diagnostics.solvableShape ? 'ok' : diagnostics.level}`)}</strong></div>
        <ul className="diag-list">{diagnostics.checks.map((check) => <li className={`diag-${check.level}`} key={check.id}>{t(`cad.diag.${check.id}`).replace('{n}', String(check.values?.n ?? '')).replace('{orphans}', String(check.values?.orphans ?? ''))}</li>)}</ul>
      </div>}
    </div>
    <div className="split">
      <div className="left">
        <h3>{t('cad.draftCounts')}</h3>
        <table className="counts-table"><tbody>{countRows.map(([key, value]) => <tr key={key}><td>{t(key)}</td><td className="num">{value}</td></tr>)}</tbody></table>
        {draft.counts.openingsDetected > 0 && <>
          <h3>{t('cad.openingsSummary')}</h3>
          <div className="role-summary">
            <span>{t('cad.openDetected')}: {draft.counts.openingsDetected}</span>
            <span>{t('cad.openCut')}: {draft.counts.openingsCutFromSlabs}</span>
            <span className={draft.counts.openingsNotCut > 0 ? 'warn-text' : ''}>{t('cad.openNotCut')}: {draft.counts.openingsNotCut}</span>
          </div>
        </>}
        <h3>{t('cad.specSummary')}</h3>
        <div className="role-summary">
          <span>{t('cad.spec.schedule')}: {draft.counts.specSections.schedule}</span>
          <span>{t('cad.spec.label')}: {draft.counts.specSections.label}</span>
          <span>{t('cad.spec.geometry')}: {draft.counts.specSections.geometry}</span>
          <span className={draft.counts.specSections.default > 0 ? 'warn-text' : ''}>{t('cad.spec.default')}: {draft.counts.specSections.default}</span>
        </div>
        {Object.keys(draft.counts.liveLoadByCategory).length > 0 && <>
          <h3>{t('cad.liveLoadSummary')}</h3>
          <div className="role-summary">
            {Object.entries(draft.counts.liveLoadByCategory).map(([category, count]) => <span key={category}>{t(`cad.roomCat.${category}`)}: {count} {t('cad.quadFloors')}</span>)}
            {draft.counts.liveLoadDefaulted > 0 && <span className="warn-text">{t('cad.liveDefaulted')}: {draft.counts.liveLoadDefaulted}</span>}
          </div>
        </>}
        <h3>{t('cad.roleSummary')}</h3>
        <div className="role-summary">{mappings.filter((mapping) => mapping.role !== 'ignore').map((mapping) => <span key={mapping.layer}><span className="role-dot" style={{ background: ROLE_COLORS[mapping.role] }} />{mapping.layer} → {t(`cad.role.${mapping.role}`)}</span>)}</div>
      </div>
      <div className="right scroll">
        {draft.warnings.length > 0 && <><h3>{t('cad.warnings')}</h3>{draft.warnings.map((warning, index) => <div className={`warn-line sev-${warning.severity}`} key={index}>{warning.severity === 'info' ? 'ℹ' : '⚠'} {warningText(warning.message)}</div>)}</>}
        {skippedGroups.length > 0 && <><h3>{t('cad.skipped')}</h3>{skippedGroups.map((group) => <div className="warn-line sev-warning" key={`${group.reason}-${group.layer}`}>⚠ {group.count} × {t(`cad.skip.${group.reason}`)} ({group.layer})</div>)}</>}
        <h3>{t('cad.assumptions')}</h3>{draft.provenance.assumptions.map((assumption, index) => <div className="assumption-line" key={index}>• {assumption}</div>)}
      </div>
    </div>
  </>;
}
