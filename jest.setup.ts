import '@testing-library/jest-dom';

/**
 * jsdom ships no `PointerEvent`. Testing Library then falls back to constructing a bare `Event`,
 * which silently drops `clientX` — so a pointer assertion reads `null` rather than failing loudly.
 * `MouseEvent` already carries every field the charts read, so it stands in, with the pointer
 * identity fields filled from the init so the shim satisfies the interface it claims.
 */
if (typeof window.PointerEvent === 'undefined') {
  class PointerEventShim extends MouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;
    readonly isPrimary: boolean;

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 1;
      this.pointerType = params.pointerType ?? 'mouse';
      this.isPrimary = params.isPrimary ?? true;
    }
  }

  window.PointerEvent = PointerEventShim as unknown as typeof PointerEvent;
}
