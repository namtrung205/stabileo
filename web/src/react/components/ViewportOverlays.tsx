import { createPortal } from 'react-dom';
import { useEditorPortalTarget } from '../useEditorPortalTarget';
import { ColourScaleLegend } from './ColourScaleLegend';
import { StressPickHint } from './StressPickHint';

/** Mount React-owned overlays in the same positioned viewport node used by the
 * legacy canvases. The observer only bridges the editor shell's mount/remount. */
export function ViewportOverlays() {
  const target = useEditorPortalTarget('.viewport-container');

  return target ? createPortal(<><StressPickHint /><ColourScaleLegend /></>, target) : null;
}
