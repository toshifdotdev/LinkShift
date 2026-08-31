import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getActivity, getStats } from "@/api/dashboard";
import { CodeChip } from "@/components/ui/code-chip";
import { EmptyState, ErrorState } from "@/components/ui/empty";
import { KpiCell } from "@/components/ui/kpi-cell";
import { Lamp } from "@/components/ui/lamp";
import { FadeIn } from "@/components/ui/motion";
import { RouteStrip } from "@/components/ui/route-strip";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DEFAULT_SHORT_DOMAIN } from "@/lib/short-url";
import type { AnalyticsDays } from "@/types/api";

const RANGES: Array<{ label: string; value: AnalyticsDays }> = [
  { label: "7D", value: 7 },
  { label: "30D", value: 30 },
  { label: "90D", value: 90 },
  { label: "1Y", value: 365 },
];

function KpiRowSkeleton() {
  return (
    <div className="grid grid-cols-2 divide-x divide-border-subtle sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 px-4 py-5 sm:px-5 sm:py-6">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-1 h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

function TopLinks({
  data,
  loading,
}: {
  data: { id: string; name: string | null; shortId: string; clicks: number; domainHost?: string }[];
  loading?: boolean;
}) {
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
      <EmptyState
        marquee="Empty ledger"
        title="Your first link will live here."
        description="Top performers rank by clicks in the active window."
        className="border-none bg-transparent py-12"
      />
    );
  }
  return (
    <ol className="divide-y divide-border-subtle">
      {data.map((l, i) => (
        <li key={l.id} className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-elevated/50 sm:px-6">
          <span
            aria-hidden="true"
            className={cn(
              "size-1.5 shrink-0 rotate-45 rounded-[1px]",
              i === 0 ? "bg-brand" : "bg-fg-muted/60",
            )}
          />
          <span className="font-mono text-[10px] tracking-[0.16em] text-fg-muted tabular-nums">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-foreground">
              {l.name ?? "Untitled link"}
            </p>
            <CodeChip truncate prefix={`${l.domainHost || DEFAULT_SHORT_DOMAIN}/`} className="mt-1">
              {l.shortId}
            </CodeChip>
          </div>
          <p className="shrink-0 text-right font-mono text-sm text-foreground tabular-nums">
            {l.clicks.toLocaleString()}
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
  data: { linkName: string; shortId: string; device: string; browser: string; country: string; scannedAt: string }[];
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
      <EmptyState
        marquee="Quiet"
        title="No clicks in this window."
        description="Share a short link. Scans land here the moment they happen."
        className="border-none bg-transparent py-12"
      />
    );
  }
  return (
    <ol className="divide-y divide-border-subtle">
      {data.map((a, i) => (
        <li key={`${a.shortId}-${a.scannedAt}-${i}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-elevated/50 sm:px-6">
          <span aria-hidden="true" className="relative flex size-1.5 shrink-0">
            <span className="ls-ping absolute inset-0 rounded-full bg-success/60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-success" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] text-foreground">
              {a.linkName || "Untitled link"}
            </p>
            <p className="truncate font-mono text-[10px] tracking-[0.04em] text-fg-muted">
              {[a.device, a.browser, a.country].filter(Boolean).join(" · ") || "Unknown client"}
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
      <RouteStrip
        index="01"
        label="Overview"
        title="The desk, at a glance."
        description="Volume, activity, and what deserves your attention."
        action={
          <Segmented
            ariaLabel="Analytics period"
            value={String(days)}
            onValueChange={(v) => setDays(Number(v) as AnalyticsDays)}
            options={RANGES.map((r) => ({ value: String(r.value), label: r.label }))}
          />
        }
      />

      {stats.isError ? (
        <ErrorState
          title="Couldn't load your stats"
          message={stats.error instanceof Error ? stats.error.message : undefined}
          onRetry={() => void stats.refetch()}
        />
      ) : (
        <section aria-label="Headline numbers" className="ls-plate relative overflow-hidden">
          <span aria-hidden="true" className="ls-stripe" />
          <header className="flex items-center justify-between border-b border-border-subtle px-5 py-3 sm:px-6">
            <p className="ls-marquee">
              Headline
              <span className="text-fg-muted/70">{days}D</span>
            </p>
            <Lamp tone="success" pulse>
              Live
            </Lamp>
          </header>
          {stats.isPending ? (
            <KpiRowSkeleton />
          ) : (
            <div className="grid grid-cols-2 divide-x divide-border-subtle sm:grid-cols-4">
              <KpiCell label="Total links" value={stats.data?.totalLinks ?? 0} className="px-4 py-5 sm:px-5 sm:py-6" />
              <KpiCell label="Active" value={stats.data?.activeLinks ?? 0} className="px-4 py-5 sm:px-5 sm:py-6" />
              <KpiCell label="Inactive" value={stats.data?.inactiveLinks ?? 0} className="px-4 py-5 sm:px-5 sm:py-6" />
              <KpiCell
                label="Clicks"
                value={stats.data?.totalScans ?? 0}
                valueClassName="text-brand"
                className="px-4 py-5 sm:px-5 sm:py-6"
              />
            </div>
          )}
        </section>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <section aria-label="Top links" className="ls-plate relative overflow-hidden">
          <header className="flex items-center justify-between border-b border-border-subtle px-5 py-3 sm:px-6">
            <p className="ls-marquee">Top links</p>
            <span className="font-mono text-[9px] tracking-[0.16em] text-fg-muted uppercase">
              {days}D window
            </span>
          </header>
          <TopLinks data={stats.data?.topLinks ?? []} loading={stats.isPending} />
        </section>

        <section aria-label="Recent activity" className="ls-plate relative overflow-hidden">
          <header className="flex items-center justify-between border-b border-border-subtle px-5 py-3 sm:px-6">
            <p className="ls-marquee">Activity</p>
            <span aria-hidden="true" className="relative flex size-1.5">
              <span className="ls-ping absolute inset-0 rounded-full bg-success/60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-success" />
            </span>
          </header>
          <RecentActivity data={activity.data ?? []} loading={activity.isPending} />
        </section>
      </div>
    </FadeIn>
  );
}

export { OverviewPage };
