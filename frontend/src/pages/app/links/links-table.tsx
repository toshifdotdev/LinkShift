import { Link2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { LinkItem } from "@/types/api";
import { LinkActionsMenu } from "./link-actions-menu";
import { formatDate, hostOf, isExpired } from "./utils";

/* Single column definition shared by the header AND every data row so
   alignment cannot drift between them. Fixed tracks for STATUS / CLICKS /
   CREATED / ACTIONS guarantee content width can never move a boundary. */
const GRID =
  "grid grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)_84px_72px_88px_84px] items-center gap-6";

/* LinkShift status mark: rotated-square indicator + mono micro-label.
   Editorial and precise — deliberately not a pill. */
function StatusMark({ link }: { link: LinkItem }) {
  const expired = isExpired(link);
  const tone = expired
    ? { dot: "bg-amber-400", text: "text-amber-300/90" }
    : link.isActive
      ? { dot: "bg-emerald-400", text: "text-fg-secondary" }
      : { dot: "bg-border-strong", text: "text-fg-muted" };
  const label = expired ? "Expired" : link.isActive ? "Active" : "Inactive";

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-2 font-mono text-[10px] tracking-[0.14em] uppercase",
        tone.text,
      )}
    >
      <span className={cn("size-1.5 rotate-45", tone.dot)} aria-hidden="true" />
      {label}
    </span>
  );
}

function LinksTable({
  links,
  loading,
  highlightId,
  onEdit,
  onDelete,
}: {
  links: LinkItem[];
  loading: boolean;
  highlightId: string | null;
  onEdit: (link: LinkItem) => void;
  onDelete: (link: LinkItem) => void;
}) {
  if (loading) {
    return (
      <div aria-label="Loading links">
        <div className="hidden md:block">
          <div className="space-y-px">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-6 border-b border-border px-5 py-4">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="hidden h-4 w-40 lg:block" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="hidden h-4 w-16 sm:block" />
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </div>
        <TableSkeletonMobile />
      </div>
    );
  }

  return (
    <>
      {/* desktop ledger */}
      <div className="hidden md:block" role="region" aria-label="Links">
        <div className={cn(GRID, "border-b border-border px-5 py-2.5")}>
          <p className="font-mono text-[10px] tracking-[0.16em] text-fg-muted uppercase">Link</p>
          <p className="font-mono text-[10px] tracking-[0.16em] text-fg-muted uppercase">Destination</p>
          <p className="font-mono text-[10px] tracking-[0.16em] text-fg-muted uppercase text-center">Status</p>
          <p className="font-mono text-[10px] tracking-[0.16em] text-fg-muted uppercase text-center">Clicks</p>
          <p className="font-mono text-[10px] tracking-[0.16em] text-fg-muted uppercase text-center">Created</p>
          <p className="font-mono text-[10px] tracking-[0.16em] text-fg-muted uppercase text-center">Actions</p>
        </div>

        <div className="border-t-0">
          {links.map((link) => (
            <div
              key={link.id}
              className={cn(
                "group",
                GRID,
                "border-b border-border px-5 py-3.5 transition-colors hover:bg-elevated/40",
                highlightId === link.id && "bg-brand/[0.06]",
              )}
            >
              {/* link identity */}
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-foreground">
                  {link.name ?? "Untitled link"}
                </p>
                <p className="truncate font-mono text-[11px]">
                  <span className="text-fg-muted">go.linkshift.in/</span>
                  <span className="text-brand">{link.shortId}</span>
                </p>
              </div>

              {/* destination */}
              <p className="truncate font-mono text-[11px] text-fg-muted" title={link.targetUrl}>
                {hostOf(link.targetUrl)}
              </p>

              <div className="text-center"><StatusMark link={link} /></div>

              <p className="text-center font-mono text-sm text-foreground tabular-nums">
                {link.clicks.toLocaleString()}
              </p>

              <p className="text-center font-mono text-[10px] text-fg-muted lg:text-[11px]">
                {formatDate(link.createdAt)}
              </p>

              <div className="flex justify-center">
                <LinkActionsMenu link={link} onEdit={onEdit} onDelete={onDelete} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* mobile cards */}
      <div className="flex flex-col gap-3 md:hidden" role="region" aria-label="Links">
        {links.map((link) => (
          <article
            key={link.id}
            className={cn(
              "rounded-lg border bg-surface p-4",
              highlightId === link.id && "border-brand/40",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {link.name ?? "Untitled link"}
                </p>
                <p className="mt-0.5 truncate font-mono text-[11px]">
                  <span className="text-fg-muted">go.linkshift.in/</span>
                  <span className="text-brand">{link.shortId}</span>
                </p>
              </div>
              <div className="text-center"><StatusMark link={link} /></div>
            </div>

            <p
              className="mt-2.5 flex items-center gap-1.5 truncate font-mono text-[11px] text-fg-muted"
              title={link.targetUrl}
            >
              <Link2 className="size-3 shrink-0" aria-hidden="true" />
              {hostOf(link.targetUrl)}
            </p>

            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <div className="flex items-center gap-4 font-mono text-[10px] text-fg-muted">
                <span className="tabular-nums">{link.clicks.toLocaleString()} clicks</span>
                <span>{formatDate(link.createdAt)}</span>
              </div>
              <LinkActionsMenu link={link} onEdit={onEdit} onDelete={onDelete} />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function TableSkeletonMobile() {
  return (
    <div className="flex flex-col gap-3 md:hidden" aria-label="Loading links">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-surface p-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-2 h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

export { LinksTable, TableSkeletonMobile };
