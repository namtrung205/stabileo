import { createPortal } from 'react-dom';
import { useEditorPortalTarget } from '../useEditorPortalTarget';
import { StatusBar } from './StatusBar';
import { TabBar } from './TabBar';
import { SelectionPanel } from './SelectionPanel';
import { DemoMenu } from './DemoMenu';

export function EditorChromePortals() {
  const tabTarget = useEditorPortalTarget('.react-tab-bar-slot');
  const statusTarget = useEditorPortalTarget('.app-footer');
  const selectionTarget = useEditorPortalTarget('.react-selection-panel-slot');
  const demoTarget = useEditorPortalTarget('.react-demo-menu-slot');
  return <>
    {tabTarget && createPortal(<TabBar />, tabTarget)}
    {statusTarget && createPortal(<StatusBar />, statusTarget)}
    {selectionTarget && createPortal(<SelectionPanel />, selectionTarget)}
    {demoTarget && createPortal(<DemoMenu />, demoTarget)}
  </>;
}
