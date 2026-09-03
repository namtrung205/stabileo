import { useState, useSyncExternalStore } from 'react';
import { PROJECTION_COLLAPSE_ERROR } from '../../lib/geometry/plane-projection';
import { localeExternalStore, t } from '../../lib/i18n/store.svelte';
import { modelStore, uiStore } from '../../lib/store';
import {
  collapsedByPlane,
  cutsOn,
  eraseAndSwitch,
  projectOnto,
  sliceAt,
  type DrawPlane,
} from '../../lib/store/switch-2d';
import { useStoreRevision } from '../store/useStoreRevision';
import './SwitchTo2DDialog.css';

type Mode = 'project' | 'slice';

const PLANES: Array<{ id: DrawPlane; label: string; descKey: string }> = [
  { id: 'xz', label: 'XZ', descKey: 'toolbar.planeModal.xz' },
  { id: 'yz', label: 'YZ', descKey: 'toolbar.planeModal.yz' },
  { id: 'xy', label: 'XY', descKey: 'toolbar.planeModal.xy' },
];

const fmt = (value: number) => (
  Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, '')
);

/** React owner for the destructive 3D-to-2D decision flow. */
export function SwitchTo2DDialog() {
  useStoreRevision(uiStore);
  useStoreRevision(modelStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);

  const [plane, setPlane] = useState<DrawPlane>('xz');
  const [mode, setMode] = useState<Mode>('slice');
  const [offsetText, setOffsetText] = useState('');
  const [confirmErase, setConfirmErase] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = uiStore.switchTo2DPrompt;
  const collapsed = open ? collapsedByPlane() : { xy: 0, xz: 0, yz: 0 };
  const cuts = open ? cutsOn(plane) : [];
  const normal = plane === 'xy' ? 'Z' : plane === 'xz' ? 'Y' : 'X';
  const offset = offsetText.trim() === '' ? null : Number(offsetText);
  const offsetValid = offset !== null && Number.isFinite(offset);
  const matching = offsetValid
    ? cuts.find((cut) => Math.abs(cut.value - offset) < 1e-3) ?? null
    : null;
  const totalLoads = modelStore.loads.length;

  const close = () => {
    uiStore.switchTo2DPrompt = false;
    setConfirmErase(false);
    setError(null);
  };

  const pickPlane = (nextPlane: DrawPlane) => {
    setPlane(nextPlane);
    setOffsetText('');
    setError(null);
  };

  const apply = () => {
    setError(null);
    const outcome = mode === 'project'
      ? projectOnto(plane)
      : offsetValid
        ? sliceAt(plane, offset)
        : { ok: false as const, error: 'slice.noOffset' };

    if (!outcome.ok) {
      setError(outcome.error === PROJECTION_COLLAPSE_ERROR ? 'slice.allCollapse' : outcome.error);
      return;
    }
    close();
  };

  const erase = () => {
    eraseAndSwitch();
    close();
  };

  if (!open) return null;

  return (
    <div className="s2d-overlay" onClick={close}>
      <div className="s2d" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className="s2d-title">{t('switch2d.title')}</h3>
        <p className="s2d-lede">{t('switch2d.lede')}</p>

        <section className="s2d-step">
          <h4 className="s2d-step-head"><span className="s2d-num">1</span>{t('switch2d.stepPlane')}</h4>
          <div className="s2d-planes" role="radiogroup" aria-label={t('switch2d.stepPlane')}>
            {PLANES.map((item) => (
              <button
                key={item.id}
                className={`s2d-plane${plane === item.id ? ' on' : ''}`}
                role="radio"
                aria-checked={plane === item.id}
                onClick={() => pickPlane(item.id)}
                data-testid={`s2d-plane-${item.id}`}
              >
                <span className="s2d-plane-name">{item.label}</span>
                <span className="s2d-plane-desc">{t(item.descKey)}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="s2d-step">
          <h4 className="s2d-step-head"><span className="s2d-num">2</span>{t('switch2d.stepWhat')}</h4>
          <div className="s2d-modes">
            <button
              className={`s2d-mode${mode === 'slice' ? ' on' : ''}`}
              onClick={() => setMode('slice')}
              data-testid="s2d-mode-slice"
            >
              <span className="s2d-mode-name">{t('switch2d.slice')}</span>
              <span className="s2d-mode-desc">{t('switch2d.sliceDesc')}</span>
            </button>
            <button
              className={`s2d-mode${mode === 'project' ? ' on' : ''}`}
              onClick={() => setMode('project')}
              data-testid="s2d-mode-project"
            >
              <span className="s2d-mode-name">{t('switch2d.project')}</span>
              <span className="s2d-mode-desc">{t('switch2d.projectDesc')}</span>
            </button>
          </div>

          {mode === 'slice' ? (
            <div className="s2d-slice">
              <label className="s2d-offset">
                <span className="s2d-offset-label">{normal} =</span>
                <input
                  type="number"
                  step="any"
                  value={offsetText}
                  onChange={(event) => setOffsetText(event.currentTarget.value)}
                  placeholder={cuts.length ? fmt(cuts[0].value) : '0'}
                  data-testid="s2d-offset"
                />
                <span className="s2d-unit">m</span>
              </label>

              {cuts.length > 0 && <>
                <p className="s2d-hint">{t('switch2d.cutsAvailable')}</p>
                <div className="s2d-cuts">
                  {cuts.map((cut) => (
                    <button
                      key={cut.value}
                      className={`s2d-cut${matching?.value === cut.value ? ' on' : ''}${cut.elements === 0 ? ' barren' : ''}`}
                      onClick={() => setOffsetText(fmt(cut.value))}
                      data-testid={`s2d-cut-${fmt(cut.value)}`}
                    >
                      <span className="s2d-cut-at">{normal} = {fmt(cut.value)}</span>
                      <span className="s2d-cut-n">
                        {cut.elements} {t('switch2d.members')}
                        {cut.elements > 0 && cut.supports === 0 && (
                          <span className="s2d-cut-flag"> · {t('switch2d.noSupports')}</span>
                        )}
                        {cut.elements > 0 && cut.loads === 0 && (
                          <span className="s2d-cut-flag"> · {t('switch2d.noLoads')}</span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </>}

              {matching && <>
                <p className="s2d-outcome">
                  {matching.nodes} {t('switch2d.nodes')} · {matching.elements} {t('switch2d.members')} · {matching.loads} {t('switch2d.loads')}
                  {modelStore.elements.size - matching.elements > 0 && (
                    <span className="s2d-dropped"> — {modelStore.elements.size - matching.elements} {t('switch2d.leftBehind')}</span>
                  )}
                  {totalLoads - matching.loads > 0 && (
                    <span className="s2d-dropped"> — {totalLoads - matching.loads} {t('switch2d.loadsLeftBehind')}</span>
                  )}
                </p>
                {matching.supports === 0 && <p className="s2d-warn-line">{t('switch2d.noSupportsWarn')}</p>}
                {matching.elements > 0 && matching.loads === 0 && <p className="s2d-warn-line">{t('switch2d.noLoadsWarn')}</p>}
              </>}
            </div>
          ) : (
            <p className="s2d-outcome">
              {collapsed[plane] > 0
                ? <span className="s2d-warn">~{collapsed[plane]} {t('toolbar.planeModal.simplified')}</span>
                : t('switch2d.projectClean')}
            </p>
          )}

          {error && <p className="s2d-error" data-testid="s2d-error">{t(`switch2d.${error.replace('slice.', '')}`)}</p>}
        </section>

        <div className="s2d-footer">
          <button className="s2d-btn" onClick={close} data-testid="s2d-cancel">
            {t('toolbar.planeModal.stay3d')}
          </button>
          <div className="s2d-footer-right">
            {confirmErase ? <>
              <button className="s2d-btn s2d-danger" onClick={erase} data-testid="s2d-erase-confirm">
                {t('switch2d.eraseSure')}
              </button>
              <button className="s2d-btn" onClick={() => setConfirmErase(false)}>
                {t('switch2d.eraseCancel')}
              </button>
            </> : <>
              <button className="s2d-btn s2d-quiet" onClick={() => setConfirmErase(true)} data-testid="s2d-erase">
                {t('toolbar.planeModal.eraseAndSwitch')}
              </button>
              <button
                className="s2d-btn s2d-primary"
                onClick={apply}
                disabled={mode === 'slice' && !offsetValid}
                data-testid="s2d-apply"
              >
                {t('switch2d.apply')}
              </button>
            </>}
          </div>
        </div>
      </div>
    </div>
  );
}
