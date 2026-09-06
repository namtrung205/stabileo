import { useState, useSyncExternalStore } from 'react';
import { localeExternalStore, t } from '../../lib/i18n/store';
import { modelStore, resultsStore, uiStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';
import './ToolbarExamples.css';

type Example = { id: string; nameKey: string; descKey: string };

const EXAMPLES_2D: Example[] = [
  { id: 'simply-supported', nameKey: 'ex.simply-supported', descKey: 'ex.simply-supported.desc' },
  { id: 'cantilever', nameKey: 'ex.cantilever', descKey: 'ex.cantilever.desc' },
  { id: 'cantilever-point', nameKey: 'ex.cantilever-point', descKey: 'ex.cantilever-point.desc' },
  { id: 'point-loads', nameKey: 'ex.point-loads', descKey: 'ex.point-loads.desc' },
  { id: 'gerber-beam', nameKey: 'ex.gerber-beam', descKey: 'ex.gerber-beam.desc' },
  { id: 'continuous-beam', nameKey: 'ex.continuous-beam', descKey: 'ex.continuous-beam.desc' },
  { id: 'spring-support', nameKey: 'ex.spring-support', descKey: 'ex.spring-support.desc' },
  { id: 'settlement', nameKey: 'ex.settlement', descKey: 'ex.settlement.desc' },
  { id: 'thermal', nameKey: 'ex.thermal', descKey: 'ex.thermal.desc' },
  { id: 'truss', nameKey: 'ex.truss', descKey: 'ex.truss.desc' },
  { id: 'warren-truss', nameKey: 'ex.warren-truss', descKey: 'ex.warren-truss.desc' },
  { id: 'howe-truss', nameKey: 'ex.howe-truss', descKey: 'ex.howe-truss.desc' },
  { id: 'three-hinge-arch', nameKey: 'ex.three-hinge-arch', descKey: 'ex.three-hinge-arch.desc' },
  { id: 'portal-frame', nameKey: 'ex.portal-frame', descKey: 'ex.portal-frame.desc' },
  { id: 'two-story-frame', nameKey: 'ex.two-story-frame', descKey: 'ex.two-story-frame.desc' },
  { id: 'bridge-moving-load', nameKey: 'ex.bridge-moving-load', descKey: 'ex.bridge-moving-load.desc' },
  { id: 'frame-cirsoc-dl', nameKey: 'ex.frame-cirsoc-dl', descKey: 'ex.frame-cirsoc-dl.desc' },
  { id: 'building-3story-dlw', nameKey: 'ex.building-3story-dlw', descKey: 'ex.building-3story-dlw.desc' },
  { id: 'frame-seismic', nameKey: 'ex.frame-seismic', descKey: 'ex.frame-seismic.desc' },
];

const EXAMPLES_3D: Example[] = [
  { id: '3d-cantilever-load', nameKey: 'ex.3d-cantilever-load', descKey: 'ex.3d-cantilever-load.desc' },
  { id: '3d-torsion-beam', nameKey: 'ex.3d-torsion-beam', descKey: 'ex.3d-torsion-beam.desc' },
  { id: 'hinged-arch-3d', nameKey: 'ex.hingedArch3D', descKey: 'ex.hingedArch3D.desc' },
  { id: '3d-portal-frame', nameKey: 'ex.3d-portal-frame', descKey: 'ex.3d-portal-frame.desc' },
  { id: 'grid-beams', nameKey: 'ex.gridBeams', descKey: 'ex.gridBeams.desc' },
  { id: '3d-space-truss', nameKey: 'ex.3d-space-truss', descKey: 'ex.3d-space-truss.desc' },
  { id: 'space-frame', nameKey: 'ex.spaceFrame3D', descKey: 'ex.spaceFrame3D.desc' },
  { id: 'tower-3d-2', nameKey: 'ex.tower3D_2', descKey: 'ex.tower3D_2.desc' },
  { id: 'tower-3d-4', nameKey: 'ex.tower3D_4', descKey: 'ex.tower3D_4.desc' },
  { id: '3d-nave-industrial', nameKey: 'ex.3d-nave-industrial', descKey: 'ex.3d-nave-industrial.desc' },
];

const EXAMPLES_PRO: Example[] = [
  { id: '3d-building', nameKey: 'ex.3d-building', descKey: 'ex.3d-building.desc' },
  { id: 'pro-edificio-7p', nameKey: 'ex.pro-edificio-7p', descKey: 'ex.pro-edificio-7p.desc' },
  { id: 'rc-qa-diagnostic', nameKey: 'ex.rc-qa-diagnostic', descKey: 'ex.rc-qa-diagnostic.desc' },
  { id: 'rc-qa-diagnostic-shells', nameKey: 'ex.rc-qa-diagnostic-shells', descKey: 'ex.rc-qa-diagnostic-shells.desc' },
  { id: 'cad-arch-structure-dxf', nameKey: 'ex.cad-arch-structure-dxf', descKey: 'ex.cad-arch-structure-dxf.desc' },
  { id: 'cad-arch-only-dxf', nameKey: 'ex.cad-arch-only-dxf', descKey: 'ex.cad-arch-only-dxf.desc' },
  { id: '3d-nave-industrial', nameKey: 'ex.3d-nave-industrial', descKey: 'ex.3d-nave-industrial.desc' },
  { id: 'cable-stayed-bridge-small', nameKey: 'ex.cableStayedBridge3D', descKey: 'ex.cableStayedBridge3D.desc' },
  { id: 'stadium-canopy', nameKey: 'ex.stadiumCanopy3D', descKey: 'ex.stadiumCanopy3D.desc' },
  { id: 'space-frame', nameKey: 'ex.spaceFrame3D', descKey: 'ex.spaceFrame3D.desc' },
  { id: 'tower-3d-4', nameKey: 'ex.tower3D_4', descKey: 'ex.tower3D_4.desc' },
  { id: 'grid-beams', nameKey: 'ex.gridBeams', descKey: 'ex.gridBeams.desc' },
  { id: '3d-space-truss', nameKey: 'ex.3d-space-truss', descKey: 'ex.3d-space-truss.desc' },
  { id: '3d-portal-frame', nameKey: 'ex.3d-portal-frame', descKey: 'ex.3d-portal-frame.desc' },
  { id: 'hinged-arch-3d', nameKey: 'ex.hingedArch3D', descKey: 'ex.hingedArch3D.desc' },
  { id: 'building-3story-dlw', nameKey: 'ex.building-3story-dlw', descKey: 'ex.building-3story-dlw.desc' },
  { id: 'frame-seismic', nameKey: 'ex.frame-seismic', descKey: 'ex.frame-seismic.desc' },
];

export function ToolbarExamples({ flat: _flat = false }: { flat?: boolean }) {
  useStoreRevision(uiStore);
  useStoreRevision(modelStore);
  useStoreRevision(resultsStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const [show2D, setShow2D] = useState(false);
  const [show3D, setShow3D] = useState(false);

  async function loadExample(example: Example, to3D: boolean) {
    const mode = to3D ? '3d' : '2d';
    if (uiStore.analysisMode !== mode) uiStore.analysisMode = mode;
    await modelStore.loadExample(example.id);
    resultsStore.clear();
    resultsStore.clear3D();
    if (uiStore.isMobile) uiStore.leftDrawerOpen = false;
    setTimeout(() => window.dispatchEvent(new Event('stabileo-zoom-to-fit')), 50);
  }

  function group(titleKey: string, items: Example[], to3D: boolean, open: boolean, toggle: () => void) {
    return <div className="toolbar-section">
      <button className="section-toggle" onClick={toggle} data-testid={`ex-group-${to3D ? '3d' : '2d'}`}>
        <span>{open ? '▾' : '▸'} {t(titleKey)}</span>
        <span className="ex-count">{items.length}</span>
      </button>
      {open && <div className="examples-list">
        {items.map((example) => <button className="example-item" onClick={() => void loadExample(example, to3D)} key={example.id}>
          <span className="example-name">{t(example.nameKey)}</span>
          <span className="example-desc">{t(example.descKey)}</span>
        </button>)}
      </div>}
    </div>;
  }

  return <div data-tour="examples-section" className="ex-groups react-toolbar-examples">
    {uiStore.analysisMode === 'pro'
      ? group('examples.titlePro', EXAMPLES_PRO, false, show2D, () => setShow2D((value) => !value))
      : <>
          {group('examples.title2d', EXAMPLES_2D, false, show2D, () => setShow2D((value) => !value))}
          {group('examples.title3d', EXAMPLES_3D, true, show3D, () => setShow3D((value) => !value))}
        </>}
  </div>;
}
