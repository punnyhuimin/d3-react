import { fireEvent } from '@testing-library/react';

/**
 * Drives a real `d3.brushX` drag in jsdom, so the brush is tested through the same path a user
 * takes rather than by reaching into D3's internals.
 *
 * Two details make it work where a plain `fireEvent` does not:
 *
 * - d3-brush starts on `mousedown` and then binds its move/up listeners to `event.view`. Testing
 *   Library does not set `view`, so without it the gesture starts and never continues — the
 *   selection stays pinned at zero width.
 * - The events must be dispatched on `window` for those listeners to see them.
 */
export function dragBrush(brushGroup: Element, fromX: number, toX: number): void {
  const overlay = brushGroup.querySelector('rect.overlay');
  if (overlay === null) {
    throw new Error('d3 has not attached a brush overlay to this group');
  }

  fireEvent.mouseDown(overlay, { clientX: fromX, clientY: 10, button: 0, view: window });
  fireEvent.mouseMove(window, { clientX: toX, clientY: 10, view: window });
  fireEvent.mouseUp(window, { clientX: toX, clientY: 10, view: window });
}

/**
 * D3 swallows the single click immediately following a drag — its own guard against a release being
 * read as a click — and unregisters that guard on the next macrotask. A real user cannot click
 * faster than that; a synchronous test can, so it has to wait.
 */
export function afterDragSettles(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

/** The `<g>` the brush owns, thrown rather than returned null so a miss fails at its cause. */
export function brushGroupOf(container: HTMLElement): Element {
  const group = container.querySelector('.brush');
  if (group === null) {
    throw new Error('no brush group is rendered');
  }
  return group;
}
