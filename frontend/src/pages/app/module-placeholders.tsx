import { BarChart3, CreditCard, Globe, QrCode, Settings2 } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { EmptyState, PageHeader } from "@/components/app/page-primitives";
import { useSearchParams } from "react-router-dom";

interface ModuleSpec {
  title: string;
  description: string;
  icon: ReactNode;
  planned: readonly string[];
  primaryLabel: string;
  primaryTo: string;
}

const MODULES = {
  qr: {
    title: "QR Codes",
    description:
      "Every link ships with a scannable twin — styled per campaign, always in sync with its destination.",
    icon: <QrCode className="size-5" />,
    planned: [
      "Generate QR codes for any link",
      "Patterns, eye styles & colors",
      "Logo embedding",
      "PNG download",
      "Delete & regenerate",
    ],
    primaryLabel: "Back to overview",
    primaryTo: "/app",
  },
  analytics: {
    title: "Analytics",
    description:
      "Click-level truth per link: browsers, devices, geography and UTM performance — within your plan's window.",
    icon: <BarChart3 className="size-5" />,
    planned: [
      "Per-link breakdown dashboards",
      "Browser / OS / device splits",
      "Country & city geography",
      "UTM source · medium · campaign",
      "CSV export (Creator+)",
      "Plan-window range control",
    ],
    primaryLabel: "Back to overview",
    primaryTo: "/app",
  },
  domains: {
    title: "Domains",
    description:
      "Put your name on every link. Add a domain, verify via DNS, and shift on your own turf.",
    icon: <Globe className="size-5" />,
    planned: [
      "Connect custom domains",
      "CNAME verification flow",
      "Default domain selection",
      "Plan-quota awareness",
      "Remove domains safely",
    ],
    primaryLabel: "Back to overview",
    primaryTo: "/app",
  },
  billing: {
    title: "Billing",
    description:
      "Your subscription, billing cycle and plan changes — managed against the live provider.",
    icon: <CreditCard className="size-5" />,
    planned: [
      "Current plan & period status",
      "Upgrade / downgrade with schedule visibility",
      "Monthly ↔ yearly switching",
      "Cancellation at period end",
      "Full marketing comparison on /pricing",
    ],
    primaryLabel: "View plans",
    primaryTo: "/pricing",
  },
  settings: {
    title: "Settings",
    description: "Your account identity and dangerous edges — handled with the care they deserve.",
    icon: <Settings2 className="size-5" />,
    planned: [
      "Profile name & avatar",
      "Avatar upload / removal",
      "Session & plan summary",
      "Deliberate account deletion flow",
    ],
    primaryLabel: "Back to overview",
    primaryTo: "/app",
  },
} satisfies Record<string, ModuleSpec>;

/** Designed placeholder for product modules built in upcoming phases. */
function ModulePage({
  module,
  index,
  linkContext,
}: {
  module: ModuleSpec;
  index: string;
  linkContext?: string | null;
}) {
  return (
    <>
      <PageHeader title={module.title} description={module.description} />
      <EmptyState
        icon={<span className="text-brand">{module.icon}</span>}
        title={`${module.title} is on the bench`}
        description="This module is next in the build queue — the shell you're looking at is its foundation."
        action={
          <Link
            to={module.primaryTo}
            className="inline-flex h-9 items-center rounded-md border border-brand/40 bg-brand/[0.09] px-4 font-mono text-[11px] font-medium tracking-[0.08em] text-foreground uppercase transition-colors hover:border-brand/75 hover:bg-brand/[0.16]"
          >
            {module.primaryLabel}
          </Link>
        }
      />
      {linkContext && (
        <p className="mb-4 flex items-center gap-2 rounded-md border border-brand/25 bg-brand/[0.05] px-4 py-2.5 font-mono text-[11px] text-fg-secondary">
          <span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />
          Requested for link <span className="text-brand">{linkContext}</span> — this module will
          open in that context once it ships.
        </p>
      )}

      <div className="mt-6 rounded-lg border border-border bg-surface">
        <p className="border-b border-border px-5 py-3 font-mono text-[10px] tracking-[0.18em] text-fg-secondary uppercase">
          Planned capabilities · {index}
        </p>
        <ul className="grid gap-x-8 gap-y-2.5 px-5 py-4 sm:grid-cols-2">
          {module.planned.map((item) => (
            <li key={item} className="flex items-center gap-2.5 text-[13px] text-fg-secondary">
              <span className="size-1 rounded-full bg-brand/70" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function QrPlaceholder() {
  const [params] = useSearchParams();
  return <ModulePage module={MODULES.qr} index="03" linkContext={params.get("link")} />;
}
function AnalyticsPlaceholder() {
  const [params] = useSearchParams();
  return <ModulePage module={MODULES.analytics} index="04" linkContext={params.get("link")} />;
}
function DomainsPlaceholder() {
  return <ModulePage module={MODULES.domains} index="05" />;
}
function BillingPlaceholder() {
  return <ModulePage module={MODULES.billing} index="06" />;
}
function SettingsPlaceholder() {
  return <ModulePage module={MODULES.settings} index="07" />;
}

export {
  QrPlaceholder,
  AnalyticsPlaceholder,
  DomainsPlaceholder,
  BillingPlaceholder,
  SettingsPlaceholder,
};
