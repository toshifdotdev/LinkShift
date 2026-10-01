import { Link } from "react-router-dom";
import { Check, CircleDot } from "lucide-react";

export interface OnboardingState {
  emailVerified: boolean;
  hasVerifiedDomain: boolean;
  hasLink: boolean;
  complete: boolean;
}

interface Step {
  id: string;
  title: string;
  body: string;
  to: string;
  cta: string;
  done: boolean;
}

export function OnboardingChecklist({ state }: { state: OnboardingState }) {
  if (state.complete) return null;

  const steps: Step[] = [
    {
      id: "verify-email",
      title: "Confirm your email address",
      body: "Your account works without it, but you will not receive incident or billing notices until it is verified.",
      to: "/app/settings",
      cta: "Open settings",
      done: state.emailVerified,
    },
    {
      id: "domain",
      title: "Connect a domain you own",
      body: "Point a CNAME at LinkShift and verify it. Your links then read as your brand instead of ours.",
      to: "/app/domains",
      cta: "Connect a domain",
      done: state.hasVerifiedDomain,
    },
    {
      id: "link",
      title: "Create your first short link",
      body: "This is the step that starts everything. Analytics begin counting human clicks the moment it resolves.",
      to: "/app/links",
      cta: "Create a link",
      done: state.hasLink,
    },
  ];

  const remaining = steps.filter((step) => !step.done).length;

  return (
    <section aria-label="Getting started" className="ls-plate relative overflow-hidden">
      <span aria-hidden="true" className="ls-stripe" />
      <header className="flex items-center justify-between gap-4 border-b border-border-subtle px-5 py-3 sm:px-6">
        <h2 className="font-mono text-[11px] tracking-[0.16em] text-fg-muted uppercase">
          Getting started
        </h2>
        <span className="font-mono text-[11px] tracking-[0.14em] text-fg-secondary">
          {remaining} {remaining === 1 ? "step" : "steps"} left
        </span>
      </header>

      <ol className="divide-y divide-border-subtle">
        {steps.map((step) => (
          <li
            key={step.id}
            className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-5 sm:px-6"
          >
            <span
              aria-hidden="true"
              className={
                step.done
                  ? "flex size-6 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"
                  : "flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-fg-muted"
              }
            >
              {step.done ? (
                <Check className="size-3.5" />
              ) : (
                <CircleDot className="size-3.5" />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <p
                className={
                  step.done
                    ? "text-sm text-fg-muted line-through"
                    : "text-sm text-foreground"
                }
              >
                {step.title}
              </p>
              {!step.done && (
                <p className="mt-1 text-[13px] text-fg-secondary">{step.body}</p>
              )}
            </div>

            {!step.done && (
              <Link
                to={step.to}
                className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-border px-3 font-mono text-[10px] tracking-[0.1em] uppercase transition-colors hover:border-brand/60 hover:text-brand"
              >
                {step.cta}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}