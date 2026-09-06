import { useRef, useSyncExternalStore } from 'react';
import { t, localeExternalStore } from '../../lib/i18n/store';
import { uiStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';
import { Icon } from './Icon';
import { PointerModeButton } from './PointerModeButton';
import './ViewportControls.css';

type ViewportControlsProps = {
  mode: '2d' | '3d';
  top: number;
  onFit(): void;
  onView?(view: 'top' | 'front' | 'side'): void;
  onToggleCamera?(): void;
};

export function ViewportControls({ mode, top, onFit, onView, onToggleCamera }: ViewportControlsProps) {
  useStoreRevision(uiStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const renderModeBeforeSections = useRef<'wireframe' | 'solid'>('wireframe');

  if (mode === '2d') {
    return <div className="viewport-controls" style={{ top }}>
      <PointerModeButton />
      <button onClick={onFit} title={t('viewport.zoomToFit')} aria-label={t('viewport.zoomToFit')}>
        <Icon name="fit" size={17} />
      </button>
    </div>;
  }

  const perspective = uiStore.cameraMode3D === 'perspective';
  const sections = uiStore.renderMode3D === 'sections';
  function toggleSections() {
    if (sections) uiStore.renderMode3D = renderModeBeforeSections.current;
    else {
      renderModeBeforeSections.current = uiStore.renderMode3D === 'solid' ? 'solid' : 'wireframe';
      uiStore.renderMode3D = 'sections';
    }
  }

  return <div className="camera-controls" data-tour="camera-controls" style={{ top }}>
    <PointerModeButton />
    <button onClick={onFit} title={t('viewport3d.zoomToFit')} aria-label={t('viewport3d.zoomToFit')}><Icon name="fit" size={17} /></button>
    <button onClick={() => onView?.('top')} title={t('viewport3d.topView')}>⊤</button>
    <button onClick={() => onView?.('front')} title={t('viewport3d.frontView')}>⊡</button>
    <button onClick={() => onView?.('side')} title={t('viewport3d.sideView')}>⊟</button>
    <button onClick={onToggleCamera} title={perspective ? t('viewport3d.switchToOrtho') : t('viewport3d.switchToPersp')}>{perspective ? 'P' : 'O'}</button>
    <button onClick={() => { uiStore.clippingEnabled = !uiStore.clippingEnabled; }} title={uiStore.clippingEnabled ? t('viewport3d.disableClipping') : t('viewport3d.enableClipping')} className={uiStore.clippingEnabled ? 'active-cam' : ''}>✂</button>
    <button onClick={() => { uiStore.measureMode = !uiStore.measureMode; }} title={uiStore.measureMode ? t('viewport3d.disableMeasure') : t('viewport3d.enableMeasure')} className={uiStore.measureMode ? 'active-cam' : ''}>📏</button>
    <button onClick={toggleSections} className={sections ? 'active-cam' : ''} title={sections ? t('config.wireframe') : t('config.sections')}>{sections ? '◫' : '⬡'}</button>
  </div>;
}
