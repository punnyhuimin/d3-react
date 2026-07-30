import { useCallback, useEffect, useRef, type RefObject } from 'react';
import * as d3 from 'd3';

export interface UseBrushXOptions {
  /** The scale the pixel selection is inverted through, giving the caller domain values. */
  scale: d3.ScaleLinear<number, number>;
  /** The brushable area in plot pixels. */
  width: number;
  height: number;
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
export function useBrushX({ scale, width, height, onSelect }: UseBrushXOptions): BrushX {
  const ref = useRef<SVGGElement>(null);
  const behaviour = useRef<d3.BrushBehavior<unknown> | null>(null);
  const latest = useRef({ scale, onSelect });

  latest.current = { scale, onSelect };

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
      .on('brush end', (event: d3.D3BrushEvent<unknown>) => {
        const [from, to] = event.selection ?? [];
        if (typeof from !== 'number' || typeof to !== 'number') {
          latest.current.onSelect(null);
          return;
        }
        const { scale: current, onSelect: notify } = latest.current;
        notify([current.invert(from), current.invert(to)]);
      });

    const group = d3.select(node);
    group.call(brush);
    behaviour.current = brush;

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
