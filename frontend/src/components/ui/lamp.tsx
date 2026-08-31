import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/*
 * Lamp — the status language of LinkShift. A ringed dot paired with a word;
 * color is never the only channel, so a Lamp always carries text. The
 * `pulse` halo is reserved for genuinely live data.
 */
const lampVariants = cva(
  "inline-flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em]",
  {
    variants: {
      tone: {
        success: "text-success",
        warning: "text-warning",
        danger: "text-destructive",
        info: "text-info",
        ember: "text-brand",
        neutral: "text-fg-secondary",
        dim: "text-fg-muted",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

interface LampProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof lampVariants> {
  /** Animated halo — use only for data that is genuinely live. */
  pulse?: boolean;
}

function Lamp({ tone, pulse = false, className, children, ...props }: LampProps) {
  return (
    <span data-slot="lamp" className={cn(lampVariants({ tone }), className)} {...props}>
      <span aria-hidden="true" className="relative inline-flex size-[7px] shrink-0">
        <span className="absolute inset-0 rounded-full bg-current" />
        <span className="absolute -inset-[2.5px] rounded-full border border-current opacity-40" />
        {pulse && (
          <span className="ls-ping absolute inset-0 rounded-full bg-current" />
        )}
      </span>
      {children}
    </span>
  );
}

export { Lamp, lampVariants };
