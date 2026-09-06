import { useEffect, useState, useSyncExternalStore } from 'react';
import { mapDxfToModel, parseMaterialText, parseSectionText } from '../../lib/dxf/mapper';
import { parseDxf } from '../../lib/dxf/parser';
import type { DxfMappingResult, DxfParseResult, DxfUnit } from '../../lib/dxf/types';
import { localeExternalStore, t } from '../../lib/i18n/store';
import { historyStore, modelStore, resultsStore, uiStore } from '../../lib/store';
import './DxfImportDialog.css';

const KNOWN_LAYERS = new Set([
  'BARRAS', 'ELEMENTOS', 'ELEMENTS', 'BARS',
  'TRUSS', 'RETICULADO', 'RETICULADOS',
  'APOYOS', 'CARGAS', 'SECCIONES', 'MATERIALES', 'ARTICULACIONES',
]);

/** React owner for the legacy 2D DXF import workflow. */
export function DxfImportDialog() {
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);

  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<DxfParseResult | null>(null);
  const [mappingResult, setMappingResult] = useState<DxfMappingResult | null>(null);
  const [unit, setUnit] = useState<DxfUnit>('m');
  const [snapTolerance, setSnapTolerance] = useState(0.01);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const openDialog = (event: Event) => setFile((event as CustomEvent<File>).detail);
    window.addEventListener('stabileo-open-dxf-dialog', openDialog);
    return () => window.removeEventListener('stabileo-open-dxf-dialog', openDialog);
  }, []);

  useEffect(() => {
    if (!file) {
      setParseResult(null);
      setMappingResult(null);
      setError(null);
      return;
    }

    let active = true;
    const reader = new FileReader();
    reader.onload = () => {
      if (!active) return;
      try {
        setParseResult(parseDxf(reader.result as string));
        setError(null);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : t('dxf.parseError'));
        setParseResult(null);
        setMappingResult(null);
      }
    };
    reader.onerror = () => { if (active) setError(t('dxf.readError')); };
    reader.readAsText(file);
    return () => {
      active = false;
      if (reader.readyState === FileReader.LOADING) reader.abort();
    };
  }, [file]);

  useEffect(() => {
    if (!parseResult) return;
    try {
      setMappingResult(mapDxfToModel(parseResult, { unit, snapTolerance }));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('dxf.mapError'));
      setMappingResult(null);
    }
  }, [parseResult, snapTolerance, unit]);

  const close = () => setFile(null);

  const handleImport = () => {
    if (!mappingResult) return;
    const mapped = mappingResult;

    historyStore.pushState();
    modelStore.clear();
    resultsStore.clear();

    const idMap = new Map<number, number>();
    for (const node of mapped.nodes) {
      idMap.set(node.id, modelStore.addNode(node.x, node.y));
    }

    let materialId = 1;
    if (mapped.materialName) {
      const material = parseMaterialText(mapped.materialName);
      if (material) materialId = modelStore.addMaterial(material);
    }

    let sectionId = 1;
    if (mapped.sectionName) {
      const section = parseSectionText(mapped.sectionName);
      if (section) sectionId = modelStore.addSection(section);
    }

    const elementIds: number[] = [];
    for (const element of mapped.elements) {
      const elementId = modelStore.addElement(idMap.get(element.nodeI)!, idMap.get(element.nodeJ)!, element.type);
      if (materialId !== 1) modelStore.updateElementMaterial(elementId, materialId);
      if (sectionId !== 1) modelStore.updateElementSection(elementId, sectionId);
      elementIds.push(elementId);
    }

    for (const support of mapped.supports) {
      const nodeId = idMap.get(support.nodeId);
      if (nodeId != null) modelStore.addSupport(nodeId, support.type);
    }
    for (const load of mapped.nodalLoads) {
      const nodeId = idMap.get(load.nodeId);
      if (nodeId != null) modelStore.addNodalLoad(nodeId, load.fx, load.fz, load.my);
    }
    for (const load of mapped.distributedLoads) {
      const elementId = elementIds[load.elementIndex];
      if (elementId != null) modelStore.addDistributedLoad(elementId, load.q);
    }
    for (const load of mapped.pointLoads) {
      const elementId = elementIds[load.elementIndex];
      if (elementId != null) modelStore.addPointLoadOnElement(elementId, load.a, load.p);
    }
    for (const hinge of mapped.hinges) {
      const elementId = elementIds[hinge.elementIndex];
      if (elementId != null) modelStore.toggleHinge(elementId, hinge.end);
    }

    uiStore.toast(
      t('dxf.imported').replace('{n}', String(mapped.nodes.length)).replace('{e}', String(mapped.elements.length)),
      'success',
    );
    setTimeout(() => {
      const canvas = document.querySelector('.viewport-container canvas') as HTMLCanvasElement | null;
      if (canvas && modelStore.nodes.size > 0) {
        uiStore.zoomToFit(modelStore.nodes.values(), canvas.width, canvas.height);
      }
    }, 50);
    close();
  };

  if (!file) return null;

  return (
    <div className="dxf-overlay">
      <div className="dxf-backdrop" onClick={close} />
      <div className="dxf-dialog">
        <div className="dxf-header">
          <h2>{t('dxf.title')}</h2>
          <button className="dxf-close" onClick={close}>&#10005;</button>
        </div>

        {error && <div className="dxf-error">{error}</div>}
        <div className="dxf-filename">{file.name}</div>

        <div className="dxf-body">
          <div className="dxf-options">
            <div className="dxf-field">
              <label>{t('dxf.units')}</label>
              <select value={unit} onChange={(event) => setUnit(event.currentTarget.value as DxfUnit)}>
                <option value="m">{t('dxf.meters')}</option>
                <option value="cm">{t('dxf.centimeters')}</option>
                <option value="mm">{t('dxf.millimeters')}</option>
              </select>
            </div>
            <div className="dxf-field">
              <label>{t('dxf.snapTolerance')}</label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                value={snapTolerance}
                onChange={(event) => {
                  const value = Number.parseFloat(event.currentTarget.value);
                  if (Number.isFinite(value) && value > 0) setSnapTolerance(value);
                }}
              />
            </div>
          </div>

          {parseResult && <div className="dxf-preview">
            <h3>{t('dxf.layersDetected')}</h3>
            <div className="dxf-layers">
              {parseResult.layers.map((layer) => {
                const known = KNOWN_LAYERS.has(layer.toUpperCase());
                return <span key={layer} className={`dxf-layer${known ? ' known' : ''}`}>{known ? '\u2713' : '\u2022'} {layer}</span>;
              })}
              {parseResult.layers.length === 0 && <span className="dxf-muted">{t('dxf.noLayers')}</span>}
            </div>

            <h3>{t('dxf.parsedEntities')}</h3>
            <div className="dxf-stats">
              <span>{parseResult.lines.length} {t('dxf.lines')}</span>
              <span>{parseResult.texts.length} {t('dxf.texts')}</span>
              <span>{parseResult.points.length} {t('dxf.points')}</span>
              <span>{parseResult.inserts.length} {t('dxf.blocks')}</span>
              <span>{parseResult.circles.length} {t('dxf.circles')}</span>
            </div>
          </div>}

          {mappingResult && <div className="dxf-preview">
            <h3>{t('dxf.resultModel')}</h3>
            <div className="dxf-stats dxf-stats-main">
              <span><strong>{mappingResult.nodes.length}</strong> {t('dxf.nodes')}</span>
              <span><strong>{mappingResult.elements.length}</strong> {t('dxf.elements')}</span>
              <span><strong>{mappingResult.supports.length}</strong> {t('dxf.supports')}</span>
              <span><strong>{mappingResult.nodalLoads.length + mappingResult.distributedLoads.length + mappingResult.pointLoads.length}</strong> {t('dxf.loads')}</span>
              <span><strong>{mappingResult.hinges.length}</strong> {t('dxf.hinges')}</span>
            </div>
            {mappingResult.sectionName && <div className="dxf-info">{t('dxf.section')}: {mappingResult.sectionName}</div>}
            {mappingResult.materialName && <div className="dxf-info">{t('dxf.material')}: {mappingResult.materialName}</div>}
            {mappingResult.warnings.length > 0 && <>
              <h3>{t('dxf.warnings')}</h3>
              <div className="dxf-warnings">
                {mappingResult.warnings.map((warning, index) => <div className="dxf-warning" key={`${index}-${warning}`}>{warning}</div>)}
              </div>
            </>}
          </div>}
        </div>

        <div className="dxf-footer">
          <button className="btn btn-primary" onClick={handleImport} disabled={!mappingResult || mappingResult.elements.length === 0}>
            {t('dxf.import')}
          </button>
          <button className="btn btn-secondary" onClick={close}>{t('dxf.cancel')}</button>
        </div>
      </div>
    </div>
  );
}
