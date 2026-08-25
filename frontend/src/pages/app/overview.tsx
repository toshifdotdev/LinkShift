import { useQuery } from "@tanstack/react-query";
import { Link2, QrCode } from "lucide-react";
import { useState } from "react";
import { getActivity, getStats } from "@/api/dashboard";
import { PageHeader, ErrorState } from "@/components/app/page-primitives";
import { Skeleton } from "@/components/ui/skeleton";
import { shortUrl } from "@/lib/short-url";
import { useCountUp } from "@/lib/use-count-up";
import { cn } from "@/lib/utils";
import type { AnalyticsDays } from "@/types/api";

const RANGES: Array<{ label: string; value?: AnalyticsDays }> = [
  { label: "7D", value: 7 },
  { label: "30D", value: 30 },
  { label: "90D", value: 90 },
  { label: "1Y", value: 365 },
];

function RangeSelect({
  value,
  onChange,
}: {
  value: AnalyticsDays;
  onChange: (d: AnalyticsDays) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Analytics period"
      className="inline-flex items-center rounded-md border border-border bg-surface p-1"
    >
      {RANGES.map((r) => {
        const active = r.value === value;
        return (
          <button
            key={r.label}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(r.value as AnalyticsDays)}
            className={cn(
              "relative h-7 cursor-pointer rounded-sm px-2.5 font-mono text-[10px] tracking-[0.1em] uppercase transition-colors",
              active
                ? "border border-border-strong bg-raised text-foreground"
                : "text-fg-muted hover:text-fg-secondary",
            )}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  const display = useCountUp(value, true, 700);
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <p className="font-mono text-[10px] tracking-[0.16em] text-fg-muted uppercase">{label}</p>
      <p
        className={cn(
          "font-display mt-2 text-3xl font-semibold tracking-tight tabular-nums",
          accent && "text-brand",
        )}
      >
        {display.toLocaleString()}
      </p>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-3 h-9 w-16" />
    </div>
  );
}

function OverviewPage() {
  const [days, setDays] = useState<AnalyticsDays>(30);

  const stats = useQuery({
    queryKey: ["stats", days],
    queryFn: () => getStats(days),
    select: (d) => d.data,
  });

  const activity = useQuery({
    queryKey: ["activity", days],
    queryFn: () => getActivity(days),
    select: (d) => d.data,
  });

  return (
    <>
      <PageHeader
        title="Overview"
        description="Your links at a glance — volume, activity and what deserves attention."
        action={<RangeSelect value={days} onChange={setDays} />}
      />

      {stats.isError ? (
        <ErrorState
          title="Couldn't load your stats"
          message={stats.error instanceof Error ? stats.error.message : undefined}
          onRetry={() => void stats.refetch()}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.isPending
            ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
            : (() => {
                const d = stats.data!;
                return (
                  <>
                    <StatCard label="Total links" value={d.totalLinks} />
                    <StatCard label="Active" value={d.activeLinks} />
                    <StatCard label="Inactive" value={d.inactiveLinks} />
                    <StatCard label="Total clicks" value={d.totalScans} accent />
                  </>
                );
              })()}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* top links */}
        <section aria-label="Top links" className="rounded-lg border border-border bg-surface">
          <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h2 className="font-mono text-[10px] tracking-[0.18em] text-fg-secondary uppercase">
              Top links
            </h2>
            <span className="font-mono text-[9px] tracking-[0.14em] text-fg-muted uppercase">
              {days}d window
            </span>
          </header>
          {stats.isPending ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-9" />
              ))}
            </div>
          ) : !stats.data || stats.data.topLinks.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-elevated text-fg-muted">
                <Link2 className="size-4" />
              </div>
              <p className="text-sm text-fg-secondary">No links yet.</p>
              <p className="max-w-xs text-xs text-fg-muted">
                Create your first link and it will chart here.
              </p>
            </div>
          ) : (
            <ol className="divide-y divide-border">
              {stats.data!.topLinks.map((l, i) => (
                <li key={l.id} className="flex items-center gap-4 px-5 py-3.5">
                  <span className="font-mono text-[10px] text-fg-muted tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-foreground">
                      {l.name ?? "Untitled link"}
                    </p>
                    <p className="truncate font-mono text-[11px] text-brand">
                      {shortUrl(l.shortId)}
                    </p>
                  </div>
                  <p className="font-mono text-sm text-fg-secondary tabular-nums">
                    {l.clicks.toLocaleString()}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* recent activity */}
        <section aria-label="Recent activity" className="rounded-lg border border-border bg-surface">
          <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h2 className="font-mono text-[10px] tracking-[0.18em] text-fg-secondary uppercase">
              Recent activity
            </h2>
            <span className="relative flex size-1.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
            </span>
          </header>
          {activity.isPending ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8" />
              ))}
            </div>
          ) : !activity.data || activity.data.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-elevated text-fg-muted">
                <QrCode className="size-4" />
              </div>
              <p className="text-sm text-fg-secondary">No clicks recorded yet.</p>
              <p className="max-w-xs text-xs text-fg-muted">
                Share a short link — scans will land here in real time.
              </p>
            </div>
          ) : (
            <ol className="divide-y divide-border">
              {activity.data.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="size-1.5 shrink-0 rounded-full bg-brand/70" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-foreground">
                      {a.link.name ?? "Untitled link"}
                    </p>
                    <p className="truncate font-mono text-[10px] text-fg-muted">
                      {[a.browser, a.os, a.country].filter(Boolean).join(" · ") || "Unknown client"}
                    </p>
                  </div>
                  <time className="shrink-0 font-mono text-[10px] text-fg-muted">
                    {new Date(a.scannedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}

export { OverviewPage };
