import { useState, useSyncExternalStore } from 'react';
import { t, localeExternalStore } from '../../lib/i18n/store.svelte';
import { DEMOS, startDemo, type DemoGroup } from '../../lib/tour/demos';
import './DemoMenu.css';

const GROUPS: Array<{ id: DemoGroup; titleKey: string }> = [
  { id: 'basics', titleKey: 'demo.menu.basics' },
  { id: 'advanced', titleKey: 'demo.menu.advanced' },
];

export function DemoMenu() {
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const [open, setOpen] = useState(false);

  function run(id: string) {
    setOpen(false);
    window.setTimeout(() => startDemo(id), 60);
  }

  return <div className="dm">
    <button className="dm-toggle" onClick={() => setOpen((value) => !value)} data-testid="demo-menu-toggle">
      <span>{open ? '▾' : '▸'} {t('demo.menu.title')}</span><span className="dm-count">{DEMOS.length}</span>
    </button>
    {open && <>
      <p className="dm-sub">{t('demo.menu.subtitle')}</p>
      {GROUPS.map((group) => {
        const items = DEMOS.filter((demo) => demo.group === group.id);
        if (!items.length) return null;
        return <div key={group.id}><div className="dm-group">{t(group.titleKey)}</div><div className="dm-list">{items.map((demo) => <button className="dm-item" onClick={() => run(demo.id)} data-testid={`demo-${demo.id}`} key={demo.id}>
          <span className="dm-top"><span className="dm-name">{t(demo.titleKey)}</span><span className="dm-secs">{demo.seconds}{t('demo.menu.seconds')}</span></span>
          <span className="dm-desc">{t(demo.descKey)}</span>
        </button>)}</div></div>;
      })}
    </>}
  </div>;
}
