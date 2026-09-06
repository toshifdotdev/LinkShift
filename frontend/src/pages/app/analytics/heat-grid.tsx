import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface HeatPoint {
  
  dow: number;
  hour: number;
  count: number;
}


const ROWS: Array<{ label: string; full: string; dow: number }> = [
  { label: "Mon", full: "Monday", dow: 1 },
  { label: "Tue", full: "Tuesday", dow: 2 },
  { label: "Wed", full: "Wednesday", dow: 3 },
  { label: "Thu", full: "Thursday", dow: 4 },
  { label: "Fri", full: "Friday", dow: 5 },
  { label: "Sat", full: "Saturday", dow: 6 },
  { label: "Sun", full: "Sunday", dow: 0 },
];

const fmtHour = (h: number) => `${String(h).padStart(2, "0")}:00`;


function HeatGrid({
  title,
  data,
  loading,
  emptyText = "No clicks in this period.",
  className,
}: {
  title: string;
  data: HeatPoint[];
  loading?: boolean;
  emptyText?: string;
  className?: string;
}) {
  const [hover, setHover] = useState<HeatPoint | null>(null);

  const cells = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of data) map.set(`${p.dow}:${p.hour}`, (map.get(`${p.dow}:${p.hour}`) ?? 0) + p.count);
    return map;
  }, [data]);

  const total = data.reduce((s, p) => s + p.count, 0);
  const max = useMemo(() => Math.max(...Array.from(cells.values()), 1), [cells]);
  const peak = useMemo(
    () => data.reduce<HeatPoint | null>((best, p) => (best === null || p.count > best.count ? p : best), null),
    [data],
  );
  const dataKey = data.map((p) => `${p.dow}:${p.hour}:${p.count}`).join("|");

  const readout = (p: HeatPoint | null) =>
    p
      ? `${ROWS.find((r) => r.dow === p.dow)?.full ?? ""} ${fmtHour(p.hour)} UTC · ${p.count.toLocaleString()} clicks`
      : "";

  return (
    <section aria-label={title} className={cn("ls-plate", className)}>
      <header className="flex items-baseline justify-between gap-3 border-b border-border-subtle px-5 py-3">
        <p className="ls-marquee">{title}</p>
        <p className="font-mono text-[10px] tracking-[0.12em] text-fg-muted">UTC</p>
      </header>

      {loading ? (
        <div className="space-y-[3px] px-5 py-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-[3px]">
              <Skeleton className="h-3 w-7 shrink-0" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      ) : total === 0 ? (
        <p className="px-5 py-8 text-center text-xs text-fg-muted">{emptyText}</p>
      ) : (
        <>
          <div
            key={dataKey}
            className="ls-heat-fade space-y-[3px] px-5 py-4"
            role="img"
            aria-label={`${title}: ${peak ? `busiest is ${readout(peak)}` : "no activity"}`}
          >
            {ROWS.map((row) => (
              <div key={row.dow} className="flex items-center gap-[3px]">
                <span className="w-7 shrink-0 font-mono text-[10px] text-fg-muted">{row.label}</span>
                {Array.from({ length: 24 }).map((_, hour) => {
                  const count = cells.get(`${row.dow}:${hour}`) ?? 0;
                  const cell: HeatPoint = { dow: row.dow, hour, count };
                  return (
                    <span
                      key={hour}
                      onMouseEnter={() => setHover(cell)}
                      onMouseLeave={() => setHover(null)}
                      className={cn(
                        "aspect-square min-w-0 flex-1 rounded-[2px]",
                        count === 0 && "bg-chart-track/40",
                      )}
                      style={
                        count > 0
                          ? {
                              background: `color-mix(in oklab, var(--brand) ${Math.round(18 + (count / max) * 82)}%, transparent)`,
                              boxShadow: hover && hover.dow === row.dow && hover.hour === hour ? "inset 0 0 0 1px var(--border-strong)" : undefined,
                            }
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            ))}

            <div className="flex items-center gap-[3px]">
              <span className="w-7 shrink-0" aria-hidden="true" />
              <div className="flex flex-1 justify-between font-mono text-[10px] tracking-[0.12em] text-fg-muted">
                <span>00</span>
                <span>06</span>
                <span>12</span>
                <span>18</span>
                <span>23</span>
              </div>
            </div>
          </div>

          
          <footer className="border-t border-border-subtle px-5 py-2.5">
            <p className="truncate font-mono text-[10px] tracking-[0.12em] text-fg-muted tabular-nums">
              {hover ? readout(hover) : peak ? `PEAK · ${readout(peak)}` : ""}
            </p>
          </footer>
        </>
      )}
    </section>
  );
}

export { HeatGrid };
