import { useEffect, useSyncExternalStore } from 'react';
import { t, localeExternalStore } from '../../lib/i18n/store';
import { uiStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';
import './HelpOverlay.css';

const LEFT = [
  ['help.tools', [['V', 'help.select'], ['N', 'help.node'], ['E', 'help.element'], ['S', 'help.support'], ['L', 'help.load'], ['A', 'help.pan']]],
  ['help.editing', [['Ctrl+Z', 'help.undo'], ['Ctrl+Y', 'help.redo'], ['Ctrl+A', 'help.selectAll'], ['Ctrl+C', 'help.copy'], ['Ctrl+X', 'help.cut'], ['Ctrl+V', 'help.paste'], ['Del', 'help.delete']]],
] as const;

export function HelpOverlay() {
  useStoreRevision(uiStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && uiStore.showHelp) uiStore.showHelp = false;
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!uiStore.showHelp) return null;
  const diagramShortcuts = uiStore.analysisMode !== '3d'
    ? [['2', 'help.diagramShear'], ['3', 'help.diagramMoment']]
    : [['2', 'help.diagramShearZ'], ['3', 'help.diagramMomentY'], ['4', 'help.diagramShearY'], ['5', 'help.diagramMomentZ'], ['6', 'help.diagramTorsion']];
  const viewShortcuts = [['G', 'help.toggleGrid'], ['H', 'help.toggleAxes'], ['F', 'help.fitModel'], ...(uiStore.analysisMode !== '3d' ? [['+', 'help.zoomIn'], ['-', 'help.zoomOut']] : []), ['Esc', 'help.cancelDeselect']];
  const diagrams = [['0', 'help.diagramNone'], ['1', 'help.diagramDeformed'], ...diagramShortcuts, ['7', 'help.diagramAxial'], ['8', 'help.diagramAxialColors'], ['9', 'help.diagramColorMap']];
  const files = [['Ctrl+S', 'help.saveTab'], ['Ctrl+Shift+S', 'help.saveSession'], ['Ctrl+O', 'help.open'], ['Enter', 'help.solve']];
  const renderShortcuts = (items: readonly (readonly string[])[]) => items.map(([key, label]) => <div className="shortcut" key={key}><kbd>{key}</kbd> {t(label)}</div>);

  return <div className="help-overlay" role="dialog" aria-label={t('help.title')}>
    <div className="help-backdrop" onClick={() => { uiStore.showHelp = false; }} />
    <div className="help-content">
      <div className="help-header"><h2>{t('help.title')}</h2><button className="help-close" onClick={() => { uiStore.showHelp = false; }}>✕</button></div>
      <div className="help-columns">
        <div className="help-col">{LEFT.map(([heading, items]) => <div key={heading}><h3>{t(heading)}</h3>{renderShortcuts(items)}</div>)}</div>
        <div className="help-col"><h3>{t('help.view')}</h3>{renderShortcuts(viewShortcuts)}<h3>{t('help.diagrams')}</h3>{renderShortcuts(diagrams)}<h3>{t('help.fileCalc')}</h3>{renderShortcuts(files)}</div>
      </div>
      <p className="help-hint">{t('help.closeHint')}</p>
    </div>
  </div>;
}
