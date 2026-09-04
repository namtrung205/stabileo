import { describe, expect, it, vi } from 'vitest';
import { bindViewport3DInteractions } from '../interaction-binding';

describe('3D canvas interaction binding', () => {
  it('routes every pointer interaction to the controller and cleans up', () => {
    const surface = new EventTarget();
    const controller = {
      handleMouseDown: vi.fn(), handleMouseUp: vi.fn(), handleMouseMove: vi.fn(),
      handleMouseLeave: vi.fn(), handleContextMenu: vi.fn(),
    };
    const updateCursor = vi.fn();
    const dispose = bindViewport3DInteractions(surface, controller, updateCursor);

    for (const type of ['mousedown', 'mouseup', 'mousemove', 'mouseleave', 'contextmenu']) {
      surface.dispatchEvent(new Event(type));
    }
    expect(controller.handleMouseDown).toHaveBeenCalledTimes(1);
    expect(controller.handleMouseUp).toHaveBeenCalledTimes(1);
    expect(controller.handleMouseMove).toHaveBeenCalledTimes(1);
    expect(controller.handleMouseLeave).toHaveBeenCalledTimes(1);
    expect(controller.handleContextMenu).toHaveBeenCalledTimes(1);
    expect(updateCursor).toHaveBeenCalledTimes(5);

    dispose();
    surface.dispatchEvent(new Event('mousedown'));
    expect(controller.handleMouseDown).toHaveBeenCalledTimes(1);
  });
});
