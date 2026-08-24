import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

function useCountUp(target: number, active: boolean, duration = 900): number {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    if (reduce) {
      rafRef.current = requestAnimationFrame(() => setValue(target));
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, active, duration, reduce]);

  return value;
}

export { useCountUp };
