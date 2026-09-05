import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface HourPoint {
  hour: number;
  count: number;
}

const fmtHour = (h: number) => `${String(h).padStart(2, "0")}:00`;

/**
 * Hour-of-day column chart (24 slots, UTC buckets). Bar intensity encodes
 * relative volume — the peak hour burns full ember. Columns grow in with a
 * staggered ls-col-grow entrance; the layer is keyed by dataset so a
 * range/link change replays it once. Reduced motion snaps (CSS).
 */
function HourBars({
  data,
  loading,
  emptyTitle = "No clicks in this period",
  emptyHint = "Share a link and hourly activity will chart here.",
  heightClass = "h-40",
}: {
  data: HourPoint[];
  loading?: boolean;
  emptyTitle?: string;
  emptyHint?: string;
  heightClass?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const slots = useMemo(() => {
    const arr: HourPoint[] = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
    for (const row of data) {
      if (row.hour >= 0 && row.hour < 24) arr[row.hour].count += row.count;
    }
    return arr;
  }, [data]);

  const total = slots.reduce((s, d) => s + d.count, 0);
  const itemsKey = slots.map((s) => `${s.hour}:${s.count}`).join("|");

  if (loading) {
    return (
      <div className={cn("flex items-end gap-[3px]", heightClass)} aria-label="Loading chart">
        {Array.from({ length: 24 }).map((_, i) => (
          <Skeleton key={i} className="flex-1" style={{ height: `${20 + ((i * 29) % 60)}%` }} />
        ))}
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className={cn("relative flex items-end gap-[3px]", heightClass)}>
        {Array.from({ length: 24 }).map((_, i) => (
          <span key={i} className="h-[3px] flex-1 rounded-t-[2px] bg-chart-track" />
        ))}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center">
          <p className="text-sm text-fg-secondary">{emptyTitle}</p>
          <p className="max-w-xs text-xs text-fg-muted">{emptyHint}</p>
        </div>
      </div>
    );
  }

  const max = Math.max(...slots.map((s) => s.count), 1);
  const peakHour = slots.reduce((best, s) => (s.count > best.count ? s : best), slots[0]);

  return (
    <div className="relative">
      {/* hover guide + readout */}
      {hover !== null && (
        <>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-0 bottom-6 w-px bg-border-strong transition-[left] duration-150 ease-out"
            style={{ left: `${((hover + 0.5) / 24) * 100}%` }}
          />
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-raised px-2.5 py-1.5 text-center shadow-lift transition-[left] duration-150 ease-out"
            style={{ left: `${((hover + 0.5) / 24) * 100}%` }}
          >
            <p className="font-mono text-[10px] text-fg-muted">{fmtHour(hover)} UTC</p>
            <p className="font-mono text-sm font-medium text-foreground tabular-nums">
              {slots[hover].count.toLocaleString()} clicks
            </p>
          </div>
        </>
      )}

      {/* columns — intensity encodes volume; keyed so dataset change replays entrance */}
      <div key={itemsKey} className={cn("pointer-events-none flex items-end gap-[3px]", heightClass)}>
        {slots.map((s, i) =>
          s.count === 0 ? (
            <span key={s.hour} className="h-[3px] flex-1 rounded-t-[2px] bg-chart-track" />
          ) : (
            <span
              key={s.hour}
              className="ls-col-grow flex-1 rounded-t-[2px] transition-opacity duration-150"
              style={{
                height: `${Math.max((s.count / max) * 100, 4)}%`,
                background: `color-mix(in oklab, var(--brand) ${Math.round(25 + (s.count / max) * 75)}%, transparent)`,
                opacity: hover === null || hover === i ? 1 : 0.75,
                animationDelay: `${Math.min(i * 12, 280)}ms`,
              }}
            />
          ),
        )}
      </div>

      {/* invisible hover columns (keyboard focusable) */}
      <div className={cn("absolute inset-x-0 top-0 flex", heightClass)}>
        {slots.map((s) => (
          <button
            key={s.hour}
            type="button"
            aria-label={`${fmtHour(s.hour)} UTC: ${s.count} clicks`}
            onMouseEnter={() => setHover(s.hour)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(s.hour)}
            onBlur={() => setHover(null)}
            className="h-full flex-1 cursor-pointer focus:outline-none"
          />
        ))}
      </div>

      <div className="mt-3 flex justify-between font-mono text-[10px] tracking-[0.12em] text-fg-muted">
        <span>00 UTC</span>
        <span className="text-fg-muted/70">
          peak {fmtHour(peakHour.hour)} · {peakHour.count.toLocaleString()}
        </span>
        <span>23 UTC</span>
      </div>
    </div>
  );
}

export { HourBars };
