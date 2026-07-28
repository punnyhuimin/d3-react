import { useEffect, useRef, useState, type RefObject } from 'react';

export interface ResizeObservation<T extends Element> {
  /** Attach to the element whose width the chart should fill. */
  ref: RefObject<T | null>;
  /** The observed content width in pixels, or the fallback until one is measured. */
  width: number;
}

/**
 * Reports the observed width of a container so a chart sizes itself to its column instead of a
 * hardcoded pixel width. Environments without `ResizeObserver` — jsdom under Jest, notably — keep
 * the fallback, which makes the rendered geometry deterministic in tests.
 */
export function useResizeObserver<T extends Element>(fallbackWidth: number): ResizeObservation<T> {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallbackWidth);

  useEffect(() => {
    const element = ref.current;
    if (element === null || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry === undefined) {
        return;
      }
      const observed = entry.contentRect.width;
      if (observed > 0) {
        setWidth(observed);
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [fallbackWidth]);

  return { ref, width };
}
