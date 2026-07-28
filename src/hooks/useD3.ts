import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

type RenderFn = (selection: d3.Selection<SVGSVGElement, unknown, null, undefined>) => void;

export function useD3(renderFn: RenderFn, dependencies: React.DependencyList) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    renderFn(d3.select(ref.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return ref;
}
