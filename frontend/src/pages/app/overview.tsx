import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { Lock } from "lucide-react";
import { useState } from "react";
import { getActivity, getStats } from "@/api/dashboard";
import { getMe } from "@/api/users";
import { CodeChip } from "@/components/ui/code-chip";
import { OnboardingChecklist } from "@/components/app/onboarding-checklist";
import { EmptyState, ErrorState } from "@/components/ui/empty";
import { KpiCell } from "@/components/ui/kpi-cell";
import { Lamp } from "@/components/ui/lamp";
import { rowEntry, staggerDelay } from "@/components/ui/motion";
import { RouteStrip } from "@/components/ui/route-strip";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DEFAULT_SHORT_DOMAIN } from "@/lib/short-url";
import type { AnalyticsDays } from "@/types/api";
import { defaultRangeFor, planRank, type PlanName } from "@/pages/app/analytics/range-select";

// Each range names the plan that unlocks it, the same rule the analytics
// picker applies: the API rejects windows beyond the plan with 403.
const RANGES: Array<{ label: string; days: AnalyticsDays; minPlan: PlanName }> = [
  { label: "7D", days: 7, minPlan: "FREE" },
  { label: "30D", days: 30, minPlan: "FREE" },
  { label: "90D", days: 90, minPlan: "STARTER" },
  { label: "1Y", days: 365, minPlan: "CREATOR" },
  { label: "3Y", days: 1095, minPlan: "PRO" },
];

/**
 * Formats the first-scan date for the lifetime-clicks footnote.
 *
 * Kept out of the render body because `toLocaleDateString` is impure: calling
 * it inline during render both trips the purity lint rule and re-does the
 * formatting on every render. Falls back to an em dash before any click has
 * been recorded, rather than printing today's date as if it were the first one.
 */
function formatFirstScan(firstScanAt: string | null | undefined): string {
  if (!firstScanAt) return "—";
  const parsed = new Date(firstScanAt);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

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
  hasLinks,
}: {
  data: { id: string; name: string | null; shortId: string; clicks: number; domainHost?: string }[];
  loading?: boolean;
  hasLinks?: boolean;
}) {
  const reduce = useReducedMotion();
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
    // Two different realities share this slot: a brand-new account, and an
    // account whose links simply scored nothing in the selected window. The
    // second used to say "your first link will live here" to someone with
    // links on file, which read as data loss.
    return (
      <EmptyState
        marquee={hasLinks ? "Quiet window" : "Empty ledger"}
        title={hasLinks ? "No clicks in this window." : "Your first link will live here."}
        description={
          hasLinks
            ? "Top performers rank by clicks in the active window. Widen the range or share a link to fill this ledger."
            : "Top performers rank by clicks in the active window."
        }
        className="border-none bg-transparent py-12"
      />
    );
  }
  return (
    <ol className="divide-y divide-border-subtle">
      {data.map((l, i) => (
        <motion.li
          key={l.id}
          {...rowEntry(staggerDelay(i), reduce)}
          className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-elevated/50 sm:px-6"
        >
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
            <span className="ml-2 text-[10px] tracking-[0.14em] text-fg-muted uppercase">clicks</span>
          </p>
        </motion.li>
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
  const reduce = useReducedMotion();
  if (loading) {
    return (
      <div className="px-5 py-4 sm:px-6 sm:py-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <Skeleton className="size-1.5 rounded-full" />
            <div className="flex-1 space-y-2">
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
        <motion.li
          key={`${a.shortId}-${a.scannedAt}-${i}`}
          {...rowEntry(staggerDelay(i), reduce)}
          className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-elevated/50 sm:px-6"
        >
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
        </motion.li>
      ))}
    </ol>
  );
}

function OverviewPage() {
  // Opens on the plan's widest window (not a hardcoded 30D) so the ledger and
  // the dashboard agree on first paint; see defaultRangeFor.
  //
  // `days` is derived, not stored. It previously lived in state and was widened
  // by an effect once `me` resolved, which is a setState inside an effect: a
  // cascading render, and a window that was briefly wrong on first paint. Here
  // the plan default applies until the owner picks a range, after which their
  // choice wins — no effect, no ref, no intermediate state.
  const [pickedRange, setPickedRange] = useState<AnalyticsDays | null>(null);

  // ["me"] is a shared cache key with auth/session.tsx, which stores the
  // unwrapped MeUser. Caching the raw { success, data } wrapper here meant
  // whichever fetch ran last decided the cache shape, and the shell's
  // user?.plan.name then read .name off undefined and crashed the whole app.
  const me = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await getMe()).data,
  });
  const plan = me.data?.plan.name ?? "FREE";

  // The plan default until the owner chooses; their choice wins from then on.
  const days =
    pickedRange ??
    (defaultRangeFor(plan, RANGES.map((r) => ({ ...r, days: r.days }))) as AnalyticsDays);

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
      <RouteStrip
        index="01"
        label="Overview"
        title="The desk, at a glance."
        description="Volume, activity, and what deserves your attention."
        action={
          <Segmented
            ariaLabel="Analytics period"
            value={String(days)}
            onValueChange={(v) => {
              const value = Number(v) as AnalyticsDays;
              // Ranges beyond the plan are rejected by the API with a 403,
              // which used to blank the whole overview: stats, top links and
              // activity all hang off this request. Gate them in the picker
              // instead, the way the analytics page already does.
              const range = RANGES.find((r) => r.days === value);
              if (range && planRank(range.minPlan) > planRank(plan)) return;
              setPickedRange(value);
            }}
            options={RANGES.map((r) => ({
              value: String(r.days),
              label: (
                <>
                  {planRank(r.minPlan) > planRank(plan) && (
                    <Lock className="size-3 text-brand" aria-hidden="true" />
                  )}
                  {r.label}
                </>
              ),
            }))}
          />
        }
      />

      {me.data?.onboarding ? (
        <div className="mt-8">
          <OnboardingChecklist state={me.data.onboarding} />
        </div>
      ) : null}

      {stats.isError ? (
        <ErrorState
          className="mt-8"
          title="Couldn't load your stats"
          message={stats.error instanceof Error ? stats.error.message : undefined}
          onRetry={() => void stats.refetch()}
        />
      ) : (
        <section aria-label="Headline numbers" className="mt-8 ls-plate relative overflow-hidden">
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
            <>
              <div className="grid grid-cols-2 divide-x divide-border-subtle sm:grid-cols-3 lg:grid-cols-5">
                <KpiCell label="Total links" value={stats.data?.totalLinks ?? 0} className="px-4 py-5 sm:px-5 sm:py-6" />
                <KpiCell label="Active" value={stats.data?.activeLinks ?? 0} className="px-4 py-5 sm:px-5 sm:py-6" />
                <KpiCell label="Inactive" value={stats.data?.inactiveLinks ?? 0} className="px-4 py-5 sm:px-5 sm:py-6" />
                <KpiCell
                  label="Clicks"
                  value={stats.data?.totalScans ?? 0}
                  previous={stats.data?.prevTotalScans}
                  valueClassName="text-brand"
                  className="px-4 py-5 sm:px-5 sm:py-6"
                />
                <KpiCell
                  label="Unique clicks"
                  value={stats.data?.uniqueScans ?? 0}
                  previous={stats.data?.prevUniqueScans}
                  className="px-4 py-5 sm:px-5 sm:py-6"
                />
              </div>
              {(stats.data?.allTimeTotalScans ?? 0) > (stats.data?.totalScans ?? 0) && (
                <p className="border-t border-border-subtle px-5 py-3 text-[11px] leading-relaxed text-fg-muted sm:px-6">
                  {(stats.data?.allTimeTotalScans ?? 0).toLocaleString()} human
                  clicks on file since {formatFirstScan(stats.data?.firstScanAt)}
                  .{" "}This window shows {days}D; the links ledger counts every
                  click ever recorded.
                </p>
              )}
              {(stats.data?.botRequests ?? 0) > 0 && (
                <p className="border-t border-border-subtle px-5 py-3 text-[11px] leading-relaxed text-fg-muted sm:px-6">
                  {(stats.data?.botRequests ?? 0).toLocaleString()} bot request
                  {(stats.data?.botRequests ?? 0) === 1 ? "" : "s"} recorded and excluded
                  — chat link previews, email scanners, crawlers and monitors.
                  They are stored, not counted, and never charged against your
                  plan.
                </p>
              )}
            </>
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
          <TopLinks
            data={stats.data?.topLinks ?? []}
            loading={stats.isPending}
            hasLinks={(stats.data?.totalLinks ?? 0) > 0}
          />
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
    </>
  );
}

export { OverviewPage };
