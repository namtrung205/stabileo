import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ToolbarProject } from '../components/ToolbarProject';

describe('React Basic project panel', () => {
  it('preserves file, example, tutorial, export/import/share and picker contracts', () => {
    const html = renderToStaticMarkup(<ToolbarProject flat />);

    expect(html).toContain('data-tour="project-section"');
    expect(html).toContain('data-testid="project-open-file"');
    expect(html).toContain('data-testid="ex-group-2d"');
    expect(html).toContain('data-testid="ex-group-3d"');
    expect(html).toContain('data-testid="demo-menu-toggle"');
    for (const format of ['Excel', 'PDF', 'DXF', 'SVG', 'PNG', 'CSV']) {
      expect(html).toContain(`>${format}</button>`);
    }
  });

  it('keeps the legacy sidebar section collapsed by default', () => {
    const html = renderToStaticMarkup(<ToolbarProject />);
    expect(html).toContain('data-tour="project-section"');
    expect(html).not.toContain('data-testid="ex-group-2d"');
    expect(html).toContain('data-testid="project-open-file"');
  });
});
