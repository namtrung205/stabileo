import { createPortal } from 'react-dom';
import { useEditorPortalTarget } from '../useEditorPortalTarget';
import { StatusBar } from './StatusBar';
import { TabBar } from './TabBar';
import { SelectionPanel } from './SelectionPanel';
import { DemoMenu } from './DemoMenu';
import { MobileResultsPanel } from './MobileResultsPanel';
import { BasicRibbon } from './BasicRibbon';
import { ToolOptionsBarCore } from './ToolOptionsBarCore';
import { FloatingTools } from './FloatingToolsCore';
import { ToolbarExamples } from './ToolbarExamples';
import { ToolbarProject } from './ToolbarProject';
import { ToolbarConfig } from './ToolbarConfig';
import { ToolbarResults } from './ToolbarResults';
import { ToolbarAdvanced } from './ToolbarAdvanced';
import { DataTable } from './DataTable';
import { PropertyPanel } from './PropertyPanel';
import { MemberOffsetEditor } from './MemberOffsetEditor';
import { BasicPanel } from './BasicPanel';
import { MobileToolbar } from './MobileToolbar';

export function EditorChromePortals() {
  const tabTarget = useEditorPortalTarget('.react-tab-bar-slot');
  const statusTarget = useEditorPortalTarget('.app-footer');
  const selectionTarget = useEditorPortalTarget('.react-selection-panel-slot');
  const demoTarget = useEditorPortalTarget('.react-demo-menu-slot');
  const mobileResultsTarget = useEditorPortalTarget('.react-mobile-results-slot');
  const basicRibbonTarget = useEditorPortalTarget('.react-basic-ribbon-slot');
  const toolOptionsTarget = useEditorPortalTarget('.react-tool-options-slot');
  const floatingToolsTarget = useEditorPortalTarget('.react-floating-tools-slot');
  const examplesTarget = useEditorPortalTarget('.react-toolbar-examples-slot');
  const projectTarget = useEditorPortalTarget('.react-toolbar-project-slot');
  const flatProjectTarget = useEditorPortalTarget('.react-toolbar-project-flat-slot');
  const configTarget = useEditorPortalTarget('.react-toolbar-config-slot');
  const flatConfigTarget = useEditorPortalTarget('.react-toolbar-config-flat-slot');
  const inlineConfigTarget = useEditorPortalTarget('.react-toolbar-config-inline-slot');
  const resultsTarget = useEditorPortalTarget('.react-toolbar-results-slot');
  const flatResultsTarget = useEditorPortalTarget('.react-toolbar-results-flat-slot');
  const advancedTarget = useEditorPortalTarget('.react-toolbar-advanced-slot');
  const flatAdvancedTarget = useEditorPortalTarget('.react-toolbar-advanced-flat-slot');
  const basicDataTarget = useEditorPortalTarget('.react-basic-data-table-slot');
  const sidebarDataTarget = useEditorPortalTarget('.react-sidebar-data-table-slot');
  const drawerDataTarget = useEditorPortalTarget('.react-drawer-data-table-slot');
  const propertyTarget = useEditorPortalTarget('.react-property-panel-slot');
  const proOffsetTarget = useEditorPortalTarget('.react-pro-member-offset-slot');
  const basicPanelTarget = useEditorPortalTarget('.react-basic-panel-slot');
  const mobileSidebarToolbarTarget = useEditorPortalTarget('.react-mobile-sidebar-toolbar-slot');
  const mobileDrawerToolbarTarget = useEditorPortalTarget('.react-mobile-drawer-toolbar-slot');
  return <>
    {tabTarget && createPortal(<TabBar />, tabTarget)}
    {statusTarget && createPortal(<StatusBar />, statusTarget)}
    {selectionTarget && createPortal(<SelectionPanel />, selectionTarget)}
    {demoTarget && createPortal(<DemoMenu />, demoTarget)}
    {mobileResultsTarget && createPortal(<MobileResultsPanel />, mobileResultsTarget)}
    {basicRibbonTarget && createPortal(<BasicRibbon />, basicRibbonTarget)}
    {toolOptionsTarget && createPortal(<ToolOptionsBarCore />, toolOptionsTarget)}
    {floatingToolsTarget && createPortal(<FloatingTools />, floatingToolsTarget)}
    {examplesTarget && createPortal(<ToolbarExamples />, examplesTarget)}
    {projectTarget && createPortal(<ToolbarProject />, projectTarget)}
    {flatProjectTarget && createPortal(<ToolbarProject flat />, flatProjectTarget)}
    {configTarget && createPortal(<ToolbarConfig />, configTarget)}
    {flatConfigTarget && createPortal(<ToolbarConfig flat />, flatConfigTarget)}
    {inlineConfigTarget && createPortal(<ToolbarConfig inline />, inlineConfigTarget)}
    {resultsTarget && createPortal(<ToolbarResults />, resultsTarget)}
    {flatResultsTarget && createPortal(<ToolbarResults hideDiagrams flat />, flatResultsTarget)}
    {advancedTarget && createPortal(<ToolbarAdvanced />, advancedTarget)}
    {flatAdvancedTarget && createPortal(<ToolbarAdvanced flat />, flatAdvancedTarget)}
    {basicDataTarget && createPortal(<DataTable syncBasicPanel />, basicDataTarget)}
    {sidebarDataTarget && createPortal(<DataTable />, sidebarDataTarget)}
    {drawerDataTarget && createPortal(<DataTable />, drawerDataTarget)}
    {propertyTarget && createPortal(<PropertyPanel />, propertyTarget)}
    {proOffsetTarget && createPortal(<MemberOffsetEditor />, proOffsetTarget)}
    {basicPanelTarget && createPortal(<BasicPanel />, basicPanelTarget)}
    {mobileSidebarToolbarTarget && createPortal(<MobileToolbar />, mobileSidebarToolbarTarget)}
    {mobileDrawerToolbarTarget && createPortal(<MobileToolbar />, mobileDrawerToolbarTarget)}
  </>;
}
