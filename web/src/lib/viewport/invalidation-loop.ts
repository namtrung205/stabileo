export type FrameHandle = number;

export type InvalidationLoopOptions = {
  draw(): void;
  shouldAnimate(): boolean;
  continuous(): boolean;
  schedule?(callback: FrameRequestCallback): FrameHandle;
  cancel?(handle: FrameHandle): void;
  onIdle?(): void;
};

/** Framework-neutral, invalidation-driven canvas scheduler. */
export function createInvalidationLoop(options: InvalidationLoopOptions) {
  const schedule = options.schedule ?? requestAnimationFrame;
  const cancel = options.cancel ?? cancelAnimationFrame;
  let needsRedraw = true;
  let handle: FrameHandle | null = null;
  let disposed = false;

  const queue = () => {
    if (!disposed && handle === null) handle = schedule(frame);
  };
  const frame: FrameRequestCallback = () => {
    handle = null;
    if (disposed) return;
    const active = options.shouldAnimate() || options.continuous();
    if (!needsRedraw && !active) { options.onIdle?.(); return; }
    needsRedraw = false;
    options.draw();
    if (options.shouldAnimate() || options.continuous() || needsRedraw) queue();
    else options.onIdle?.();
  };

  return {
    start() { queue(); },
    invalidate() { needsRedraw = true; queue(); },
    updateAnimation() { if (options.shouldAnimate() || options.continuous()) queue(); },
    dispose() { disposed = true; if (handle !== null) cancel(handle); handle = null; },
  };
}
