import { Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { useSession } from "@/auth/session";
import { cn } from "@/lib/utils";

/**
 * Inline upgrade explanation for plan-gated capabilities.
 * Explains what the feature does → why it's unavailable → what unlocks it,
 * with a path to /pricing. Never a dead disabled control.
 */
function UpgradeHint({
  feature,
  requirement,
  className,
}: {
  feature: string;
  requirement: string;
  className?: string;
}) {
  const { user } = useSession();
  const plan = user?.plan.name ?? "FREE";

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-md border border-brand/25 bg-brand/[0.05] px-3.5 py-3",
        className,
      )}
    >
      <Lock className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-snug text-foreground">
          {feature} <span className="text-fg-muted">— requires {requirement}.</span>
        </p>
        <p className="mt-0.5 text-xs leading-snug text-fg-muted">
          Your current plan is {plan.charAt(0) + plan.slice(1).toLowerCase()}.
        </p>
        <Link
          to="/pricing"
          className="mt-1.5 inline-block font-mono text-[10px] tracking-[0.14em] text-brand uppercase transition-colors hover:text-brand-hover"
        >
          View plans →
        </Link>
      </div>
    </div>
  );
}

export { UpgradeHint };
