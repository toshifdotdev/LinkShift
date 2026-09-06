import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";



type SkeletonVariant = "block" | "row" | "kpi" | "chart";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  
  shimmer?: boolean;
}

function Skeleton({ className, variant = "block", shimmer = false, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      data-slot="skeleton"
      data-variant={variant}
      className={cn(
        "ls-skeleton rounded-md",
        variant === "kpi" && "h-9 w-24",
        variant === "row" && "h-3 w-full",
        variant === "chart" && "h-44 w-full rounded-lg",
        shimmer && "ls-skeleton-shimmer",
        className,
      )}
      {...props}
    />
  );
}

const ROW_WIDTHS = ["w-full", "w-[92%]", "w-[97%]", "w-[88%]", "w-[95%]", "w-[90%]"];

function SkeletonRows({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div aria-hidden="true" data-slot="skeleton-rows" className={cn("flex flex-col gap-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={cn("ls-skeleton h-3 rounded", ROW_WIDTHS[i % ROW_WIDTHS.length])} />
      ))}
    </div>
  );
}

function SkeletonKpis({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div
      aria-hidden="true"
      data-slot="skeleton-kpis"
      className={cn("grid grid-cols-2 gap-4 lg:grid-cols-4", className)}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2.5">
          <div className="ls-skeleton h-2.5 w-16 rounded" />
          <div className="ls-skeleton ls-skeleton-shimmer h-7 w-24 rounded-md" />
        </div>
      ))}
    </div>
  );
}

function SkeletonChart({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      data-slot="skeleton-chart"
      className={cn("ls-skeleton ls-skeleton-shimmer h-44 w-full rounded-lg", className)}
    />
  );
}

function SkeletonPlate({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div
      aria-hidden="true"
      data-slot="skeleton-plate"
      className={cn("rounded-lg border border-border bg-surface p-5", className)}
    >
      <div className="ls-skeleton mb-4 h-2.5 w-24 rounded" />
      <SkeletonRows rows={lines} />
    </div>
  );
}

export { Skeleton, SkeletonRows, SkeletonKpis, SkeletonChart, SkeletonPlate };
