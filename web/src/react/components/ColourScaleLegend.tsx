import { useSyncExternalStore } from 'react';
import { t, localeExternalStore } from '../../lib/i18n/store.svelte';
import { resultsStore, uiStore } from '../../lib/store';
import { colourScaleSource } from '../../lib/store/result-view';
import { COLOUR_RAMP_STOPS, OVER_SCALE_RGB } from '../../lib/three/colour-ramp';
import { useStoreRevision } from '../store/useStoreRevision';
import './ColourScaleLegend.css';

const gradient = `linear-gradient(to top, ${COLOUR_RAMP_STOPS.map((stop) => `rgb(${stop.rgb.join(',')}) ${stop.at * 100}%`).join(', ')})`;
const overScaleCss = `rgb(${OVER_SCALE_RGB.join(',')})`;

function formatTick(value: number): string {
  const absolute = Math.abs(value);
  if (absolute === 0) return '0';
  if (absolute >= 1000) return value.toExponential(1).replace('e+', 'e');
  if (absolute >= 100) return value.toFixed(0);
  if (absolute >= 10) return value.toFixed(1);
  if (absolute >= 1) return value.toFixed(2);
  return value.toPrecision(2);
}

export function ColourScaleLegend() {
  useStoreRevision(resultsStore);
  useStoreRevision(uiStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const published = resultsStore.colourScale;
  const scale = published?.source === colourScaleSource() ? published : null;
  if (!scale || !uiStore.showColourScale) return null;
  const overScale = scale.source === 'colorMap:stressRatio';
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((at) => ({ at, label: formatTick(scale.max * at) }));

  return <div className="cs-legend" aria-label={t('results.colourScaleLegend')}>
    <div className="cs-rail">{overScale && <div className="cs-cap" style={{ background: overScaleCss }} />}<div className="cs-bar" style={{ background: gradient }} /></div>
    <div className="cs-ticks">
      {overScale && <span className="cs-tick cs-cap-label">{t('results.overScale')}</span>}
      {ticks.map((tick) => <span className="cs-tick" style={{ bottom: `calc(${tick.at * 100}% - 0.45em)` }} key={tick.at}>{tick.label}</span>)}
    </div>
    {scale.unit && <span className="cs-unit">{scale.unit}</span>}
  </div>;
}
