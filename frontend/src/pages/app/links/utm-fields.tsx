import { Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { UpgradeHint } from "./upgrade-hint";
import { UTM_FIELDS, type UtmValues } from "./utm";

/**
 * The five campaign-tag inputs, shared by Create Link and Edit Link so the two dialogs
 * cannot drift. Free accounts get the upgrade hint instead of the fields; the plan rule
 * itself lives server-side in checkUtmAccess.
 */
function UtmFields({
  utm,
  onChange,
  canUseUtm,
  subtitle,
  lockedFeature = "Tag scans by campaign, source, and medium. Reported in analytics and CSV exports.",
  lockedRequirement = "Creator or above",
}: {
  utm: UtmValues;
  onChange: (next: UtmValues) => void;
  canUseUtm: boolean;
  /** Optional line under the heading, used by Edit Link to explain saved tags. */
  subtitle?: string;
  lockedFeature?: string;
  lockedRequirement?: string;
}) {
  return (
    <div className="rounded-md border border-border p-3.5">
      <p className="flex items-center gap-2 text-[13px] font-medium text-fg-secondary">
        UTM campaign tagging
        {!canUseUtm && (
          <span className="inline-flex items-center gap-1 font-mono text-[9px] tracking-[0.16em] text-brand uppercase">
            <Lock className="size-2.5" /> Creator and above
          </span>
        )}
      </p>
      {canUseUtm && subtitle && (
        <p className="mt-1.5 text-xs leading-relaxed text-fg-muted">{subtitle}</p>
      )}
      {canUseUtm ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {UTM_FIELDS.map((field) => (
            <Input
              key={field.key}
              value={utm[field.key]}
              onChange={(e) => onChange({ ...utm, [field.key]: e.target.value })}
              placeholder={field.placeholder}
              aria-label={field.ariaLabel}
              className={field.full ? "sm:col-span-2" : undefined}
            />
          ))}
          <p className="text-xs text-fg-muted sm:col-span-2">
            Appended to the destination URL. Every scan carries it.
          </p>
        </div>
      ) : (
        <div className="mt-2">
          <UpgradeHint feature={lockedFeature} requirement={lockedRequirement} />
        </div>
      )}
    </div>
  );
}

export { UtmFields };
