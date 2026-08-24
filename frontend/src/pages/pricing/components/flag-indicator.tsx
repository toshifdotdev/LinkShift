import { Check, Minus } from "lucide-react";
import type { FlagValue } from "../plan-presentation";
import { cn } from "@/lib/utils";

function FlagIndicator({ value, className }: { value: FlagValue; className?: string }) {
  if (value === "soon") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand/10 px-2 py-0.5 font-mono text-[9px] tracking-[0.14em] text-brand uppercase",
          className,
        )}
      >
        Soon
        <span className="size-1 rounded-full bg-brand" aria-hidden="true" />
      </span>
    );
  }
  if (value) {
    return (
      <span
        aria-label="Included"
        className={cn("inline-flex size-6 items-center justify-center", className)}
      >
        <Check className="size-4 text-brand" strokeWidth={2.25} aria-hidden="true" />
      </span>
    );
  }
  return (
    <span
      aria-label="Not included"
      className={cn("inline-flex size-6 items-center justify-center text-fg-muted", className)}
    >
      <Minus className="size-3.5" aria-hidden="true" />
    </span>
  );
}

export { FlagIndicator };
