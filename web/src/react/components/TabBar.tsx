import { useEffect, useRef, useSyncExternalStore, type MouseEvent } from 'react';
import { t, localeExternalStore } from '../../lib/i18n/store.svelte';
import { modelStore } from '../../lib/store';
import { tabManager } from '../../lib/store/tabs.svelte';
import { useStoreRevision } from '../store/useStoreRevision';
import './TabBar.css';

export function TabBar() {
  useStoreRevision(tabManager);
  useStoreRevision(modelStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      barRef.current?.querySelector<HTMLElement>('.tab.active')?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    });
    return () => cancelAnimationFrame(frame);
  }, [tabManager.activeTabId, tabManager.tabs.length]);

  function handleTabClick(tabId: string, event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.classList.contains('tab-close')) return;
    if (target.tagName === 'INPUT' && !(target as HTMLInputElement).disabled) return;
    tabManager.switchTab(tabId);
  }

  return <div className="tab-bar" ref={barRef} role="tablist">
    {tabManager.tabs.map((tab) => {
      const active = tab.id === tabManager.activeTabId;
      return <div
        className={`tab${active ? ' active' : ''}`}
        onClick={(event) => handleTabClick(tab.id, event)}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') tabManager.switchTab(tab.id); }}
        role="tab"
        tabIndex={0}
        aria-selected={active}
        key={tab.id}
      >
        <input
          className="tab-name"
          type="text"
          value={active ? modelStore.model.name : tab.name}
          onChange={(event) => tabManager.renameTab(tab.id, event.currentTarget.value || t('tabBar.newStructure'))}
          onBlur={(event) => {
            if (!event.currentTarget.value.trim()) tabManager.renameTab(tab.id, t('tabBar.newStructure'));
          }}
          spellCheck={false}
          disabled={!active}
        />
        {tabManager.tabs.length > 1 && <button className="tab-close" onClick={(event) => { event.stopPropagation(); tabManager.closeTab(tab.id); }} title={t('tabBar.closeTab')} aria-label={t('tabBar.closeTab')}>&times;</button>}
      </div>;
    })}
    <button className="tab-add" onClick={() => tabManager.createTab()} title={t('tabBar.newTab')}>+</button>
  </div>;
}
