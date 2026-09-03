import { useEffect, useId, useRef, useState, type FocusEvent, type ReactNode } from 'react';
import './HelpTip.css';

type HelpTipProps = {
  text: string;
  delay?: number;
  side?: 'left' | 'right';
  children?: ReactNode;
};

/** Theme-aware delayed help used by compact editor controls. */
export function HelpTip({ text, delay = 700, side = 'left', children }: HelpTipProps) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tipId = `helptip-${useId().replace(/:/g, '')}`;

  function disarm() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setOpen(false);
  }

  function arm() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      setOpen(true);
    }, delay);
  }

  function focusIn(event: FocusEvent<HTMLSpanElement>) {
    setOpen(true);
    (event.target as HTMLElement | null)?.setAttribute?.('aria-describedby', tipId);
  }

  function focusOut(event: FocusEvent<HTMLSpanElement>) {
    (event.target as HTMLElement | null)?.removeAttribute?.('aria-describedby');
    disarm();
  }

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return <span className="ht-wrap" onMouseEnter={arm} onMouseLeave={disarm} onFocus={focusIn} onBlur={focusOut}>
    {children}
    {open && <span className={`ht-tip${side === 'right' ? ' right' : ''}`} id={tipId} role="tooltip">{text}</span>}
  </span>;
}
