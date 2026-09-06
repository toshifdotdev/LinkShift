import { Check, Minus } from "lucide-react";
import type { FlagValue } from "../plan-presentation";
import { cn } from "@/lib/utils";

function FlagIndicator({ value, className }: { value: FlagValue; className?: string }) {
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
