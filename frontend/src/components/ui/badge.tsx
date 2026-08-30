import type { HTMLAttributes, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * LinkShift status badge.
 *
 * Two modes:
 *   1. capsule (default) — a tight mono-caps pill with a 1px tonal border.
 *      Used for compact meta. Optional leading dot.
 *   2. mark — a small rotated-square indicator paired with mono caps. The
 *      editorial "ACTIVE / PENDING / EXPIRED" treatment.
 *
 * The mark variant is the visible identity of the product. The capsule
 * variant carries the same color story but in a quieter shape.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 font-mono text-[10px] font-medium tracking-[0.16em] uppercase",
  {
    variants: {
      variant: {
        neutral: "text-fg-secondary",
        ember: "text-brand",
        success: "text-emerald-400",
        warning: "text-amber-400",
        danger: "text-rose-400",
        dim: "text-fg-muted",
      },
      shape: {
        capsule: "rounded-full border px-2.5 py-0.5",
        mark: "rounded-none px-0 py-0",
      },
    },
    compoundVariants: [
      {
        variant: "neutral",
        shape: "capsule",
        className: "border-border bg-elevated",
      },
      {
        variant: "ember",
        shape: "capsule",
        className: "border-brand/30 bg-brand/10",
      },
      {
        variant: "success",
        shape: "capsule",
        className: "border-emerald-500/25 bg-emerald-500/10",
      },
      {
        variant: "warning",
        shape: "capsule",
        className: "border-amber-500/25 bg-amber-500/10",
      },
      {
        variant: "danger",
        shape: "capsule",
        className: "border-rose-500/25 bg-rose-500/10",
      },
    ],
    defaultVariants: {
      variant: "neutral",
      shape: "capsule",
    },
  },
);

interface BadgeProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children">,
    VariantProps<typeof badgeVariants> {
  /** If true, renders a 6px dot in the variant color before the text. */
  dot?: boolean;
  children: ReactNode;
}

function Badge({
  className,
  variant,
  shape,
  dot = false,
  children,
  ...props
}: BadgeProps) {
  if (shape === "mark") {
    return (
      <span
        data-slot="badge"
        data-shape="mark"
        className={cn("inline-flex items-center gap-2", className)}
        {...props}
      >
        <span
          aria-hidden="true"
          className={cn(
            "inline-block size-1.5 rotate-45",
            variant === "ember" && "bg-brand",
            variant === "success" && "bg-emerald-400",
            variant === "warning" && "bg-amber-400",
            variant === "danger" && "bg-rose-400",
            variant === "dim" && "bg-fg-muted",
            (variant === "neutral" || !variant) && "bg-fg-secondary",
          )}
        />
        <span className={cn(badgeVariants({ variant, shape }))}>{children}</span>
      </span>
    );
  }
  return (
    <span
      data-slot="badge"
      data-shape="capsule"
      className={cn(badgeVariants({ variant, shape }), className)}
      {...props}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={cn(
            "size-1 rounded-full",
            variant === "ember" && "bg-brand",
            variant === "success" && "bg-emerald-400",
            variant === "warning" && "bg-amber-400",
            variant === "danger" && "bg-rose-400",
            variant === "dim" && "bg-fg-muted",
            (variant === "neutral" || !variant) && "bg-fg-secondary",
          )}
        />
      )}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
