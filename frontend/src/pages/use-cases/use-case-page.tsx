import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { PublicShell } from "@/components/public-shell";
import { useSeo } from "@/lib/seo";

export interface UseCaseStep {
  title: string;
  body: string;
}

export interface UseCaseFaq {
  q: string;
  a: string;
}

export interface UseCaseProps {
  seo: {
    title: string;
    description: string;
    canonicalPath: string;
    jsonLd?: Record<string, unknown>;
  };
  kicker: string;
  headline: string;
  subhead: string;
  proof: string;
  steps: UseCaseStep[];
  capabilities: string[];
  faqs: UseCaseFaq[];
  ctaLabel: string;
}

function buildFaqJsonLd(faqs: UseCaseFaq[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((entry) => ({
      "@type": "Question",
      name: entry.q,
      acceptedAnswer: { "@type": "Answer", text: entry.a },
    })),
  };
}

export function UseCasePage({
  seo,
  kicker,
  headline,
  subhead,
  proof,
  steps,
  capabilities,
  faqs,
  ctaLabel,
}: UseCaseProps) {
  useSeo({
    title: seo.title,
    description: seo.description,
    canonicalPath: seo.canonicalPath,
    jsonLd: seo.jsonLd ?? buildFaqJsonLd(faqs),
  });

  return (
    <PublicShell>
      <Container className="py-16 md:py-24">
        <div className="grid gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <div>
            <p className="ls-marquee">{kicker}</p>
            <h1 className="font-display mt-3 text-3xl font-semibold tracking-[-0.02em] md:text-5xl">
              {headline}
            </h1>
            <p className="mt-5 max-w-xl text-base text-fg-secondary">{subhead}</p>
            <p className="mt-6 max-w-xl border-l-2 border-brand/50 pl-4 text-sm text-fg-secondary">
              {proof}
            </p>
            <Link
              to="/register"
              className="mt-8 inline-flex h-10 items-center gap-2 rounded-md bg-brand px-5 font-mono text-[11px] font-medium tracking-[0.08em] text-primary-foreground uppercase transition-colors hover:bg-brand-hover"
            >
              {ctaLabel}
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>

          <div className="space-y-10">
            <section>
              <h2 className="font-display text-lg font-semibold tracking-[-0.01em]">
                How it works
              </h2>
              <ol className="mt-4 space-y-4">
                {steps.map((step, index) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="mt-0.5 font-mono text-xs text-brand">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{step.title}</p>
                      <p className="mt-1 text-sm text-fg-secondary">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <h2 className="font-display text-lg font-semibold tracking-[-0.01em]">
                What you get
              </h2>
              <ul className="mt-4 space-y-2.5">
                {capabilities.map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-fg-secondary">
                    <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-brand" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        <section className="mt-20 border-t border-border pt-12">
          <h2 className="font-display text-lg font-semibold tracking-[-0.01em]">
            Common questions
          </h2>
          <dl className="mt-6 grid gap-8 md:grid-cols-2">
            {faqs.map((faq) => (
              <div key={faq.q}>
                <dt className="text-sm font-medium">{faq.q}</dt>
                <dd className="mt-1.5 text-sm text-fg-secondary">{faq.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="mt-16 rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-sm text-fg-secondary">
            Every plan starts with the same core features. Check the limits before you commit.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/pricing"
              className="inline-flex h-9 items-center rounded-md border border-border px-4 font-mono text-[11px] tracking-[0.08em] uppercase transition-colors hover:border-brand/50"
            >
              See pricing
            </Link>
            <Link
              to="/docs"
              className="inline-flex h-9 items-center rounded-md border border-border px-4 font-mono text-[11px] tracking-[0.08em] uppercase transition-colors hover:border-brand/50"
            >
              Read the docs
            </Link>
          </div>
        </div>
      </Container>
    </PublicShell>
  );
}

export type { ReactNode };