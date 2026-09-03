import { useEffect, useRef, useState } from 'react';
import {
  NODES, MEMBERS, DECK, SUPPORTS, FORCE_MAX, FORCE_EPS, DISP_SCALE, stateAt,
} from '../../components/landing/truss-data';
import { usePublicI18n } from '../i18n/PublicI18n';

type TrussFigureProps = {
  mode?: 'animate' | 'still';
  position?: number;
  compact?: boolean;
  captionKey?: string;
  prefersReducedMotion?: boolean;
};

const REPRESENTATIVE = 0.5;
const SWEEP_MIN = 0.08;
const SWEEP_MAX = 0.92;
const nodeIndex = new Map(NODES.map((node, index) => [node.id, index]));

/** React port of the solved, animated landing-page truss illustration. */
export function TrussFigure({
  mode = 'animate',
  position = 0.5,
  compact = false,
  captionKey = '',
  prefersReducedMotion = false,
}: TrussFigureProps) {
  const { t } = usePublicI18n();
  const [s, setS] = useState(
    mode === 'still' ? position : prefersReducedMotion ? REPRESENTATIVE : SWEEP_MIN,
  );
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const direction = useRef(1);
  const running = mode === 'animate' && !prefersReducedMotion && !hovered && !focused;
  const solved = stateAt(mode === 'still' ? position : s);

  useEffect(() => {
    if (mode !== 'animate') return;
    let frame = 0;
    let last = performance.now();
    const secondsPerSweep = 9;

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (running) {
        setS((current) => {
          let next = current + (direction.current * dt * (SWEEP_MAX - SWEEP_MIN)) / secondsPerSweep;
          if (next >= SWEEP_MAX) {
            next = SWEEP_MAX;
            direction.current = -1;
          } else if (next <= SWEEP_MIN) {
            next = SWEEP_MIN;
            direction.current = 1;
          }
          return next;
        });
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [mode, running]);

  function at(id: string) {
    const i = nodeIndex.get(id)!;
    const node = NODES[i];
    return {
      x: node.x + solved.displacements[2 * i] * DISP_SCALE,
      y: node.y + solved.displacements[2 * i + 1] * DISP_SCALE,
    };
  }

  function ref(id: string) {
    const node = NODES[nodeIndex.get(id)!];
    return { x: node.x, y: node.y };
  }

  function paint(force: number) {
    const magnitude = Math.abs(force) / FORCE_MAX;
    if (Math.abs(force) < FORCE_EPS) {
      return { stroke: 'var(--tf-zero)', width: 1.1, opacity: 0.55 };
    }
    return {
      stroke: force > 0 ? 'var(--tf-tension)' : 'var(--tf-compression)',
      width: 1.5 + 2.1 * magnitude,
      opacity: 0.42 + 0.58 * magnitude,
    };
  }

  const loadPosition = mode === 'still' ? position : s;
  const tt = Math.min(1, Math.max(0, loadPosition)) * (DECK.length - 1);
  const loadIndex = Math.min(DECK.length - 2, Math.floor(tt));
  const weight = tt - loadIndex;
  const loadA = at(DECK[loadIndex]);
  const loadB = at(DECK[loadIndex + 1]);
  const loadPoint = {
    x: loadA.x + (loadB.x - loadA.x) * weight,
    y: loadA.y + (loadB.y - loadA.y) * weight,
  };
  const deckLeft = at('B0');
  const deckRight = at('B6');
  const titleId = `tf-title-${Math.round(position * 1000)}-${mode}`;
  const descId = `tf-desc-${Math.round(position * 1000)}-${mode}`;

  return (
    <figure className={`truss-fig${compact ? ' compact' : ''}`}>
      <svg
        viewBox={compact ? '24 8 512 150' : '0 12 560 150'}
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        <title id={titleId}>{t('landing.figTitle')}</title>
        <desc id={descId}>{t('landing.figDesc')}</desc>

        <g className="tf-ghost" aria-hidden="true">
          {MEMBERS.map((member) => {
            const a = ref(member.a);
            const b = ref(member.b);
            return <line key={`${member.a}-${member.b}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
          })}
        </g>

        <g className="tf-members" aria-hidden="true">
          {MEMBERS.map((member, index) => {
            const a = at(member.a);
            const b = at(member.b);
            const color = paint(solved.forces[index]);
            return (
              <line
                key={`${member.a}-${member.b}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={color.stroke}
                strokeWidth={member.kind === 'bottom' ? color.width + 1.1 : color.width}
                opacity={color.opacity}
              />
            );
          })}
        </g>

        <g className="tf-deck-rule" aria-hidden="true">
          <line x1={deckLeft.x} y1={deckLeft.y + 7} x2={deckRight.x} y2={deckRight.y + 7} />
        </g>

        <g className="tf-nodes" aria-hidden="true">
          {NODES.map((node) => {
            const point = at(node.id);
            return <circle key={node.id} cx={point.x} cy={point.y} r="2.4" />;
          })}
        </g>

        <g className="tf-supports" aria-hidden="true">
          {SUPPORTS.map((support) => {
            const point = at(support.node);
            return (
              <g key={support.node}>
                <path d={`M${point.x} ${point.y} l-8 14 h16 z`} />
                <line x1={point.x - 12} y1={point.y + 14} x2={point.x + 12} y2={point.y + 14} />
                {support.kind === 'roller' ? (
                  <>
                    <circle className="tf-roller" cx={point.x - 4} cy={point.y + 17} r="2.6" />
                    <circle className="tf-roller" cx={point.x + 4} cy={point.y + 17} r="2.6" />
                    <line x1={point.x - 12} y1={point.y + 20} x2={point.x + 12} y2={point.y + 20} />
                  </>
                ) : [-9, -3, 3, 9].map((hatch) => (
                  <line
                    key={hatch}
                    className="tf-hatch"
                    x1={point.x + hatch}
                    y1={point.y + 14}
                    x2={point.x + hatch - 4}
                    y2={point.y + 19}
                  />
                ))}
              </g>
            );
          })}
        </g>

        <g className="tf-load" aria-hidden="true" transform={`translate(${loadPoint.x} ${loadPoint.y})`}>
          <line x1="0" y1="-30" x2="0" y2="-9" />
          <path d="M-4.5 -15 L0 -6 L4.5 -15 z" />
        </g>
      </svg>

      {compact ? (
        <figcaption className="tf-caption">{captionKey ? t(captionKey) : ''}</figcaption>
      ) : (
        <figcaption className="tf-legend">
          <span className="tf-key tf-key-t">{t('landing.figTension')}</span>
          <span className="tf-key tf-key-c">{t('landing.figCompression')}</span>
          <span className="tf-key tf-key-z">{t('landing.figZero')}</span>
          <span className="tf-key tf-key-g">{t('landing.figUndeformed')}</span>
          <span className="tf-key tf-key-n">{t('landing.figDeformedNorm')}</span>
        </figcaption>
      )}
    </figure>
  );
}
