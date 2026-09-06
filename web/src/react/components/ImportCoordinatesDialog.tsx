import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { localeExternalStore, t } from '../../lib/i18n/store';
import { modelStore, resultsStore, uiStore } from '../../lib/store';
import './ImportCoordinatesDialog.css';

export function ImportCoordinatesDialog() {
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener('stabileo-import-coords', show);
    return () => window.removeEventListener('stabileo-import-coords', show);
  }, []);

  useEffect(() => {
    if (open) requestAnimationFrame(() => dialogRef.current?.focus());
  }, [open]);

  const close = () => setOpen(false);
  const apply = () => {
    const lines = text.trim().split('\n').filter((line) => line.trim());
    let created = 0;
    for (const line of lines) {
      const parts = line.trim().split(/[,;\t\s]+/).map(Number);
      if (parts.length >= 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
        modelStore.addNode(parts[0], parts[1]);
        created += 1;
      }
    }
    if (created > 0) {
      uiStore.toast(t('app.nodesImported').replace('{n}', String(created)), 'success');
      resultsStore.clear();
    } else {
      uiStore.toast(t('app.noValidCoords'), 'error');
    }
    setOpen(false);
    setText('');
  };

  if (!open) return null;
  return <div
    ref={dialogRef}
    className="react-import-coordinates help-overlay"
    role="dialog"
    aria-modal="true"
    aria-label={t('app.importCoordinates')}
    tabIndex={-1}
    onKeyDown={(event) => { if (event.key === 'Escape') close(); }}
  >
    <button type="button" className="help-backdrop" onClick={close} aria-label={t('app.cancel')} />
    <div className="help-content">
      <div className="help-header">
        <h2>{t('app.importCoordinates')}</h2>
        <button type="button" className="help-close" onClick={close} aria-label={t('app.cancel')}>✕</button>
      </div>
      <p className="import-description">{t('app.importCoordDesc')}</p>
      <textarea
        className="import-textarea"
        placeholder={'0, 0\n5, 0\n10, 0\n5, 3'}
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={10}
      />
      <div className="import-actions">
        <button type="button" className="btn btn-primary" onClick={apply}>{t('app.import')}</button>
        <button type="button" className="btn btn-secondary" onClick={close}>{t('app.cancel')}</button>
      </div>
    </div>
  </div>;
}
