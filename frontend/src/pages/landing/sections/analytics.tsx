import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { GhostNumeral } from "../components/ghost-numeral";
import { Reveal, Kicker } from "../components/reveal";

const BARS = [
  22, 35, 28, 44, 39, 31, 48, 42, 57, 49, 38, 62, 55, 47, 71, 64, 58, 77, 69, 83,
  74, 66, 91, 84, 72, 95, 80, 68, 59, 76,
];
const PEAK_INDEX = BARS.indexOf(Math.max(...BARS));

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function Chart() {
  return (
    <div className="relative rounded-lg border border-border bg-background p-5 sm:p-6">
      {/* horizontal gridlines */}
      <div aria-hidden="true" className="absolute inset-x-5 top-5 bottom-14 sm:inset-x-6">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="absolute inset-x-0 border-t border-border/70"
            style={{ top: `${(i / 3) * 100}%` }}
          />
        ))}
      </div>

      <div className="relative flex h-52 gap-[3px] sm:h-64 sm:gap-1.5">
        {BARS.map((v, i) => (
          <div key={i} className="relative flex-1" title={`${v} clicks`}>
            {/* transform-only animation; replays whenever the chart re-enters view */}
            <motion.span
              initial={{ scaleY: 0.04 }}
              whileInView={{ scaleY: v / 100 }}
              viewport={{ margin: "-80px" }}
              transition={{ duration: 0.7, delay: i * 0.02, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformOrigin: "bottom" }}
              className={
                i === PEAK_INDEX
                  ? "absolute inset-x-0 bottom-0 top-0 rounded-t-[3px] bg-brand will-change-transform"
                  : "absolute inset-x-0 bottom-0 top-0 rounded-t-[2px] bg-raised transition-colors hover:bg-border-strong will-change-transform"
              }
            />
          </div>
        ))}

        {/* peak marker */}
        <motion.span
          aria-hidden="true"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ margin: "-80px" }}
          transition={{ duration: 0.4, delay: 1 }}
          className="absolute -top-1 flex items-center gap-1.5 font-mono text-[9px] tracking-[0.16em] text-brand uppercase"
          style={{ left: `${((PEAK_INDEX + 0.5) / BARS.length) * 100}%`, translate: "-50% 0" }}
        >
          Peak
        </motion.span>
      </div>

      <div className="mt-4 flex justify-between font-mono text-[10px] tracking-[0.14em] text-fg-muted">
        {DAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
    </div>
  );
}

const readouts = [
  { label: "TOTAL CLICKS · 30D", value: "18,402" },
  { label: "UNIQUE VISITORS", value: "11,237" },
  { label: "QR SCANS", value: "1,984" },
  { label: "TOP REFERRER", value: "x.com" },
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
            <Chart />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

export { Analytics };
