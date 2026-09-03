import { useEffect, useState, useSyncExternalStore } from 'react';
import { localeExternalStore, t } from '../../lib/i18n/store.svelte';
import { modelStore, uiStore } from '../../lib/store';
import { EDIT_TOOLS } from '../../lib/store/ui.svelte';
import { useStoreRevision } from '../store/useStoreRevision';
import { ElementsTable } from './ElementsTable';
import { LoadsTable } from './LoadsTable';
import { MaterialsTable } from './MaterialsTable';
import { NodesTable } from './NodesTable';
import { SectionsTable } from './SectionsTable';
import { SupportsTable } from './SupportsTable';
import './DataTable.css';

export type DataTab = 'nodes' | 'elements' | 'supports' | 'loads' | 'materials' | 'sections';
const TAB_TOOL: Partial<Record<DataTab, string>> = { nodes: 'node', elements: 'element', supports: 'support', loads: 'load' };

export function DataTable({ initialTab = 'nodes', syncBasicPanel = false }: { initialTab?: DataTab; syncBasicPanel?: boolean }) {
  useStoreRevision(modelStore); useStoreRevision(uiStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const [activeTab, setActiveTab] = useState<DataTab>(initialTab);

  useEffect(() => {
    if (!syncBasicPanel) return;
    const handle = (event: Event) => {
      const tab = (event as CustomEvent<{ activeDataTab?: string }>).detail?.activeDataTab;
      if (tab && ['nodes', 'elements', 'supports', 'loads', 'materials', 'sections'].includes(tab)) setActiveTab(tab as DataTab);
    };
    window.addEventListener('stabileo-basic-panel-state', handle);
    window.dispatchEvent(new Event('stabileo-request-basic-panel-state'));
    return () => window.removeEventListener('stabileo-basic-panel-state', handle);
  }, [syncBasicPanel]);

  function pickTab(tab: DataTab) {
    setActiveTab(tab);
    const tool = TAB_TOOL[tab];
    if (tool) { if (uiStore.appMode === 'basico') uiStore.currentTool = tool as never; }
    else if (EDIT_TOOLS.includes(uiStore.currentTool)) uiStore.currentTool = 'select';
    if (syncBasicPanel) window.dispatchEvent(new CustomEvent('stabileo-open-basic-panel', { detail: { panel: 'data', opts: { dataTab: tab, toggle: false } } }));
  }

  const tabs: Array<[DataTab, string, number]> = [
    ['nodes', 'data.nodes', modelStore.nodes.size], ['elements', 'data.elements', modelStore.elements.size],
    ['supports', 'data.supports', modelStore.supports.size], ['loads', 'data.loads', modelStore.loads.length],
    ['materials', 'data.materials', modelStore.materials.size], ['sections', 'data.sections', modelStore.sections.size],
  ];
  return <div className="data-table react-data-table" onKeyDown={(event) => event.stopPropagation()} role="region">
    <div className="tabs">{tabs.map(([id, label, count]) => <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => pickTab(id)}>{t(label)} ({count})</button>)}</div>
    <div className="table-wrapper">{activeTab === 'nodes' ? <NodesTable /> : activeTab === 'elements' ? <ElementsTable /> : activeTab === 'supports' ? <SupportsTable /> : activeTab === 'loads' ? <LoadsTable /> : activeTab === 'materials' ? <MaterialsTable /> : <SectionsTable />}</div>
  </div>;
}
