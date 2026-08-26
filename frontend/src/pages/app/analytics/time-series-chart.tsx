import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DailyPoint } from "@/types/api";

/**
 * Hand-built time-series column chart — no chart library.
 * Fully responsive (flex columns), hover guide + tooltip, ember peak.
 * Columns are pure height% — no measurement, no resize observers.
 */
function TimeSeriesChart({
  data,
  loading,
  emptyTitle = "No clicks in this period",
  emptyHint = "Share a link — activity will chart here.",
}: {
  data: DailyPoint[];
  loading?: boolean;
  emptyTitle?: string;
  emptyHint?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="flex h-56 items-end gap-[3px] sm:h-64" aria-label="Loading chart">
        {Array.from({ length: 30 }).map((_, i) => (
          <Skeleton key={i} className="flex-1" style={{ height: `${20 + ((i * 37) % 60)}%` }} />
        ))}
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.clicks, 0);
  if (total === 0) {
    return (
      <div className="flex h-56 flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-background/40 text-center">
        <p className="text-sm text-fg-secondary">{emptyTitle}</p>
        <p className="max-w-xs text-xs text-fg-muted">{emptyHint}</p>
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.clicks));

  const fmtDay = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  };

  return (
    <div className="relative">
      {/* hover guide + readout */}
      {hover !== null && data[hover] && (
        <>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-0 bottom-7 w-px bg-border-strong"
            style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}
          />
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-raised px-2.5 py-1.5 text-center shadow-lg shadow-black/40"
            style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}
          >
            <p className="font-mono text-[10px] text-fg-muted">{fmtDay(data[hover].day)}</p>
            <p className="font-mono text-sm font-medium text-foreground tabular-nums">
              {data[hover].clicks.toLocaleString()} clicks
            </p>
          </div>
        </>
      )}

      <div className="relative flex h-56 items-end gap-[2px] sm:h-64 sm:gap-[3px]">
        {data.map((d, i) => {
          const h = max === 0 ? 0 : (d.clicks / max) * 100;
          return (
            <button
              key={d.day + i}
              type="button"
              aria-label={`${fmtDay(d.day)}: ${d.clicks} clicks`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="group relative flex h-full flex-1 cursor-pointer items-end"
            >
              <span
                className={cn(
                  "block w-full rounded-t-[2px] transition-[background-color,filter] duration-150",
                  d.clicks === max && d.clicks > 0 ? "bg-brand" : "bg-fg-secondary/50 group-hover:bg-fg-secondary",
                )}
                style={{ height: `${Math.max((h / 100) * 100, 2)}%` }}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex justify-between font-mono text-[10px] tracking-[0.12em] text-fg-muted">
        <span>{data.length ? fmtDay(data[0].day) : ""}</span>
        <span className="text-fg-muted/70">{total.toLocaleString()} total</span>
        <span>{data.length ? fmtDay(data[data.length - 1].day) : ""}</span>
      </div>
    </div>
  );
}

export { TimeSeriesChart };
