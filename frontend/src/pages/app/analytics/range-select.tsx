import { Lock } from "lucide-react";
import { Segmented } from "@/components/ui/segmented";

export type PlanName = "FREE" | "STARTER" | "CREATOR" | "PRO" | "ENTERPRISE";

const PLAN_RANK: Record<PlanName, number> = { FREE: 0, STARTER: 1, CREATOR: 2, PRO: 3, ENTERPRISE: 4 };

export interface RangeOption {
  label: string;
  days: number;
  minPlan: PlanName;
}


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
    <Segmented
      ariaLabel="Analytics period"
      value={String(value)}
      onValueChange={(v) => {
        const option = RANGE_OPTIONS.find((r) => String(r.days) === v);
        if (!option) return;
        if (rangeLocked(option, plan)) onLocked(option.days, option.minPlan);
        else onChange(option.days);
      }}
      options={RANGE_OPTIONS.map((option) => ({
        value: String(option.days),
        label: (
          <>
            {rangeLocked(option, plan) && (
              <Lock className="size-3 text-brand" aria-hidden="true" />
            )}
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase">
              {option.label}
            </span>
          </>
        ),
      }))}
    />
  );
}

export { RangeSelect };
