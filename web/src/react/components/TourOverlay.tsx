import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { localeExternalStore, t } from '../../lib/i18n/store';
import { tourStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';
import './TourOverlay.css';

const PADDING_DEFAULT = 8;
const CARD_GAP = 14;
const CARD_W = 380;
const CARD_W_MOBILE = 320;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function TourOverlay() {
  useStoreRevision(tourStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === 'undefined' ? 1280 : window.innerWidth,
    height: typeof window === 'undefined' ? 720 : window.innerHeight,
  }));
  const [cardHeight, setCardHeight] = useState(220);
  const [canAdvance, setCanAdvance] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const autoAdvanceArmed = useRef(false);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isActive = tourStore.isActive;
  const stepIndex = tourStore.currentStepIndex;
  const step = tourStore.currentStep;
  const targetRect = tourStore.targetRect;
  const mobile = viewport.width < 768;
  const cardWidth = mobile ? CARD_W_MOBILE : (step?.cardWidth ?? CARD_W);

  useEffect(() => {
    if (!isActive) {
      document.body.classList.remove('tour-active');
      return;
    }
    document.body.classList.add('tour-active');
    let frame = 0;
    const tick = () => {
      if (!tourStore.isActive) return;
      tourStore.updateTargetRect();
      setViewport((current) => current.width === window.innerWidth && current.height === window.innerHeight
        ? current
        : { width: window.innerWidth, height: window.innerHeight });
      const height = cardRef.current?.getBoundingClientRect().height ?? 0;
      if (height > 0) setCardHeight((current) => Math.abs(current - height) > .5 ? height : current);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      document.body.classList.remove('tour-active');
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !step) return;
    setCardHeight(220);
    autoAdvanceArmed.current = !!(step.autoAdvance && step.waitFor && !step.waitFor());
    tourStore.armedForTest = autoAdvanceArmed.current;
    setCanAdvance(tourStore.canAdvance);
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    requestAnimationFrame(() => tourStore.updateTargetRect());
  }, [isActive, stepIndex, step]);

  useEffect(() => {
    if (!isActive || !step) return;
    const poll = () => {
      if (!tourStore.isActive || tourStore.currentStepIndex !== stepIndex) return;
      const ready = tourStore.canAdvance;
      setCanAdvance(ready);
      if (!step.autoAdvance || !step.waitFor || !autoAdvanceArmed.current || !ready || autoAdvanceTimer.current) return;
      autoAdvanceTimer.current = setTimeout(() => {
        if (tourStore.isActive && !tourStore.isLastStep && tourStore.currentStepIndex === stepIndex) tourStore.next();
        autoAdvanceTimer.current = null;
      }, 800);
    };
    poll();
    const pollTimer = setInterval(poll, 300);
    return () => clearInterval(pollTimer);
  }, [isActive, stepIndex, step]);

  useEffect(() => () => {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
  }, []);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (!tourStore.isActive) return;
      event.stopPropagation();
      if (event.key === 'Escape') {
        tourStore.end();
        event.preventDefault();
      } else if (event.key === 'ArrowRight' || event.key === 'Enter') {
        const current = tourStore.currentStep;
        if (current?.autoAdvance && event.key === 'Enter') return;
        if (tourStore.isLastStep) tourStore.end();
        else if (tourStore.canAdvance) tourStore.next();
        event.preventDefault();
      } else if (event.key === 'ArrowLeft') {
        tourStore.prev();
        event.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  const position = useMemo(() => {
    if (!step) return { x: 0, y: 0 };
    const clampX = (x: number) => clamp(x, 10, viewport.width - cardWidth - 10);
    const clampY = (y: number) => clamp(y, 10, viewport.height - cardHeight - 10);
    if (step.cardPosition) return { x: clampX(step.cardPosition.x), y: clampY(step.cardPosition.y) };
    if (!targetRect || step.position === 'center' || step.target === 'none') {
      return { x: (viewport.width - cardWidth) / 2, y: Math.max(10, (viewport.height - cardHeight) / 2 - 40) };
    }
    if (mobile) return { x: (viewport.width - cardWidth) / 2, y: viewport.height - cardHeight - 10 };
    const padding = step.highlightPadding ?? PADDING_DEFAULT;
    const hx = targetRect.left - padding;
    const hy = targetRect.top - padding;
    const hw = targetRect.width + padding * 2;
    const hh = targetRect.height + padding * 2;
    const centerX = hx + hw / 2;
    let placement = step.position;
    if (placement === 'auto') {
      if (viewport.height - targetRect.bottom > cardHeight + 30) placement = 'bottom';
      else if (targetRect.top > cardHeight + 30) placement = 'top';
      else if (viewport.width - targetRect.right > cardWidth + 20) placement = 'right';
      else if (targetRect.left > cardWidth + 20) placement = 'left';
      else placement = 'bottom';
    }
    if (placement === 'bottom') return { x: clampX(centerX - cardWidth / 2), y: clampY(hy + hh + CARD_GAP) };
    if (placement === 'top') return { x: clampX(centerX - cardWidth / 2), y: clampY(hy - CARD_GAP - cardHeight) };
    if (placement === 'right') return { x: clampX(hx + hw + CARD_GAP), y: clampY(hy) };
    if (placement === 'left') return { x: clampX(hx - cardWidth - CARD_GAP), y: clampY(hy) };
    return { x: (viewport.width - cardWidth) / 2, y: Math.max(10, (viewport.height - cardHeight) / 2 - 40) };
  }, [cardHeight, cardWidth, mobile, step, targetRect, viewport.height, viewport.width]);

  if (!isActive || !step) return null;

  const padding = step.highlightPadding ?? PADDING_DEFAULT;
  const opacity = step.overlayOpacity ?? .6;
  const embedded = typeof window !== 'undefined' && window !== window.parent;
  const cardStyle: React.CSSProperties = { left: position.x, top: position.y, width: cardWidth };
  if (mobile && step.mobileCardMaxHeight) cardStyle.maxHeight = step.mobileCardMaxHeight;
  if (mobile && step.mobileCardBottom) {
    cardStyle.bottom = step.mobileCardBottom;
    cardStyle.top = 'auto';
  }

  const runAction = (action: () => void, advanceAfter = true) => {
    action();
    if (advanceAfter) setTimeout(() => tourStore.next(), 100);
  };

  return <div className="react-tour-overlay tour-overlay">
    <svg className="tour-svg" viewBox={`0 0 ${viewport.width} ${viewport.height}`} xmlns="http://www.w3.org/2000/svg">
      <defs><mask id="tour-spotlight-mask">
        <rect x="0" y="0" width={viewport.width} height={viewport.height} fill="white" />
        {targetRect && <rect x={targetRect.left - padding} y={targetRect.top - padding} width={targetRect.width + padding * 2} height={targetRect.height + padding * 2} rx="8" ry="8" fill="black" />}
      </mask></defs>
      <rect x="0" y="0" width={viewport.width} height={viewport.height} fill={`rgba(0,0,0,${opacity})`} mask="url(#tour-spotlight-mask)" />
      {targetRect && <rect x={targetRect.left - padding - 1.5} y={targetRect.top - padding - 1.5} width={targetRect.width + padding * 2 + 3} height={targetRect.height + padding * 2 + 3} rx="9" ry="9" fill="none" stroke="#4ecdc4" strokeWidth="2" opacity="0.7" />}
    </svg>
    {!step.allowInteraction && <div className="tour-blocker" />}
    <div ref={cardRef} className={`tour-card${step.target === 'none' || step.position === 'center' ? ' center' : ''}`} style={cardStyle}>
      <div className="tour-progress"><div className="tour-progress-fill" style={{ width: `${tourStore.progress * 100}%` }} /></div>
      <div className="tour-body">
        <span className="tour-counter">{stepIndex + 1} / {tourStore.totalSteps}</span>
        <h3 className="tour-title">{step.title}</h3>
        <div className="tour-desc" dangerouslySetInnerHTML={{ __html: step.description }} />
      </div>
      <div className="tour-footer">
        {!tourStore.isLastStep && <button type="button" className="tour-skip" onClick={() => tourStore.end()}>{t('tour.skip')}</button>}
        <div className="tour-nav">
          {!tourStore.isFirstStep && <button type="button" className="tour-prev" onClick={() => tourStore.prev()}>{t('tour.prev')}</button>}
          {tourStore.isLastStep ? <button type="button" className="tour-finish" onClick={() => tourStore.end()}>{embedded ? t('tour.tryFullApp') : t('tour.finish')}</button>
            : step.waitFor && !canAdvance && step.actionButton ? <button type="button" className="tour-action" onClick={() => runAction(step.actionButton!.action, step.actionButton!.advanceAfter !== false)}>{step.actionButton.label}</button>
              : <>
                {step.multiAction?.map((action, index) => <button type="button" className="tour-action" key={`${action.label}-${index}`} onClick={() => runAction(action.action, action.advanceAfter !== false)}>{action.label}</button>)}
                <button type="button" className="tour-next" onClick={() => tourStore.next()} disabled={step.waitFor ? !canAdvance : false}>{step.waitFor && !canAdvance ? t('tour.waiting') : t('tour.next')}</button>
              </>}
        </div>
      </div>
    </div>
  </div>;
}
