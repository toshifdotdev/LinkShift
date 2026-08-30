import { useEffect, useRef, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/app/page-primitives";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/ui/motion";
import { ProfileSection } from "./profile-section";
import { SecuritySection } from "./security-section";
import { DangerZoneSection } from "./delete-account-dialog";

/* The settings rail. On desktop a left-rail list of section links. On
   mobile a horizontal scroll of section links. The active link carries
   the same Ember Stripe used everywhere else. */
function SettingsRail({
  active,
  onChange,
}: {
  active: "profile" | "security" | "danger";
  onChange: (next: "profile" | "security" | "danger") => void;
}) {
  const items: Array<{ key: "profile" | "security" | "danger"; label: string; note?: string }> = [
    { key: "profile", label: "Profile" },
    { key: "security", label: "Security" },
    { key: "danger", label: "Danger zone" },
  ];
  return (
    <nav
      aria-label="Settings sections"
      className="lg:sticky lg:top-20 lg:self-start"
    >
      <p className="ls-marquee mb-3 hidden lg:block">Sections</p>
      <ul className="flex gap-1 overflow-x-auto rounded-md border border-border bg-surface p-1 lg:flex-col lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0">
        {items.map((it) => {
          const isActive = active === it.key;
          const isDanger = it.key === "danger";
          return (
            <li key={it.key} className="relative shrink-0">
              <button
                type="button"
                onClick={() => onChange(it.key)}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "relative flex w-full items-center gap-2.5 whitespace-nowrap rounded-sm px-3 py-2 text-left font-mono text-[11.5px] tracking-[0.04em] transition-colors",
                  "lg:w-full lg:px-3 lg:py-2.5",
                  isActive
                    ? isDanger
                      ? "bg-rose-500/[0.08] text-rose-300"
                      : "bg-brand/[0.08] text-foreground"
                    : isDanger
                      ? "text-rose-300/80 hover:text-rose-300"
                      : "text-fg-secondary hover:text-foreground",
                )}
              >
                {isActive && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none absolute h-1.5 w-1.5 -translate-y-1/2 rotate-45",
                      "top-1/2 left-0",
                      isDanger ? "bg-rose-400" : "bg-brand",
                    )}
                  />
                )}
                <span className="lg:ml-3.5">{it.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SectionHeading({
  marquee,
  title,
  description,
  danger,
}: {
  marquee: string;
  title: string;
  description?: string;
  danger?: boolean;
}) {
  return (
    <header className="mb-5">
      <p className={cn("ls-marquee", danger && "[&]:before:bg-rose-400/60")}>{marquee}</p>
      <h2 className="font-display mt-3 text-[clamp(1.4rem,2.6vw,1.7rem)] leading-[1.15] font-medium tracking-[-0.01em] text-foreground">
        {title}
      </h2>
      {description && (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-secondary">{description}</p>
      )}
    </header>
  );
}

function SettingsPage() {
  const [section, setSection] = useState<"profile" | "security" | "danger">("profile");
  const profileRef = useRef<HTMLDivElement>(null);
  const securityRef = useRef<HTMLDivElement>(null);
  const dangerRef = useRef<HTMLDivElement>(null);
  const refsByKey = { profile: profileRef, security: securityRef, danger: dangerRef };

  useEffect(() => {
    const el = refsByKey[section].current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top < 80 || r.top > window.innerHeight * 0.6) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // refsByKey is a stable object literal of refs declared once per render lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  return (
    <FadeIn>
      <PageHeader
        title="Settings"
        description="Your account identity, sign-in method, and the dangerous edge. Handled with care."
      />

      <div className="grid gap-6 lg:grid-cols-[180px_1fr]">
        <SettingsRail active={section} onChange={setSection} />

        <div className="min-w-0 space-y-6">
          <section
            ref={profileRef}
            aria-labelledby="settings-profile"
            className="relative overflow-hidden rounded-xl border border-border bg-surface"
          >
            <span aria-hidden="true" className="ls-stripe" />
            <div className="p-5 sm:p-6">
              <SectionHeading
                marquee="Profile"
                title="Identity and presence"
                description="The name and avatar that appear across LinkShift, on every comment and link."
              />
              <ProfileSection />
            </div>
          </section>

          <section
            ref={securityRef}
            aria-labelledby="settings-security"
            className="relative overflow-hidden rounded-xl border border-border bg-surface"
          >
            <span aria-hidden="true" className="ls-stripe" />
            <div className="p-5 sm:p-6">
              <SectionHeading
                marquee="Security"
                title="Sign-in and sessions"
                description="Password, sessions, and the link to end them."
              />
              <SecuritySection />
            </div>
          </section>

          <section
            ref={dangerRef}
            aria-labelledby="settings-danger"
            className="relative overflow-hidden rounded-xl border border-rose-500/20 bg-rose-500/[0.04]"
          >
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-rose-500/30" />
            <div className="p-5 sm:p-6">
              <SectionHeading
                marquee="Danger zone"
                title="Account deletion"
                description="Permanent. Your links, QR codes, and scan history are removed for good."
                danger
              />
              <DangerZoneSection />
            </div>
          </section>
        </div>
      </div>
    </FadeIn>
  );
}

export { SettingsPage };
export type { ReactNode };