import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { modelStore } from '../../lib/store';
import { DataTable } from '../components/DataTable';

describe('React model data tables', () => {
  afterEach(() => modelStore.clear());

  it('owns all six model-data tabs and renders the active table', () => {
    const html = renderToStaticMarkup(<DataTable />);
    for (const key of ['data.nodes', 'data.elements', 'data.supports', 'data.loads', 'data.materials', 'data.sections']) {
      expect(html).not.toContain(`>${key}<`);
    }
    expect(html).toContain('react-data-table');
    expect(html).toContain('react-nodes-table');
    expect(html.match(/<button/g)?.length).toBeGreaterThanOrEqual(7);
  });

  it('publishes model CRUD mutations to React subscribers', () => {
    let revisions = 0;
    const unsubscribe = modelStore.reactSubscribe(() => revisions++);
    const id = modelStore.addNode(1, 2);
    modelStore.updateNode(id, 3, 4);
    modelStore.removeNode(id);
    unsubscribe();
    expect(revisions).toBeGreaterThanOrEqual(3);
  });
});
