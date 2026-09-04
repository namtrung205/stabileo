import { describe, expect, it, vi } from 'vitest';
import { createInvalidationLoop } from '../invalidation-loop';

function harness(animated = false) {
  const queue: FrameRequestCallback[] = [];
  const draw = vi.fn();
  const cancel = vi.fn();
  const loop = createInvalidationLoop({ draw, shouldAnimate: () => animated, continuous: () => false, schedule: (callback) => { queue.push(callback); return queue.length; }, cancel });
  return { loop, queue, draw, cancel };
}

describe('2D viewport invalidation loop', () => {
  it('coalesces multiple invalidations into one frame', () => {
    const { loop, queue, draw } = harness();
    loop.invalidate(); loop.invalidate(); loop.invalidate();
    expect(queue).toHaveLength(1);
    queue.shift()?.(0);
    expect(draw).toHaveBeenCalledOnce();
  });

  it('continues only while an animation is active', () => {
    let animated = true;
    const queue: FrameRequestCallback[] = [];
    const draw = vi.fn();
    const loop = createInvalidationLoop({ draw, shouldAnimate: () => animated, continuous: () => false, schedule: (callback) => { queue.push(callback); return queue.length; }, cancel: vi.fn() });
    loop.start(); queue.shift()?.(0); queue.shift()?.(1);
    expect(queue).toHaveLength(1);
    animated = false; queue.shift()?.(2);
    expect(queue).toHaveLength(0);
    expect(draw).toHaveBeenCalledTimes(2);
  });

  it('cancels a queued frame and ignores future invalidation after disposal', () => {
    const { loop, queue, draw, cancel } = harness();
    loop.start(); loop.dispose(); loop.invalidate();
    expect(cancel).toHaveBeenCalledOnce();
    queue.shift()?.(0);
    expect(draw).not.toHaveBeenCalled();
  });

  it('reports when a render loop becomes idle', () => {
    const queue: FrameRequestCallback[] = [];
    const onIdle = vi.fn();
    const loop = createInvalidationLoop({
      draw: vi.fn(), shouldAnimate: () => false, continuous: () => false, onIdle,
      schedule: (callback) => { queue.push(callback); return queue.length; }, cancel: vi.fn(),
    });
    loop.start(); queue.shift()?.(0);
    expect(onIdle).toHaveBeenCalledOnce();
  });
});
