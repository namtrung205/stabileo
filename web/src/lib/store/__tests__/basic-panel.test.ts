import { afterEach, describe, expect, it } from 'vitest';
import { resultsStore } from '../results';
import { uiStore } from '../ui';
import {
  basicPanelStore,
  closeBasicPanel,
  handleBasicPanelRequest,
  openBasicPanel,
} from '../basic-panel';

describe('Basic panel store', () => {
  afterEach(() => {
    closeBasicPanel();
    uiStore.selectMode = 'elements';
    resultsStore.stressQuery = null;
    resultsStore.diagramType = 'none';
  });

  it('keeps the selected model tab and clears an incompatible result diagram', () => {
    resultsStore.diagramType = 'moment';
    openBasicPanel('data', { dataTab: 'materials', toggle: false });
    expect(basicPanelStore.getSnapshot()).toEqual({ activePanel: 'data', activeDataTab: 'materials' });
    expect(resultsStore.diagramType).toBe('none');

    openBasicPanel('settings', { toggle: false });
    expect(basicPanelStore.getSnapshot().activeDataTab).toBe('materials');
  });

  it('implements toggle versus explicit-open semantics', () => {
    openBasicPanel('results');
    expect(basicPanelStore.getSnapshot().activePanel).toBe('results');
    openBasicPanel('results');
    expect(basicPanelStore.getSnapshot().activePanel).toBeNull();
    openBasicPanel('results', { toggle: false });
    openBasicPanel('results', { toggle: false });
    expect(basicPanelStore.getSnapshot().activePanel).toBe('results');
  });

  it('closes through the event contract and disarms section-stress picking', () => {
    openBasicPanel('advanced', { toggle: false });
    uiStore.selectMode = 'stress';
    resultsStore.stressQuery = { elementId: 1, t: 0.5, worldX: 0, worldY: 0, worldZ: 0 };
    handleBasicPanelRequest({ panel: null });
    expect(basicPanelStore.getSnapshot().activePanel).toBeNull();
    expect(uiStore.selectMode).toBe('elements');
    expect(resultsStore.stressQuery).toBeNull();
  });
});
