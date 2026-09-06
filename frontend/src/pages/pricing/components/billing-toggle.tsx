import { cn } from "@/lib/utils";

interface BillingToggleProps {
  cycle: "MONTHLY" | "YEARLY";
  onChange: (cycle: "MONTHLY" | "YEARLY") => void;
  discountPercent: number | null;
  disabled?: boolean;
}

function BillingToggle({ cycle, onChange, discountPercent, disabled }: BillingToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Billing frequency"
      className="inline-flex items-center rounded-md border border-border bg-surface p-1"
    >
      {(["MONTHLY", "YEARLY"] as const).map((option) => {
        const active = cycle === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(option)}
            className={cn(
              "relative flex h-8 cursor-pointer items-center gap-2 rounded-sm px-4 text-[13px] font-medium transition-colors duration-200",
              active ? "text-foreground" : "text-fg-muted hover:text-fg-secondary",
            )}
          >
            {active && (
              <span className="absolute inset-0 rounded-sm border border-border-strong bg-raised" />
            )}
            <span className="relative flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`size-1 rounded-full transition-colors duration-200 ${
                  active ? "bg-brand" : "bg-transparent"
                }`}
              />
              {option === "MONTHLY" ? "Monthly" : "Yearly"}
            </span>
            {option === "YEARLY" && discountPercent !== null && (
              <span className="relative font-mono text-[10px] tracking-wide text-brand uppercase">
                −{discountPercent}%
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export { BillingToggle };
