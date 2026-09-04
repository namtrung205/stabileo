export type Viewport3DInteractionController = {
  handleMouseDown(event: MouseEvent): void;
  handleMouseUp(event: MouseEvent): void;
  handleMouseMove(event: MouseEvent): void;
  handleMouseLeave(): void;
  handleContextMenu(event: MouseEvent): void;
};

/** Bind editor interaction to the WebGL surface itself, never its overlay host. */
export function bindViewport3DInteractions(
  surface: EventTarget,
  controller: Viewport3DInteractionController,
  updateCursor: () => void,
) {
  const down = (event: Event) => { controller.handleMouseDown(event as MouseEvent); updateCursor(); };
  const up = (event: Event) => { controller.handleMouseUp(event as MouseEvent); updateCursor(); };
  const move = (event: Event) => { controller.handleMouseMove(event as MouseEvent); updateCursor(); };
  const leave = () => { controller.handleMouseLeave(); updateCursor(); };
  const menu = (event: Event) => controller.handleContextMenu(event as MouseEvent);
  surface.addEventListener('mousedown', down);
  surface.addEventListener('mouseup', up);
  surface.addEventListener('mousemove', move);
  surface.addEventListener('mouseleave', leave);
  surface.addEventListener('contextmenu', menu);
  updateCursor();

  return () => {
    surface.removeEventListener('mousedown', down);
    surface.removeEventListener('mouseup', up);
    surface.removeEventListener('mousemove', move);
    surface.removeEventListener('mouseleave', leave);
    surface.removeEventListener('contextmenu', menu);
  };
}
