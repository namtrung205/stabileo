import { useEffect, useState, useSyncExternalStore } from 'react';
import { localeExternalStore, t } from '../../lib/i18n/store';
import { modelStore, uiStore } from '../../lib/store';
import { EDIT_TOOLS } from '../../lib/store/ui';
import { basicPanelStore, openBasicPanel } from '../../lib/store/basic-panel';
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
  const panelState = useSyncExternalStore(
    basicPanelStore.subscribe,
    basicPanelStore.getSnapshot,
    basicPanelStore.getSnapshot,
  );

  useEffect(() => {
    if (!syncBasicPanel) return;
    setActiveTab(panelState.activeDataTab);
  }, [syncBasicPanel, panelState.activeDataTab]);

  function pickTab(tab: DataTab) {
    setActiveTab(tab);
    const tool = TAB_TOOL[tab];
    if (tool) { if (uiStore.appMode === 'basico') uiStore.currentTool = tool as never; }
    else if (EDIT_TOOLS.includes(uiStore.currentTool)) uiStore.currentTool = 'select';
    if (syncBasicPanel) openBasicPanel('data', { dataTab: tab, toggle: false });
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
