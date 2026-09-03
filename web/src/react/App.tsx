import { useEffect, useState } from 'react';
import { parsePublicPath, publicHref } from '../lib/i18n/public-routes';
import { publicI18n } from '../lib/i18n/store.svelte';
import { LegacySvelteApp } from './LegacySvelteApp';
import { PublicI18nProvider } from './i18n/PublicI18n';
import { LandingPage } from './landing/LandingPage';
import { BlogPage } from './blog/BlogPage';
import { ContextMenu } from './components/ContextMenu';
import { KeyboardShortcuts } from './components/KeyboardShortcuts';
import { ViewportOverlays } from './components/ViewportOverlays';
import { HelpOverlay } from './components/HelpOverlay';
import { NodeEditor } from './components/NodeEditor';
import { MaterialEditor } from './components/MaterialEditor';
import { EditorChromePortals } from './components/EditorChromePortals';
import { ElementEditor } from './components/ElementEditor';
import { SectionEditor } from './components/SectionEditor';
import { DespieceInspector } from './components/DespieceInspector';
import { SwitchTo2DDialog } from './components/SwitchTo2DDialog';
import { DxfImportDialog } from './components/DxfImportDialog';
import { CalcReportDialog } from './components/CalcReportDialog';
import { MaterialPresetSelector } from './components/MaterialPresetSelector';
import { uiStore } from '../lib/store';
import { useStoreRevision } from './store/useStoreRevision';

/**
 * React application switchboard.
 *
 * Route-sized React surfaces will replace the compatibility branch here. A
 * route boundary gives every migrated slice a real production context while
 * keeping the still-unported editor fully functional during the transition.
 */
export function App() {
  useStoreRevision(uiStore);
  const [pathname, setPathname] = useState(() => {
    // GitHub Pages sends deep public links through /?route=… from 404.html.
    // Restore that address before choosing the React route.
    const redirectedRoute = new URLSearchParams(window.location.search).get('route');
    if (redirectedRoute) history.replaceState(null, '', redirectedRoute);
    return window.location.pathname;
  });
  const publicRoute = parsePublicPath(pathname);
  const isReactLanding = publicRoute.path === '/';
  const isReactBlog = publicRoute.path === '/blog' || publicRoute.path.startsWith('/blog/');
  const isReactPublic = isReactLanding || isReactBlog;

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const navigate = (path: string) => {
      const href = publicHref(path, publicI18n.locale);
      history.pushState(null, '', href);
      setPathname(window.location.pathname);
    };
    const onNavigate = (event: Event) => navigate((event as CustomEvent<string>).detail);
    const onEnterApp = () => {
      history.pushState(null, '', '/app/basic');
      setPathname(window.location.pathname);
    };

    window.addEventListener('stabileo-navigate', onNavigate);
    window.addEventListener('stabileo-enter-app', onEnterApp);
    return () => {
      window.removeEventListener('stabileo-navigate', onNavigate);
      window.removeEventListener('stabileo-enter-app', onEnterApp);
    };
  }, []);

  if (isReactPublic) {
    return (
      <PublicI18nProvider key={publicRoute.locale ?? 'default'}>
        {isReactLanding ? <LandingPage /> : <BlogPage path={publicRoute.path} />}
      </PublicI18nProvider>
    );
  }

  return <>
    <LegacySvelteApp />
    <ContextMenu />
    <HelpOverlay />
    <NodeEditor />
    <MaterialEditor />
    <ElementEditor />
    <SectionEditor />
    <DespieceInspector />
    <SwitchTo2DDialog />
    <DxfImportDialog />
    <CalcReportDialog />
    <MaterialPresetSelector />
    {uiStore.appMode === 'basico' && <KeyboardShortcuts />}
    <ViewportOverlays />
    <EditorChromePortals />
  </>;
}
