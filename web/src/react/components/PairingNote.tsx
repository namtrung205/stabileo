import { useSyncExternalStore } from 'react';
import { commercialGradesFor, gradeById, isUnusualPairing } from '../../lib/data/structural-grades';
import { localeExternalStore, t } from '../../lib/i18n/store.svelte';
import './PairingNote.css';

export function PairingNote({ family, gradeId }: { family?: string; gradeId?: string }) {
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const unusual = family ? isUnusualPairing(family, gradeId) : null;
  const expected = family ? commercialGradesFor(family) : [];
  const chosen = gradeId ? gradeById(gradeId) : undefined;
  if (unusual !== true || !expected.length) return null;
  return <div className="pn" role="note"><span className="pn-icon" aria-hidden="true">ⓘ</span><div className="pn-body">
    <p className="pn-text">{t('pairing.unusual').replace('{family}', family ?? '').replace('{grade}', chosen?.designation ?? '')}</p>
    <ul className="pn-list">{expected.map((item) => { const grade = gradeById(item.gradeId); return grade ? <li key={`${item.gradeId}-${item.sourceKey}`}><strong>{grade.designation}</strong><span className="pn-src">{t(item.sourceKey)}</span></li> : null; })}</ul>
    <p className="pn-ok">{t('pairing.stillValid')}</p>
  </div></div>;
}
