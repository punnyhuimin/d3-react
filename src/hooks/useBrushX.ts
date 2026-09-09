import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import * as d3 from 'd3';

export interface UseBrushXOptions {
  /** The scale the pixel selection is inverted through, giving the caller domain values. */
  scale: d3.ScaleLinear<number, number>;
  /** The brushable area in plot pixels. */
  width: number;
  height: number;
  /**
   * The current selection in **domain** units — the caller's state, not the brush's. It is the
   * source of truth the brush is re-projected from when the extent changes.
   */
  selection: [number, number] | null;
  /** Called with the inverted selection, or `null` when the brush is cleared. */
  onSelect: (selection: [number, number] | null) => void;
}

export interface BrushX {
  /** Attach to the `<g>` the brush should own. D3 writes only inside it. */
  ref: RefObject<SVGGElement | null>;
  /** Clears the brush, which fires `onSelect(null)` through the same path a user clear takes. */
  clear: () => void;
}

/**
 * `d3.brushX` manages its own overlay, selection rect and handles — so it is quarantined here rather than
 * spread through a component.
 *
 * The scale and callback are read from a ref at event time. They are new objects on every render,
 * and putting them in the dependency array would tear the brush down mid-drag; only a genuine change
 * of extent re-attaches it.
 */
export function useBrushX({ scale, width, height, selection, onSelect }: UseBrushXOptions): BrushX {
  const ref = useRef<SVGGElement>(null);
  const behaviour = useRef<d3.BrushBehavior<unknown> | null>(null);
  const latest = useRef({ scale, selection, onSelect });

  // A layout effect rather than a render-phase write. Measured identical either way — nothing here
  // emits a brush event while the two forms disagree (docs/brush-latest-ref.md §3). This form is the
  // robustness default: it avoids mutating a ref during render, and stays correct if this app ever
  // adopts startTransition or useDeferredValue. Layout effects flush before passive ones, so the ref
  // is still fresh when the brush effect below rebuilds.
  useLayoutEffect(() => {
    latest.current = { scale, selection, onSelect };
  });

  useEffect(() => {
    const node = ref.current;
    if (node === null) {
      return;
    }

    const brush = d3
      .brushX()
      .extent([
        [0, 0],
        [width, height],
      ])
      // 2. Separate events to prevent D3 dispatch crashes during teardowns
      .on('brush', (event: d3.D3BrushEvent<unknown>) => {
        const { scale: currentScale, onSelect: notify } = latest.current;
        if (!event.selection) {
          notify(null);
          return;
        }
        const [from, to] = event.selection as [number, number];
        notify([currentScale.invert(from), currentScale.invert(to)]);
      })
      .on('end', (event: d3.D3BrushEvent<unknown>) => {
        // Only trigger onSelect(null) if it was an intentional user click clear
        if (!event.selection && event.sourceEvent) {
          latest.current.onSelect(null);
        }
      });

    const group = d3.select(node);
    group.call(brush);
    behaviour.current = brush;

    // `group.call(brush)` keeps whatever pixel selection `node.__brush` already held and only swaps
    // the extent — d3 never rescales or clamps it — so after a resize the rect would sit at
    // coordinates that mean something different. Re-project the caller's domain selection through
    // the new scale instead. `brush.move` clamps to the new extent and re-emits, so the rect, the
    // extent and the caller's state end up agreeing.
    const { scale: current, selection: domain } = latest.current;
    if (domain !== null) {
      group.call(brush.move, [current(domain[0]), current(domain[1])]);
    }

    // Clean up D3 event listeners and remove the overlay, selection and handles.
    return () => {
      group.on('.brush', null);
      group.selectAll('*').remove();
      behaviour.current = null;
    };
  }, [width, height]);

  const clear = useCallback(() => {
    const node = ref.current;
    const brush = behaviour.current;
    if (node !== null && brush !== null) {
      // D3 emits `end` with a null selection through this, so the caller hears about the clear on
      // exactly the same path a user-driven clear takes.
      d3.select(node).call(brush.move, null);
    }
  }, []);

  return { ref, clear };
}
