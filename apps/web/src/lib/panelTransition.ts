export type PanelTransitionDirection = "forward" | "back";

/** Sets direction on <html> before a view-transition navigation so CSS keyframes match. */
export function setPanelTransitionDirection(
  direction: PanelTransitionDirection,
): void {
  document.documentElement.dataset.panelTransition = direction;
}
