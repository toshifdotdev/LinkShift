
const SEGMENT_COLORS = ["#E8590C", "#F5F1EB", "#8A8378", "#4A453F", "#B4622D", "#6B6560"];

interface DonutItem {
  label: string;
  count: number;
}

/**
 * Ring visualization for small categorical sets (devices).
 * Segments are stroke-dasharray arcs; legend carries dot + label + count + %.
 */
function DonutChart({
  title,
  items,
  loading,
  emptyText = "No data in this period.",
  size = 168,
}: {
  title: string;
  items: DonutItem[];
  loading?: boolean;
  emptyText?: string;
  size?: number;
}) {
  const visible = items.filter((i) => i.count > 0).slice(0, SEGMENT_COLORS.length);
  const total = visible.reduce((s, i) => s + i.count, 0);

  return (
    <section aria-label={title} className="rounded-lg border border-border bg-surface">
      <header className="border-b border-border px-5 py-3.5">
        <h3 className="font-mono text-[10px] tracking-[0.18em] text-fg-secondary uppercase">{title}</h3>
      </header>

      {loading ? (
        <div className="flex items-center gap-6 px-5 py-6">
          <div className="size-32 animate-pulse rounded-full bg-elevated" />
          <div className="flex-1 space-y-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-3 w-24 animate-pulse rounded bg-elevated" />
            ))}
          </div>
        </div>
      ) : total === 0 ? (
        <p className="px-5 py-8 text-center text-xs text-fg-muted">{emptyText}</p>
      ) : (
        <div className="flex items-center gap-6 px-5 py-5">
          {/* ring */}
          <svg
            width={size}
            height={size}
            viewBox="0 0 120 120"
            role="img"
            aria-label={`${title} distribution`}
            className="-rotate-90"
          >
            <circle cx="60" cy="60" r="48" fill="none" stroke="#262626" strokeWidth="16" />
            {visible.map((item, i) => {
              const fraction = item.count / total;
              /* dash lengths on a 2π·48 circumference */
              const c = 2 * Math.PI * 48;
              const prev = visible.slice(0, i).reduce((s, v) => s + v.count, 0);
              const dash = `${(fraction * c).toFixed(2)} ${(c - fraction * c).toFixed(2)}`;
              const offset = (-((prev / total) * c)).toFixed(2);
              return (
                <circle
                  key={item.label}
                  cx="60"
                  cy="60"
                  r="48"
                  fill="none"
                  stroke={SEGMENT_COLORS[i % SEGMENT_COLORS.length]}
                  strokeWidth="16"
                  strokeDasharray={dash}
                  strokeDashoffset={offset}
                />
              );
            })}
            {/* center readout */}
            <text
              x="60"
              y="56"
              textAnchor="middle"
              className="fill-white font-mono"
              fontSize="16"
              fontWeight="600"
            >
              {total.toLocaleString()}
            </text>
            <text x="60" y="74" textAnchor="middle" className="fill-[#8A8378] font-mono" fontSize="8" letterSpacing="1.5">
              TOTAL
            </text>
          </svg>

          {/* legend */}
          <ul className="min-w-0 flex-1 space-y-2">
            {visible.map((item, i) => (
              <li key={item.label} className="flex items-center gap-2.5 text-[13px]">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-fg-secondary">{item.label}</span>
                <span className="shrink-0 font-mono text-xs text-foreground tabular-nums">
                  {Math.round((item.count / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export { DonutChart };
