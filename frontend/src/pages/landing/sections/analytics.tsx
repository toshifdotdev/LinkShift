import { Container } from "@/components/ui/container";
import { ProductScreenshot } from "@/components/product-screenshot";
import { GhostNumeral } from "../components/ghost-numeral";
import { Reveal, Kicker } from "../components/reveal";

/* Readouts mirror the real product screenshot beside them (screenshot-test
   account, 30-day window) so the panel and the product shot tell one story. */
const readouts = [
  { label: "TOTAL CLICKS · 30D", value: "697" },
  { label: "TOP LINK · 30D", value: "249" },
  { label: "PEAK DAY · 30D", value: "33" },
  { label: "TOTAL LINKS", value: "5" },
];

function Analytics() {
  return (
    <section id="analytics" className="relative scroll-mt-20 overflow-hidden border-y border-border bg-surface py-24 sm:py-32">
      <GhostNumeral tone="surface">02</GhostNumeral>
      <Container>
        <div className="relative grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
          <div>
            <Reveal>
              <Kicker index="02">Track</Kicker>
              <h2 className="font-display mt-5 text-balance text-[clamp(2rem,4vw,3rem)] leading-[1.08] font-medium tracking-[-0.01em]">
                Know every click.
              </h2>
              <p className="text-pretty mt-5 max-w-md text-[15px] leading-relaxed text-fg-secondary">
                Traffic stops being a mystery number in someone else's dashboard. Each
                link reports its own story. Volume, rhythm, origin, in a format you
                can actually read.
              </p>
            </Reveal>

            <Reveal delay={0.12}>
              <dl className="mt-8 divide-y divide-border overflow-hidden rounded-lg border border-border">
                {readouts.map((r) => (
                  <div
                    key={r.label}
                    className="flex items-center justify-between bg-elevated/50 px-4 py-3"
                  >
                    <dt className="font-mono text-[11px] tracking-[0.14em] text-fg-muted">
                      {r.label}
                    </dt>
                    <dd className="font-mono text-sm font-medium text-foreground tabular-nums">
                      {r.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>

          <Reveal delay={0.08}>
            <figure className="overflow-hidden rounded-lg border border-border bg-surface shadow-[0_24px_60px_-28px_rgba(0,0,0,0.8)]">
              <ProductScreenshot shot="analytics" />
            </figure>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

export { Analytics };
