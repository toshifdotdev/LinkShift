import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface BreakdownItem {
  label: string;
  count: number;
}


function BreakdownPanel({
  title,
  items,
  loading,
  emptyText = "No data in this period.",
  maxItems = 6,
  className,
}: {
  title: string;
  items: BreakdownItem[];
  loading?: boolean;
  emptyText?: string;
  maxItems?: number;
  className?: string;
}) {
  const visible = items.slice(0, maxItems);
  const max = Math.max(...visible.map((v) => v.count), 1);
  const total = visible.reduce((sum, v) => sum + v.count, 0);
  const itemsKey = items.map((i) => `${i.label}:${i.count}`).join("|");

  return (
    <section
      aria-label={title}
      className={cn("ls-plate", className)}
    >
      <header className="border-b border-border-subtle px-5 py-3">
        <p className="ls-marquee">{title}</p>
      </header>

      {loading ? (
        <div className="space-y-3 px-5 py-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-3 w-20 shrink-0" />
              <Skeleton className="h-1.5 flex-1" />
              <Skeleton className="h-3 w-8 shrink-0" />
            </div>
          ))}
        </div>
      ) : visible.length === 0 || (visible.length === 1 && visible[0].label === "Unknown" && visible[0].count === 0) ? (
        <p className="px-5 py-6 text-center text-xs text-fg-muted">{emptyText}</p>
      ) : (
        <ul key={itemsKey} className="divide-y divide-border-subtle">
          {visible.map((item, i) => (
            <li key={item.label + i} className="px-5 py-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <p
                  className={cn(
                    "min-w-0 truncate text-[13px]",
                    i === 0 ? "text-foreground" : "text-fg-secondary",
                  )}
                >
                  {item.label}
                </p>
                <p className="shrink-0 font-mono text-xs text-fg-secondary tabular-nums">
                  {total > 0 ? `${Math.round((item.count / total) * 100)}%` : ""}
                  <span className="ml-1.5 text-foreground">{item.count.toLocaleString()}</span>
                </p>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-elevated">
                <div
                  className={cn(
                    "ls-bar-grow h-full rounded-full",
                    i === 0 ? "bg-brand" : "bg-fg-secondary/50",
                  )}
                  style={{ width: `${Math.max((item.count / max) * 100, 2)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export { BreakdownPanel };
