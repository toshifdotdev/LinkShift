import { BarChart3, CreditCard, Globe, Link2, QrCode, Settings2 } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { EmptyState, PageHeader } from "@/components/app/page-primitives";

interface ModuleSpec {
  title: string;
  description: string;
  icon: ReactNode;
  planned: readonly string[];
  primaryLabel: string;
  primaryTo: string;
}

const MODULES = {
  links: {
    title: "Links",
    description:
      "Create, edit and inspect every short link — destinations, slugs, expiry, protection and UTM tagging.",
    icon: <Link2 className="size-5" />,
    planned: [
      "Create with custom slugs & domains",
      "Edit destinations without breaking shares",
      "Password protection & expiry dates",
      "UTM campaign tagging (Creator+)",
      "Search, filter, sort & pagination",
      "Copy, QR and per-link analytics",
    ],
    primaryLabel: "Back to overview",
    primaryTo: "/app",
  },
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
}: {
  module: ModuleSpec;
  index: string;
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

function LinksPlaceholder() {
  return <ModulePage module={MODULES.links} index="02" />;
}
function QrPlaceholder() {
  return <ModulePage module={MODULES.qr} index="03" />;
}
function AnalyticsPlaceholder() {
  return <ModulePage module={MODULES.analytics} index="04" />;
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
  LinksPlaceholder,
  QrPlaceholder,
  AnalyticsPlaceholder,
  DomainsPlaceholder,
  BillingPlaceholder,
  SettingsPlaceholder,
};
