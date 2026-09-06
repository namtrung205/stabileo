import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { localeExternalStore, t } from '../../lib/i18n/store';
import { mapIfcToModel, type IfcMappingResult, type IfcMember } from '../../lib/ifc/ifc-mapper';
import { historyStore, modelStore, resultsStore, uiStore } from '../../lib/store';
import type { Section } from '../../lib/store/model';
import './IfcImportDialog.css';

export interface IfcImportDialogProps {
  open?: boolean;
  file?: File | null;
  onClose?: () => void;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function IfcImportDialog({ open = false, file = null, onClose = () => {} }: IfcImportDialogProps) {
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const [members, setMembers] = useState<IfcMember[]>([]);
  const [mappingResult, setMappingResult] = useState<IfcMappingResult | null>(null);
  const [snapTolerance, setSnapTolerance] = useState(.01);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const dialogRef = useRef<HTMLDivElement>(null);

  const remap = (source: IfcMember[], tolerance: number) => {
    if (!source.length) {
      setMappingResult(null);
      return;
    }
    try {
      setMappingResult(mapIfcToModel(source, { snapTolerance: tolerance }));
      setError(null);
    } catch (caught) {
      setError(errorMessage(caught, t('ifc.mapError')));
      setMappingResult(null);
    }
  };

  useEffect(() => {
    if (!file) {
      setMembers([]);
      setMappingResult(null);
      setError(null);
      setLoading(false);
      setFileName('');
      setParseWarnings([]);
      return;
    }
    let active = true;
    const reader = new FileReader();
    setFileName(file.name);
    setLoading(true);
    setError(null);
    reader.onload = async () => {
      try {
        const { parseIfc } = await import('../../lib/ifc/ifc-parser');
        const parsed = await parseIfc(reader.result as ArrayBuffer);
        if (!active) return;
        setMembers(parsed.members);
        setParseWarnings(parsed.warnings);
        remap(parsed.members, snapTolerance);
      } catch (caught) {
        if (!active) return;
        setError(errorMessage(caught, t('ifc.parseError')));
        setMembers([]);
        setMappingResult(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    reader.onerror = () => {
      if (!active) return;
      setError(t('ifc.readError'));
      setLoading(false);
    };
    reader.readAsArrayBuffer(file);
    return () => {
      active = false;
      if (reader.readyState === FileReader.LOADING) reader.abort();
    };
  }, [file]);

  useEffect(() => {
    if (open) requestAnimationFrame(() => dialogRef.current?.focus());
  }, [open]);

  const changeTolerance = (value: string) => {
    const next = Number.parseFloat(value);
    if (Number.isNaN(next) || next <= 0) return;
    setSnapTolerance(next);
    remap(members, next);
  };

  const importModel = () => {
    if (!mappingResult) return;
    const mapped = mappingResult;
    historyStore.pushState();
    modelStore.clear();
    resultsStore.clear();

    const idMap = new Map<number, number>();
    for (const node of mapped.nodes) idMap.set(node.id, modelStore.addNode(node.x, node.y, node.z));

    const materialIds = mapped.materials.map((material) => modelStore.addMaterial({
      name: material.name,
      e: material.e,
      nu: material.nu,
      rho: material.rho,
    }));
    const materialId = materialIds[0] ?? 1;

    const sectionIds = mapped.sections.map((section) => modelStore.addSection({
      name: section.name,
      a: section.a,
      iz: section.iz,
      iy: section.iy,
      j: section.j,
      h: section.h,
      b: section.b,
      tw: section.tw,
      tf: section.tf,
      t: section.t,
      shape: section.shape as Section['shape'],
    }));
    const sectionId = sectionIds[0] ?? 1;

    for (const element of mapped.elements) {
      const nodeI = idMap.get(element.nodeI);
      const nodeJ = idMap.get(element.nodeJ);
      if (nodeI === undefined || nodeJ === undefined) continue;
      const elementId = modelStore.addElement(nodeI, nodeJ, element.type);
      if (materialId !== 1) modelStore.updateElementMaterial(elementId, materialId);
      if (sectionId !== 1) modelStore.updateElementSection(elementId, sectionId);
    }

    uiStore.analysisMode = '3d';
    uiStore.toast(t('ifc.imported').replace('{n}', String(mapped.nodes.length)).replace('{e}', String(mapped.elements.length)), 'success');
    onClose();
  };

  if (!open) return null;
  const beamCount = members.filter((member) => member.type === 'beam').length;
  const columnCount = members.filter((member) => member.type === 'column').length;
  const braceCount = members.filter((member) => member.type === 'brace').length;
  const warnings = [...parseWarnings, ...(mappingResult?.warnings ?? [])];

  return <div
    ref={dialogRef}
    className="react-ifc-import ifc-overlay"
    role="dialog"
    aria-modal="true"
    aria-label={t('ifc.title')}
    tabIndex={-1}
    onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}
  >
    <button type="button" className="ifc-backdrop" onClick={onClose} aria-label={t('ifc.cancel')} />
    <div className="ifc-dialog">
      <div className="ifc-header"><h2>{t('ifc.title')}</h2><button type="button" className="ifc-close" onClick={onClose} aria-label={t('ifc.cancel')}>✕</button></div>
      {error && <div className="ifc-error" role="alert">{error}</div>}
      {fileName && <div className="ifc-filename">{fileName}</div>}
      <div className="ifc-body">
        {loading ? <div className="ifc-loading"><span className="ifc-spinner" />{t('ifc.loading')}</div> : <>
          <div className="ifc-options"><label className="ifc-field"><span>{t('ifc.snapTolerance')}</span><input type="number" step="0.001" min="0.001" value={snapTolerance} onChange={(event) => changeTolerance(event.target.value)} /></label></div>
          {members.length > 0 && <div className="ifc-preview">
            <h3>{t('ifc.membersFound')}</h3>
            <div className="ifc-stats"><span>{t('ifc.beams')}: {beamCount}</span><span>{t('ifc.columns')}: {columnCount}</span><span>{t('ifc.braces')}: {braceCount}</span></div>
          </div>}
          {mappingResult && <div className="ifc-preview">
            <h3>{t('ifc.modelToImport')}</h3>
            <div className="ifc-stats"><span>{t('ifc.nodes')}: {mappingResult.nodes.length}</span><span>{t('ifc.elements')}: {mappingResult.elements.length}</span><span>{t('ifc.materials')}: {mappingResult.materials.length}</span><span>{t('ifc.sections')}: {mappingResult.sections.length}</span></div>
            {mappingResult.sections.length > 0 && <div className="ifc-sections"><h4>{t('ifc.sectionsLabel')}</h4>{mappingResult.sections.map((section, index) => <span className="ifc-tag" key={`${section.name}-${index}`}>{section.name}</span>)}</div>}
            {mappingResult.materials.length > 0 && <div className="ifc-sections"><h4>{t('ifc.materialsLabel')}</h4>{mappingResult.materials.map((material, index) => <span className="ifc-tag" key={`${material.name}-${index}`}>{material.name} (E={material.e} MPa)</span>)}</div>}
          </div>}
          {warnings.length > 0 && <div className="ifc-warnings"><h4>{t('ifc.warnings')}</h4><ul>{warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul></div>}
        </>}
      </div>
      <div className="ifc-footer"><button type="button" className="ifc-btn-cancel" onClick={onClose}>{t('ifc.cancel')}</button><button type="button" className="ifc-btn-import" disabled={!mappingResult || mappingResult.elements.length === 0} onClick={importModel}>{t('ifc.importModel')}</button></div>
    </div>
  </div>;
}

export function IfcImportEventHost() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    const chooseFile = () => inputRef.current?.click();
    window.addEventListener('stabileo-import-ifc', chooseFile);
    return () => window.removeEventListener('stabileo-import-ifc', chooseFile);
  }, []);

  const close = () => setFile(null);
  return <>
    <input ref={inputRef} type="file" accept=".ifc" className="ifc-file-input" onChange={(event) => {
      setFile(event.target.files?.[0] ?? null);
      event.target.value = '';
    }} />
    <IfcImportDialog open={file !== null} file={file} onClose={close} />
  </>;
}
