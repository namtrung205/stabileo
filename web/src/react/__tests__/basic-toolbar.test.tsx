import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FloatingTools } from '../components/FloatingToolsCore';
import { ToolOptionsBarCore } from '../components/ToolOptionsBarCore';

describe('React Basic editor toolbars', () => {
  it('owns the desktop options-bar shell and status contract', () => {
    const html = renderToStaticMarkup(<ToolOptionsBarCore />);
    expect(html).toContain('data-testid="tool-options-bar"');
    expect(html).toContain('data-testid="tool-options"');
    expect(html).toContain('data-testid="model-state"');
    expect(html).toContain('class="tb-selection"');
  });

  it('owns the floating toolbar shell and original tool controls', () => {
    const html = renderToStaticMarkup(<FloatingTools />);
    expect(html).toContain('data-tour="floating-tools"');
    expect(html.match(/class="ft-btn/g)).toHaveLength(6);
    expect(html).toContain('class="ft-close"');
  });
});
