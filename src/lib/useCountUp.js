import { useEffect, useState } from 'react';

/** Counts from 0 to `target` once `start` turns true. Respects reduced motion. */
export function useCountUp(target, start = true, duration = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setVal(target); return undefined; }
    let raf; const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, target, duration]);
  return val;
}
