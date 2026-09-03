import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Icon, type IconName } from '../components/Icon';

const NAMES: IconName[] = [
  'select', 'pan', 'view2d', 'view3d', 'node', 'element', 'material',
  'section', 'support', 'load', 'solve', 'advanced', 'data', 'settings',
  'save', 'undo', 'redo', 'none', 'deformed', 'axial', 'shear',
  'shearZ', 'shearY', 'moment', 'momentY', 'momentZ', 'torsion',
  'constraint', 'shell', 'fit', 'stress', 'examples', 'project',
];

describe('React engineering icon set', () => {
  it('renders every icon on the original 24px currentColor grid', () => {
    for (const name of NAMES) {
      const html = renderToStaticMarkup(<Icon name={name} />);
      expect(html, name).toContain('viewBox="0 0 24 24"');
      expect(html, name).toContain('stroke="currentColor"');
      expect(html, name).toContain('stroke-width="1.6"');
      expect(html, name).not.toContain('<svg></svg>');
    }
  });

  it('keeps size and rotation behavior used by the result ribbon', () => {
    const html = renderToStaticMarkup(<Icon name="momentY" size={17} rotate={90} />);
    expect(html).toContain('width="17"');
    expect(html).toContain('height="17"');
    expect(html).toContain('transform:rotate(90deg)');
  });
});
