import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useSeo, ROUTE_SEO, buildFaqJsonLd } from "@/lib/seo";
import { Container } from "@/components/ui/container";
import { PublicShell } from "@/components/public-shell";
import { Kicker } from "@/pages/landing/components/reveal";

import { FAQ_GROUPS } from "./faq-data";

function FaqPage() {
  const faqEntries = FAQ_GROUPS.flatMap((g) => g.entries);
  useSeo({ ...ROUTE_SEO["/faq"], jsonLd: buildFaqJsonLd(faqEntries) });
  return (
    <PublicShell>
      <Container>
        <header className="max-w-2xl">
          <Kicker>FAQ</Kicker>
          <h1 className="font-display mt-5 text-balance text-[clamp(2.2rem,4.5vw,3.4rem)] leading-[1.06] font-medium tracking-[-0.02em]">
            Asked often,
            <br />
            <span className="text-fg-muted">answered plainly.</span>
          </h1>
          <p className="text-pretty mt-5 text-[15px] leading-relaxed text-fg-secondary">
            The short version of everything. For the long version, see the{" "}
            <Link to="/docs" className="text-brand underline decoration-brand/40 underline-offset-4 transition-colors hover:text-brand-hover">
              documentation
            </Link>
            .
          </p>
        </header>

        <div className="mt-14 grid gap-x-12 gap-y-12 lg:grid-cols-2">
          {FAQ_GROUPS.map((group) => (
            <section key={group.title} aria-label={group.title}>
              <p className="ls-marquee">
                {group.index} · {group.title}
              </p>
              <div className="mt-4 border-t border-border">
                {group.entries.map((entry) => (
                  <details key={entry.q} className="group border-b border-border-subtle py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
                      {entry.q}
                      <ChevronDown
                        className="size-4 shrink-0 text-fg-muted transition-transform duration-200 group-open:rotate-180"
                        aria-hidden="true"
                      />
                    </summary>
                    <p className="text-pretty mt-3 text-sm leading-relaxed text-fg-secondary">
                      {entry.a}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      </Container>
    </PublicShell>
  );
}

export { FaqPage };
