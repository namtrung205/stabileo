import { useEffect } from 'react';
import {
  basicPanelStore,
  handleBasicPanelRequest,
  openBasicPanel,
} from '../../lib/store/basic-panel';
import { dsmStepsStore, uiStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';

/**
 * Owns the transitional window-event seam around the native React Basic panel.
 * New React callers use basicPanelStore directly; tours and deep links can keep
 * their framework-neutral event contract until the outer editor shell moves.
 */
export function BasicPanelController() {
  useStoreRevision(uiStore);
  useStoreRevision(dsmStepsStore);
  useEffect(() => {
    const openPanel = (event: Event) => {
      const panel = (event as CustomEvent<unknown>).detail;
      if (typeof panel === 'string') {
        handleBasicPanelRequest({ panel, opts: { toggle: false } });
      }
    };
    const openBasic = (event: Event) => handleBasicPanelRequest((event as CustomEvent<unknown>).detail);
    const sendState = () => window.dispatchEvent(new CustomEvent('stabileo-basic-panel-state', { detail: basicPanelStore.getSnapshot() }));
    window.addEventListener('stabileo-open-panel', openPanel);
    window.addEventListener('stabileo-open-basic-panel', openBasic);
    window.addEventListener('stabileo-request-basic-panel-state', sendState);
    return () => {
      window.removeEventListener('stabileo-open-panel', openPanel);
      window.removeEventListener('stabileo-open-basic-panel', openBasic);
      window.removeEventListener('stabileo-request-basic-panel-state', sendState);
    };
  }, []);

  useEffect(() => {
    if (dsmStepsStore.isOpen && uiStore.appMode === 'basico' && !uiStore.isMobile) {
      openBasicPanel('data', { toggle: false });
    }
  }, [dsmStepsStore.isOpen, uiStore.appMode, uiStore.isMobile]);

  return null;
}
