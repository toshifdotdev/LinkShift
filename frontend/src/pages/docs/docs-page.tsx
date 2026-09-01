import { Link } from "react-router-dom";
import { Container } from "@/components/ui/container";
import { PublicShell } from "@/components/public-shell";
import { Kicker } from "@/pages/landing/components/reveal";
import { DOC_CATEGORIES } from "./docs-data";

function DocsPage() {
  return (
    <PublicShell>
      <Container>
        <header className="max-w-2xl">
          <Kicker>Documentation</Kicker>
          <h1 className="font-display mt-5 text-balance text-[clamp(2.2rem,4.5vw,3.4rem)] leading-[1.06] font-medium tracking-[-0.02em]">
            Everything explained.
            <br />
            <span className="text-fg-muted">Nothing padded.</span>
          </h1>
          <p className="text-pretty mt-5 text-[15px] leading-relaxed text-fg-secondary">
            Short guides for every surface of LinkShift — links, domains, QR,
            analytics, billing and your account. If it isn't answered here, the
            FAQ probably has it, and the contact desk has the rest.
          </p>
        </header>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DOC_CATEGORIES.map((category) => (
            <section key={category.slug} className="ls-plate flex flex-col p-5">
              <p className="ls-marquee">
                {category.index} · {category.title}
              </p>
              <p className="mt-3 text-[13px] leading-snug text-fg-secondary">
                {category.blurb}
              </p>
              <ul className="mt-4 flex flex-col gap-2 border-t border-border-subtle pt-4">
                {category.topics.map((topic) => (
                  <li key={topic.slug}>
                    <Link
                      to={`/docs/${topic.slug}`}
                      className="group inline-flex items-baseline gap-2 text-sm text-fg-secondary transition-colors hover:text-foreground"
                    >
                      <span
                        aria-hidden="true"
                        className="h-px w-3 shrink-0 translate-y-[-2px] bg-brand/60 transition-all group-hover:w-4 group-hover:bg-brand"
                      />
                      {topic.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Container>
    </PublicShell>
  );
}

export { DocsPage };
