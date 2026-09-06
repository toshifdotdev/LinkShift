import { MoveRight } from "lucide-react";
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
        <Reveal once={false}>
          <Kicker>How it works</Kicker>
          <h2 className="font-display mt-5 max-w-xl text-balance text-[clamp(2rem,4vw,3rem)] leading-[1.08] font-medium tracking-[-0.01em]">
            Three steps. No ceremony.
          </h2>
        </Reveal>

        <Reveal once={false} delay={0.1}>
          <ol className="ls-plate mt-14 divide-y divide-border overflow-hidden">
            {steps.map((s) => (
              <li
                key={s.n}
                className="group grid gap-3 p-5 sm:grid-cols-[4.5rem_1fr_2rem] sm:items-center sm:gap-6 sm:p-6"
              >
                <p className="font-mono text-xs tabular-nums text-fg-muted" aria-hidden="true">
                  {s.n}
                </p>
                <div>
                  <h3 className="text-[16px] font-semibold tracking-tight text-foreground">
                    {s.title}
                  </h3>
                  <p className="text-pretty mt-1 max-w-xl text-sm leading-relaxed text-fg-secondary">
                    {s.body}
                  </p>
                </div>
                <MoveRight
                  className="hidden size-4 text-fg-muted transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-brand sm:block"
                  aria-hidden="true"
                />
              </li>
            ))}
          </ol>
        </Reveal>
      </Container>
    </section>
  );
}

export { HowItWorks };
