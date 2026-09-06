import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/*
 * KpiCell — an instrument, not a poster: mono tabular value under a 10px
 * mono micro-label. Value changes roll over ~400ms (the one orchestrated
 * motion on dashboards); reduced motion snaps.
 */

function useRolledValue(value: number, active: boolean): number {
  const reduce = useReducedMotion();
  const previousRef = useRef(0);
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = previousRef.current;
    previousRef.current = value;
    if (from === value || reduce || !active) {
      setDisplay(value);
      return;
    }
    const duration = 400;
    let start = -1;
    const tick = (now: number) => {
      if (start < 0) start = now;
      const t = Math.max(0, Math.min((now - start) / duration, 1));
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, reduce, active]);

  return display;
}

interface KpiCellProps {
  label: string;
  value: number;
  /** Formats the displayed number; defaults to en-US grouping. */
  format?: (n: number) => string;
  /** Animate value changes; pass false to snap (e.g. static reports). */
  roll?: boolean;
  className?: string;
  valueClassName?: string;
}

function KpiCell({ label, value, format, roll = true, className, valueClassName }: KpiCellProps) {
  const display = useRolledValue(value, roll);
  return (
    <div data-slot="kpi-cell" className={cn("flex flex-col gap-1.5", className)}>
      <p className="font-mono text-[10px] font-medium tracking-[0.14em] text-fg-muted uppercase">
        {label}
      </p>
      <p
        className={cn(
          "font-mono text-[26px] leading-none font-medium tracking-tight text-foreground tabular-nums",
          valueClassName,
        )}
      >
        {format ? format(display) : display.toLocaleString("en-US")}
      </p>
    </div>
  );
}

export { KpiCell };
