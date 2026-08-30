import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getActivity, getStats } from "@/api/dashboard";
import { PageHeader, ErrorState } from "@/components/app/page-primitives";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FadeIn, NumberTick } from "@/components/ui/motion";
import { cn } from "@/lib/utils";
import type { AnalyticsDays } from "@/types/api";

const RANGES: Array<{ label: string; value?: AnalyticsDays }> = [
  { label: "7D", value: 7 },
  { label: "30D", value: 30 },
  { label: "90D", value: 90 },
  { label: "1Y", value: 365 },
];

/**
 * The editorial range picker.
 *
 * The active option is marked by a 1px ember hairline that tracks beneath
 * the mono label — the same hairline language used by the sidebar's
 * active nav item and the "current plan" stripe.
 */
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
              "relative h-7 cursor-pointer rounded-sm px-2.5 font-mono text-[10px] tracking-[0.14em] uppercase transition-colors duration-200",
              active ? "text-foreground" : "text-fg-muted hover:text-fg-secondary",
            )}
          >
            <span className="relative z-10">{r.label}</span>
            {active && (
              <span
                aria-hidden="true"
                className="absolute right-2.5 bottom-1 left-2.5 h-px bg-brand"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

function KpiRowSkeleton() {
  return (
    <div className="grid grid-cols-2 divide-x divide-border/60 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 px-4 py-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-1 h-9 w-16" />
        </div>
      ))}
    </div>
  );
}

function KpiRow({
  data,
  loading,
}: {
  data?: { totalLinks: number; activeLinks: number; inactiveLinks: number; totalScans: number };
  loading?: boolean;
}) {
  if (loading || !data) {
    return <KpiRowSkeleton />;
  }
  return (
    <div className="grid grid-cols-2 divide-x divide-border/60 sm:grid-cols-4">
      <div className="flex flex-col gap-2 px-4 py-5 sm:px-5 sm:py-6">
        <p className="ls-marquee">Total links</p>
        <NumberTick
          value={data.totalLinks}
          className="font-display text-3xl leading-none font-medium tracking-[-0.02em] tabular-nums text-foreground"
        />
      </div>
      <div className="flex flex-col gap-2 px-4 py-5 sm:px-5 sm:py-6">
        <p className="ls-marquee">Active</p>
        <NumberTick
          value={data.activeLinks}
          className="font-display text-3xl leading-none font-medium tracking-[-0.02em] tabular-nums text-foreground"
        />
      </div>
      <div className="flex flex-col gap-2 px-4 py-5 sm:px-5 sm:py-6">
        <p className="ls-marquee">Inactive</p>
        <NumberTick
          value={data.inactiveLinks}
          className="font-display text-3xl leading-none font-medium tracking-[-0.02em] tabular-nums text-foreground"
        />
      </div>
      <div className="flex flex-col gap-2 px-4 py-5 sm:px-5 sm:py-6">
        <p className="ls-marquee">
          <span className="text-brand">Clicks</span>
          <span className="ml-1 text-fg-muted">{`· ${data.totalScans >= 0 ? "" : ""}`}</span>
        </p>
        <NumberTick
          value={data.totalScans}
          className="font-display text-3xl leading-none font-medium tracking-[-0.02em] tabular-nums text-brand"
        />
      </div>
    </div>
  );
}

function rankTone(i: number): string {
  if (i === 0) return "bg-brand";
  if (i === 1) return "bg-amber-400";
  if (i === 2) return "bg-emerald-400";
  return "bg-fg-muted";
}

function TopLinks({ data, loading }: { data: { id: string; name: string | null; shortId: string; clicks: number }[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="px-5 py-4 sm:px-6 sm:py-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3">
            <Skeleton className="size-1.5 rotate-45" />
            <Skeleton variant="row" className="max-w-[18rem]" />
            <Skeleton variant="row" className="ml-auto w-16" />
          </div>
        ))}
      </div>
    );
  }
  if (data.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="font-mono text-[10px] tracking-[0.18em] text-fg-muted uppercase">
          Empty ledger
        </p>
        <p className="mt-3 font-display text-[15px] font-medium tracking-tight text-foreground">
          Your first link will live here.
        </p>
        <p className="mx-auto mt-2 max-w-xs text-[13px] leading-snug text-fg-muted">
          Top performers rank by clicks in the active window.
        </p>
      </div>
    );
  }
  return (
    <ol className="divide-y divide-border/60">
      {data.map((l, i) => (
        <li
          key={l.id}
          className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-elevated/50 sm:px-6"
        >
          {/* The rank marker: a small rotated square in the rank-1 ember,
             a soft amber at rank 2, a soft emerald at rank 3, a quiet
             muted for the rest. */}
          <span
            aria-hidden="true"
            className={cn(
              "size-1.5 shrink-0 rotate-45 rounded-[1px] transition-transform group-hover:scale-150",
              rankTone(i),
            )}
          />
          <span className="font-mono text-[10px] tracking-[0.16em] text-fg-muted tabular-nums">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-medium text-foreground">
              {l.name ?? "Untitled link"}
            </p>
            <p className="truncate font-mono text-[11px] tracking-[0.04em] text-fg-muted">
              <span className="text-fg-muted/70">go.linkshift.in/</span>
              <span className="text-foreground">{l.shortId}</span>
            </p>
          </div>
          <p className="shrink-0 text-right font-mono text-sm tabular-nums">
            <span className="text-foreground">{l.clicks.toLocaleString()}</span>
            <span className="ml-1.5 text-[10px] tracking-[0.14em] text-fg-muted uppercase">clicks</span>
          </p>
        </li>
      ))}
    </ol>
  );
}

function RecentActivity({
  data,
  loading,
}: {
  data: { id: string; link: { name: string | null; shortId: string }; browser: string | null; os: string | null; country: string | null; scannedAt: string }[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="px-5 py-4 sm:px-6 sm:py-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2.5">
            <Skeleton className="size-1.5 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-44" />
              <Skeleton className="h-2.5 w-28" />
            </div>
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
    );
  }
  if (data.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="font-mono text-[10px] tracking-[0.18em] text-fg-muted uppercase">
          Quiet
        </p>
        <p className="mt-3 font-display text-[15px] font-medium tracking-tight text-foreground">
          No clicks in this window.
        </p>
        <p className="mx-auto mt-2 max-w-xs text-[13px] leading-snug text-fg-muted">
          Share a short link. Scans land here the moment they happen.
        </p>
      </div>
    );
  }
  return (
    <ol className="divide-y divide-border/60">
      {data.map((a) => (
        <li key={a.id} className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-elevated/50 sm:px-6">
          <span
            aria-hidden="true"
            className="relative flex size-1.5 shrink-0"
          >
            <span className="absolute inset-0 rounded-full bg-emerald-400/60 ls-ping" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] text-foreground">
              {a.link.name ?? "Untitled link"}
            </p>
            <p className="truncate font-mono text-[10px] tracking-[0.04em] text-fg-muted">
              {[a.browser, a.os, a.country].filter(Boolean).join(" · ") || "Unknown client"}
            </p>
          </div>
          <time className="shrink-0 font-mono text-[10px] tracking-[0.14em] text-fg-muted">
            {new Date(a.scannedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>
        </li>
      ))}
    </ol>
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
    <FadeIn>
      <PageHeader
        title="Overview"
        description="What your links did today. Volume, activity, and what deserves your attention."
        action={<RangeSelect value={days} onChange={setDays} />}
      />

      {stats.isError ? (
        <ErrorState
          title="Couldn't load your stats"
          message={stats.error instanceof Error ? stats.error.message : undefined}
          onRetry={() => void stats.refetch()}
        />
      ) : (
        <section
          aria-label="Headline numbers"
          className="relative overflow-hidden rounded-xl border border-border bg-surface"
        >
          <span aria-hidden="true" className="ls-stripe" />
          <header className="flex items-center justify-between border-b border-border/60 px-5 py-3 sm:px-6">
            <p className="ls-marquee">
              <span className="pl-0">Headline</span>
              <span className="ml-1.5 text-fg-muted/70">{days}D</span>
            </p>
            <Badge shape="mark" variant="ember">
              Live
            </Badge>
          </header>
          <KpiRow data={stats.data} loading={stats.isPending} />
        </section>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        {/* top links */}
        <section
          aria-label="Top links"
          className="relative overflow-hidden rounded-xl border border-border bg-surface"
        >
          <span aria-hidden="true" className="ls-stripe" />
          <header className="flex items-center justify-between border-b border-border/60 px-5 py-3 sm:px-6">
            <p className="ls-marquee">Top links</p>
            <span className="font-mono text-[9px] tracking-[0.16em] text-fg-muted uppercase">
              {days}D window
            </span>
          </header>
          <TopLinks data={stats.data?.topLinks ?? []} loading={stats.isPending} />
        </section>

        {/* recent activity */}
        <section
          aria-label="Recent activity"
          className="relative overflow-hidden rounded-xl border border-border bg-surface"
        >
          <span aria-hidden="true" className="ls-stripe" />
          <header className="flex items-center justify-between border-b border-border/60 px-5 py-3 sm:px-6">
            <p className="ls-marquee">Activity</p>
            <span
              aria-hidden="true"
              className="relative flex size-1.5"
            >
              <span className="absolute inset-0 rounded-full bg-emerald-400/60 ls-ping" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
            </span>
          </header>
          <RecentActivity data={activity.data ?? []} loading={activity.isPending} />
        </section>
      </div>
    </FadeIn>
  );
}

export { OverviewPage };
