import { useSyncExternalStore } from 'react';
import { localeExternalStore, t } from '../../lib/i18n/store';
import { uiStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';
import { AiDrawer } from './AiDrawer';
import { BasicMobileShell } from './BasicMobileShell';
import { BasicPanel } from './BasicPanel';
import { FloatingTools } from './FloatingToolsCore';
import { KinematicPanel } from './KinematicPanel';
import { MobileResultsPanel } from './MobileResultsPanel';
import { SectionStressPanel } from './SectionStressPanel';
import { Viewport2D } from './Viewport2D';
import { Viewport3D } from './Viewport3D';
import { WhatIfPanel } from './WhatIfPanel';
import './BasicWorkspace.css';

function Simplified2DBanner() {
  const stats = uiStore.simplified2DStats;
  if (!uiStore.simplified2DMode) return null;

  const omitted = (stats?.droppedCrossing ?? 0) + (stats?.droppedElsewhere ?? 0);
  return <div className="simplified-banner">
    <span>
      {stats?.offset !== undefined && stats.plane
        ? `${t('switch2d.sliceBanner')} — ${stats.plane === 'xy' ? 'Z' : stats.plane === 'xz' ? 'Y' : 'X'} = ${stats.offset} m`
        : t('app.simplified2d.banner')}
    </span>
    {stats && <span className="simplified-stats">
      {stats.mergedNodes > 0 ? `${stats.mergedNodes} ${t('app.simplified2d.merged')}` : ''}
      {stats.removedElements > 0 ? ` · ${stats.removedElements} ${t('app.simplified2d.removed')}` : ''}
      {stats.duplicateElements > 0 ? ` · ${stats.duplicateElements} ${t('app.simplified2d.duplicates')}` : ''}
      {omitted > 0 ? ` · ${omitted} ${t('switch2d.leftBehind')}` : ''}
      {(stats.droppedLoads ?? 0) > 0 && <span data-testid="s2d-dropped-loads" data-count={stats.droppedLoads}>
        {' · '}{stats.droppedLoads} {t('switch2d.loadsLeftBehind')}
      </span>}
    </span>}
  </div>;
}

/** Native React composition for the complete Basic editing workspace. */
export function BasicWorkspace() {
  useStoreRevision(uiStore);
  useSyncExternalStore(
    localeExternalStore.subscribe,
    localeExternalStore.getSnapshot,
    localeExternalStore.getSnapshot,
  );

  if (uiStore.appMode !== 'basico') return null;
  const mobile = uiStore.isMobile;

  return <div className="react-basic-workspace" data-testid="react-basic-workspace">
    <div className="main-area">
      <main className="viewport-container">
        {uiStore.analysisMode === '2d' ? <Viewport2D /> : <Viewport3D />}
        <Simplified2DBanner />
        {mobile && <FloatingTools />}
        {mobile && <>
          <WhatIfPanel />
          <SectionStressPanel />
          <KinematicPanel />
        </>}
        <MobileResultsPanel />
      </main>
    </div>
    {!mobile && <BasicPanel />}
    <AiDrawer />
    <BasicMobileShell />
  </div>;
}
