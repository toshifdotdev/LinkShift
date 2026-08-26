import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export type PlanName = "FREE" | "STARTER" | "CREATOR" | "PRO";

const PLAN_RANK: Record<PlanName, number> = { FREE: 0, STARTER: 1, CREATOR: 2, PRO: 3 };

export interface RangeOption {
  label: string;
  days: number;
  minPlan: PlanName;
}

/** Only ranges the backend whitelist supports, with real plan gates. */
export const RANGE_OPTIONS: RangeOption[] = [
  { label: "7D", days: 7, minPlan: "FREE" },
  { label: "30D", days: 30, minPlan: "FREE" },
  { label: "90D", days: 90, minPlan: "STARTER" },
  { label: "6M", days: 180, minPlan: "STARTER" },
  { label: "1Y", days: 365, minPlan: "CREATOR" },
  { label: "3Y", days: 1095, minPlan: "PRO" },
];

export function planRank(plan: string): number {
  return PLAN_RANK[plan as PlanName] ?? 0;
}

export function rangeLocked(option: RangeOption, plan: string): boolean {
  return planRank(option.minPlan) > planRank(plan);
}

function RangeSelect({
  value,
  plan,
  onChange,
  onLocked,
}: {
  value: number;
  plan: string;
  onChange: (days: number) => void;
  onLocked: (days: number, minPlan: PlanName) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Analytics period"
      className="inline-flex flex-wrap items-center rounded-md border border-border bg-surface p-1"
    >
      {RANGE_OPTIONS.map((option) => {
        const active = value === option.days;
        const locked = rangeLocked(option, plan);
        return (
          <button
            key={option.label}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => (locked ? onLocked(option.days, option.minPlan) : onChange(option.days))}
            className={cn(
              "relative h-7 cursor-pointer rounded-sm px-2.5 font-mono text-[10px] tracking-[0.1em] uppercase transition-colors",
              active
                ? "border border-border-strong bg-raised text-foreground"
                : "text-fg-muted hover:text-fg-secondary",
            )}
          >
            {locked && <Lock className="mr-1 inline size-2.5 text-brand" aria-hidden="true" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export { RangeSelect };
