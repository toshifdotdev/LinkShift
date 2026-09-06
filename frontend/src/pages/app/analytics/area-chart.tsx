import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DailyPoint } from "@/types/api";

/**
 * Primary time-series visualization — SVG area/line chart.
 * The area path uses a non-uniform viewBox scale (responsive), with
 * non-scaling stroke; the hover layer is HTML (percentage-positioned) so
 * tooltips never distort. Line draws in on data change; reduced motion
 * renders the final state directly.
 */
function AreaChart({
  data,
  loading,
  emptyTitle = "No clicks in this period",
  emptyHint = "Share a link and activity will chart here.",
  heightClass = "h-64",
}: {
  data: DailyPoint[];
  loading?: boolean;
  emptyTitle?: string;
  emptyHint?: string;
  heightClass?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const reduce = useReducedMotion();
  const lineRef = useRef<SVGPathElement>(null);
  const areaRef = useRef<SVGPathElement>(null);

  /* draw-in: dash the line at full length, release it; area fades up */
  useEffect(() => {
    const line = lineRef.current;
    const area = areaRef.current;
    if (!line || !area || reduce) return;

    const len = line.getTotalLength();
    line.style.transition = "none";
    line.style.strokeDasharray = `${len}`;
    line.style.strokeDashoffset = `${len}`;
    area.style.transition = "none";
    area.style.opacity = "0";
    void line.getBoundingClientRect();
    line.style.transition = "stroke-dashoffset 700ms cubic-bezier(0.3, 0, 0.2, 1)";
    area.style.transition = "opacity 500ms ease-out 200ms";
    line.style.strokeDashoffset = "0";
    area.style.opacity = "1";

    return () => {
      line.style.transition = "";
      line.style.strokeDasharray = "";
      line.style.strokeDashoffset = "";
      area.style.transition = "";
      area.style.opacity = "";
    };
  }, [data, reduce]);

  if (loading) {
    return (
      <div className={cn("flex items-end gap-[3px] sm:gap-[3px]", heightClass)} aria-label="Loading chart">
        {Array.from({ length: 30 }).map((_, i) => (
          <Skeleton key={i} className="flex-1" style={{ height: `${20 + ((i * 37) % 60)}%` }} />
        ))}
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.clicks, 0);
  if (total === 0 || data.length === 0) {
    /* empty state keeps the chart structure visible so the user
       understands what will appear once data exists */
    return (
      <div
        className={cn(
          "relative flex items-end gap-[2px] sm:gap-[3px] rounded-md bg-[repeating-linear-gradient(90deg,transparent_0_calc(10%-3px),color-mix(in_oklab,var(--color-chart-track)_55%,transparent)_calc(10%-3px)_10%)]",
          heightClass,
        )}
      >
        {Array.from({ length: 14 }).map((_, i) => (
          <span key={i} className="h-1 flex-1 rounded-t-[2px] bg-chart-track" />
        ))}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center">
          <p className="text-sm text-fg-secondary">{emptyTitle}</p>
          <p className="max-w-xs text-xs text-fg-muted">{emptyHint}</p>
        </div>
      </div>
    );
  }

  const W = 1000;
  const H = 260;
  const max = Math.max(...data.map((d) => d.clicks));
  const x = (i: number) => ((i + 0.5) / data.length) * W;
  const y = (c: number) => H - 8 - (c / max) * (H - 24);

  const linePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.clicks).toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${W},${H - 8} L0,${H - 8} Z`;

  const fmtDay = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });

  return (
    <div className="relative">
      {/* hover guide + readout */}
      {hover !== null && data[hover] && (
        <>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-0 bottom-7 w-px bg-border-strong transition-[left] duration-150 ease-out"
            style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}
          />
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-raised px-2.5 py-1.5 text-center shadow-lift transition-[left] duration-150 ease-out"
            style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}
          >
            <p className="font-mono text-[10px] text-fg-muted">{fmtDay(data[hover].day)}</p>
            <p className="font-mono text-sm font-medium text-foreground tabular-nums">
              {data[hover].clicks.toLocaleString()} clicks
            </p>
          </div>
        </>
      )}

      {/* invisible hover columns (keyboard focusable) */}
      <div className={cn("absolute inset-0 flex", heightClass)}>
        {data.map((d, i) => (
          <button
            key={d.day + i}
            type="button"
            aria-label={`${fmtDay(d.day)}: ${d.clicks} clicks`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            className="h-full flex-1 cursor-pointer focus:outline-none"
          />
        ))}
      </div>

      {/* area + line — non-scaling stroke keeps the line crisp */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className={cn("block w-full", heightClass)}
        role="img"
        aria-label="Clicks over time"
      >
        <path
          ref={areaRef}
          d={areaPath}
          fill="color-mix(in oklab, var(--brand) 9%, transparent)"
        />
        <path
          ref={lineRef}
          d={linePath}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>

      <div className="mt-3 flex justify-between font-mono text-[10px] tracking-[0.12em] text-fg-muted">
        <span>{data.length ? fmtDay(data[0].day) : ""}</span>
        <span className="text-fg-muted/70">
          {total.toLocaleString()} total · peak {max.toLocaleString()}
        </span>
        <span>{data.length ? fmtDay(data[data.length - 1].day) : ""}</span>
      </div>
    </div>
  );
}

export { AreaChart };
