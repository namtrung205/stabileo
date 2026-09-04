import { useEffect, useRef, useSyncExternalStore } from 'react';
import { saveProject, loadFile } from '../../lib/store/file';
import { uiStore } from '../../lib/store';
import { localeExternalStore, t } from '../../lib/i18n/store.svelte';
import './ProProjectFileActions.css';

export function ProProjectFileActions({
  variant = 'bar',
  shortcuts = false,
}: {
  variant?: 'bar' | 'mobile';
  shortcuts?: boolean;
}) {
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!shortcuts) return;
    const keydown = (event: KeyboardEvent) => {
      const key = event.key.toUpperCase();
      if ((event.ctrlKey || event.metaKey) && key === 'S' && !event.shiftKey) {
        event.preventDefault();
        saveProject();
      } else if ((event.ctrlKey || event.metaKey) && key === 'O') {
        event.preventDefault();
        fileInput.current?.click();
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [shortcuts]);

  const handleLoadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const result = await loadFile(file);
      if (result.type === 'session') {
        uiStore.toast(t('project.sessionRestored').replace('{n}', String(result.count)), 'success');
      }
    } catch (error) {
      alert((error as Error)?.message || t('project.loadError'));
    }
    input.value = '';
  };

  return <>
    <button className={`pfa ${variant}`} data-testid="pro-project-open"
      onClick={() => fileInput.current?.click()} title={t('project.openTooltip')}>
      {t('project.open')}
    </button>
    <button className={`pfa ${variant}`} data-testid="pro-project-save"
      onClick={() => saveProject()} title={t('project.saveTabTooltip')}>
      {t('project.saveTab')}
    </button>
    <input ref={fileInput} data-testid="project-open-file" type="file" accept=".ded,.json"
      hidden onChange={handleLoadFile} />
  </>;
}
