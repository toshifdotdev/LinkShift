import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type SkeletonVariant = "block" | "row" | "kpi" | "chart";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  /** If true, an ember hairline sweeps L→R over the block. Default false. */
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

export { Skeleton };
