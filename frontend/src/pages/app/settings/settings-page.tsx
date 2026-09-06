import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/ui/motion";
import { RouteStrip } from "@/components/ui/route-strip";
import { ProfileSection } from "./profile-section";
import { SecuritySection } from "./security-section";
import { DangerZoneSection } from "./delete-account-dialog";
import { AppearanceSection } from "./appearance-section";


function SettingsRail({
  active,
  onChange,
}: {
  active: "profile" | "appearance" | "security" | "danger";
  onChange: (next: "profile" | "appearance" | "security" | "danger") => void;
}) {
  const items: Array<{ key: "profile" | "appearance" | "security" | "danger"; label: string; note?: string }> = [
    { key: "profile", label: "Profile" },
    { key: "appearance", label: "Appearance" },
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
                      ? "bg-destructive/10 text-destructive"
                      : "bg-brand/[0.08] text-foreground"
                    : isDanger
                      ? "text-destructive/80 hover:text-destructive"
                      : "text-fg-secondary hover:text-foreground",
                )}
              >
                {isActive && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none absolute h-1.5 w-1.5 -translate-y-1/2 rotate-45",
                      "top-1/2 left-0",
                      isDanger ? "bg-destructive" : "bg-brand",
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
      <p className={cn("ls-marquee", danger && "[&]:before:bg-destructive/60")}>{marquee}</p>
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
  const [section, setSection] = useState<"profile" | "appearance" | "security" | "danger">("profile");
  const profileRef = useRef<HTMLDivElement>(null);
  const appearanceRef = useRef<HTMLDivElement>(null);
  const securityRef = useRef<HTMLDivElement>(null);
  const dangerRef = useRef<HTMLDivElement>(null);
  const refsByKey = { profile: profileRef, appearance: appearanceRef, security: securityRef, danger: dangerRef };

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
      <RouteStrip
        index="07"
        label="Settings"
        title="The account, handled with care."
        description="Your identity, sign-in method, and the dangerous edge."
      />

      <div className="grid gap-6 lg:grid-cols-[180px_1fr]">
        <SettingsRail active={section} onChange={setSection} />

        <div className="min-w-0 space-y-6">
          <section
            ref={profileRef}
            aria-labelledby="settings-profile"
            className="ls-plate overflow-hidden"
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
            ref={appearanceRef}
            aria-labelledby="settings-appearance"
            className="ls-plate overflow-hidden"
          >
            <span aria-hidden="true" className="ls-stripe" />
            <div className="p-5 sm:p-6">
              <SectionHeading
                marquee="Appearance"
                title="Theme"
                description="Choose how LinkShift looks. Dark is Ink & Ember; light is Paper & Ember. System follows your device."
              />
              <AppearanceSection />
            </div>
          </section>

          <section
            ref={securityRef}
            aria-labelledby="settings-security"
            className="ls-plate overflow-hidden"
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
            className="relative overflow-hidden rounded-lg border border-destructive/25 bg-destructive/5"
          >
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-destructive/40" />
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