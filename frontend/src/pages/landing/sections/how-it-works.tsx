import { Container } from "@/components/ui/container";
import { Reveal, Kicker } from "../components/reveal";

const steps = [
  {
    n: "01",
    title: "Paste a link",
    body: "Drop in any URL. LinkShift hands you a short, permanent address in under a second.",
  },
  {
    n: "02",
    title: "Make it yours",
    body: "Pick a custom slug, attach your domain, generate the matching QR code.",
  },
  {
    n: "03",
    title: "Share & watch",
    body: "Publish it anywhere. Every click and scan lands in your analytics ledger.",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 py-24 sm:py-32">
      <Container>
        <Reveal>
          <Kicker>How it works</Kicker>
          <h2 className="font-display mt-5 max-w-xl text-balance text-[clamp(2rem,4vw,3rem)] leading-[1.08] font-medium tracking-[-0.01em]">
            Three steps. No ceremony.
          </h2>
        </Reveal>

        <div className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {/* connecting rule (desktop) */}
          <span
            aria-hidden="true"
            className="absolute top-5 right-[12%] left-[12%] hidden border-t border-dashed border-border-strong md:block"
          />
          {/* connecting rule (mobile) */}
          <span
            aria-hidden="true"
            className="absolute bottom-8 top-8 left-5 border-l border-dashed border-border-strong md:hidden"
          />

          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.1} className="relative">
              <div className="flex gap-5 md:flex-col md:gap-0">
                <p className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border border-border-strong bg-background font-mono text-xs text-brand">
                  {s.n}
                </p>
                <div className="md:mt-6">
                  <h3 className="text-[17px] font-semibold tracking-tight">{s.title}</h3>
                  <p className="text-pretty mt-2 max-w-xs text-sm leading-relaxed text-fg-secondary">
                    {s.body}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

export { HowItWorks };
