import type { ReactNode } from "react";
import { PageHeader } from "@/components/app/page-primitives";
import { cn } from "@/lib/utils";
import { ProfileSection } from "./profile-section";
import { SecuritySection } from "./security-section";
import { DangerZoneSection } from "./delete-account-dialog";

function SectionCard({
  title,
  danger,
  children,
}: {
  title: string;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface">
      <header className="border-b border-border px-5 py-3.5">
        <h2
          className={cn(
            "font-mono text-[10px] tracking-[0.18em] uppercase",
            danger ? "text-destructive" : "text-fg-secondary",
          )}
        >
          {title}
        </h2>
      </header>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Your account identity, sign-in method, and the dangerous edge — handled with the care it deserves."
      />
      <ProfileSection />
      <SecuritySection />
      <DangerZoneSection />
    </div>
  );
}

export { SettingsPage, SectionCard };