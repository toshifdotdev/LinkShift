import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";



function useRolledValue(value: number, active: boolean): number {
  const reduce = useReducedMotion();
  const previousRef = useRef(value);
  const [display, setDisplay] = useState(value);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = previousRef.current;
    previousRef.current = value;
    // First paint shows the real value: a metric must be readable the moment
    // it lands. Only genuine changes to an already-shown value roll.
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
  
  format?: (n: number) => string;
  
  roll?: boolean;
  className?: string;
  valueClassName?: string;
}

function KpiCell({ label, value, format, roll = true, className, valueClassName }: KpiCellProps) {
  const display = useRolledValue(value, roll);
  return (
    <div data-slot="kpi-cell" className={cn("flex flex-col gap-2", className)}>
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
