import { useSyncExternalStore } from 'react';
import { localeExternalStore } from '../../lib/i18n/store.svelte';
import { modelStore, resultsStore, uiStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';
import { ContextHelp } from './ContextHelp';
import { ElementDetails } from './ElementDetails';
import { MemberOffsetEditor } from './MemberOffsetEditor';
import { NodeDetails } from './NodeDetails';
import './PropertyPanel.css';

export function PropertyPanel({ showResults = false }: { showResults?: boolean }) {
  useStoreRevision(modelStore); useStoreRevision(uiStore); useStoreRevision(resultsStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const visibleResults = showResults || resultsStore.results !== null || resultsStore.results3D !== null;
  return <div className="react-property-panel">{uiStore.selectedNodes.size > 0 && <NodeDetails showResults={visibleResults} />}{uiStore.selectedElements.size > 0 && <><ElementDetails showResults={visibleResults} /><MemberOffsetEditor /></>}<ContextHelp /></div>;
}
