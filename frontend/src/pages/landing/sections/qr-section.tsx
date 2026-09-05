import { Container } from "@/components/ui/container";
import { ProductScreenshot } from "@/components/product-screenshot";
import { GhostNumeral } from "../components/ghost-numeral";
import { Kicker, Reveal } from "../components/reveal";

function QrSection() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <GhostNumeral tone="ink">03</GhostNumeral>
      <Container>
        <div className="relative grid items-center gap-12 lg:grid-cols-[1fr_0.85fr] lg:gap-16">
          <div>
            <Reveal>
              <Kicker index="03">Scan</Kicker>
              <h2 className="font-display mt-5 text-balance text-[clamp(2rem,4vw,3rem)] leading-[1.08] font-medium tracking-[-0.01em]">
                Print it. Paste it.
                <br />
                <span className="text-fg-muted">It never goes stale.</span>
              </h2>
              <p className="text-pretty mt-5 max-w-md text-[15px] leading-relaxed text-fg-secondary">
                Every LinkShift link ships with a matching QR. Posters, packaging,
                screens. When the destination changes, the code follows.
                Paper included.
              </p>
            </Reveal>

            <Reveal delay={0.12}>
              <ul className="mt-8 divide-y divide-border border-t border-border">
                {[
                  ["Custom patterns & colors", "Style codes to match the medium"],
                  ["Scan tracking", "Scans recorded beside clicks"],
                  ["Central retargeting", "One edit updates every print run"],
                ].map(([title, note]) => (
                  <li key={title} className="flex items-baseline justify-between gap-6 py-3">
                    <span className="text-sm font-medium">{title}</span>
                    <span className="text-right text-xs text-fg-muted">{note}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          {/* QR Studio screenshot */}
          <Reveal delay={0.08}>
            <figure className="overflow-hidden rounded-lg border border-border bg-surface shadow-[0_24px_60px_-28px_rgba(0,0,0,0.8)]">
              <ProductScreenshot shot="qr-studio" />
            </figure>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

export { QrSection };
