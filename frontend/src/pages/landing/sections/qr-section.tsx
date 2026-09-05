import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { GhostNumeral } from "../components/ghost-numeral";
import { EASE, Kicker, Reveal } from "../components/reveal";

const GRID = [
  1, 1, 1, 0, 1, 0, 1, 1, 1,
  1, 0, 1, 0, 0, 1, 1, 0, 1,
  1, 1, 1, 0, 1, 0, 1, 1, 1,
  0, 0, 0, 1, 0, 1, 0, 0, 0,
  1, 0, 1, 0, 1, 0, 1, 0, 1,
  0, 1, 0, 1, 0, 0, 0, 1, 0,
  1, 1, 1, 0, 1, 1, 0, 1, 1,
  1, 0, 1, 0, 0, 1, 0, 0, 1,
  1, 1, 1, 0, 1, 0, 1, 0, 1,
];
const EMBER_CELLS = new Set([22, 40, 58]);

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

          {/* illustrative QR panel */}
          <Reveal delay={0.08}>
            <figure className="relative mx-auto max-w-xs">
              <div className="rounded-lg border border-border bg-surface p-5 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.8)]">
                <div
                  aria-hidden="true"
                  className="grid grid-cols-9 gap-[5px] rounded-md bg-background p-4"
                >
                  {GRID.map((on, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: on ? 1 : 0.35 }}
                      viewport={{ margin: "-60px" }}
                      transition={{
                        duration: 0.3,
                        delay: 0.15 + (i % 17) * 0.03,
                        ease: EASE,
                      }}
                      className={`aspect-square rounded-[2px] ${
                        on
                          ? EMBER_CELLS.has(i)
                            ? "bg-brand"
                            : "bg-fg-secondary"
                          : "bg-border/50"
                      }`}
                    />
                  ))}
                </div>
                <figcaption className="mt-4 flex items-center justify-between font-mono text-[10px] tracking-[0.14em] text-fg-muted uppercase">
                  <span>go.linkshift.in/xK7q2m</span>
                  <span className="flex gap-1" aria-hidden="true">
                    <span className="size-1.5 rounded-full bg-brand" />
                    <span className="size-1.5 rounded-full bg-border-strong" />
                  </span>
                </figcaption>
              </div>

              <p className="mt-3 text-center font-mono text-[10px] tracking-[0.14em] text-fg-muted uppercase">
                colors · patterns · eye styles · logos — styled per link
              </p>
            </figure>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

export { QrSection };
