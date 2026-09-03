import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BasicRibbon } from '../components/BasicRibbon';

describe('React Basic ribbon', () => {
  it('preserves the editor command and test-id contract', () => {
    const html = renderToStaticMarkup(<BasicRibbon />);

    for (const id of [
      'ribbon', 'rb-quick', 'hdr-project', 'rb-save',
      'rb-cmd-select', 'rb-cmd-dim', 'rb-cmd-data',
      'rb-cmd-node', 'rb-cmd-element', 'rb-cmd-support', 'rb-cmd-load',
      'rb-cmd-materials', 'rb-cmd-sections', 'rb-cmd-solve',
      'rb-cmd-advanced', 'rb-cmd-none', 'rb-cmd-deformed',
      'rb-cmd-axial', 'rb-cmd-momentY', 'rb-cmd-shearZ', 'rb-cmd-stress',
    ]) {
      expect(html, id).toContain(`data-testid="${id}"`);
    }
  });

  it('keeps out-of-plane result commands absent in the initial 2D mode', () => {
    const html = renderToStaticMarkup(<BasicRibbon />);
    expect(html).not.toContain('data-testid="rb-cmd-moment"');
    expect(html).not.toContain('data-testid="rb-cmd-shear"');
    expect(html).not.toContain('data-testid="rb-cmd-torsion"');
  });
});
