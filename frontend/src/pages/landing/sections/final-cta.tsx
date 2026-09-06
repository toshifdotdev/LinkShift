import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Reveal } from "../components/reveal";

function FinalCta() {
  return (
    <section className="relative overflow-hidden py-28 sm:py-36">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border-strong to-transparent"
      />
      <Container>
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-[11px] font-medium tracking-[0.18em] text-brand uppercase">
              Ready when you are
            </p>
            <h2 className="font-display mt-6 text-balance text-[clamp(2.4rem,6vw,4rem)] leading-[1.05] font-medium tracking-[-0.02em]">
              Put your links <em className="text-brand italic">to work.</em>
            </h2>
            <p className="text-pretty mx-auto mt-5 max-w-md text-base leading-relaxed text-fg-secondary">
              Join the publishers, marketers, and builders who treat every shared URL as part of their craft.
            </p>
            <div className="mt-9 flex justify-center">
              <Link to="/register">
                <Button size="lg">Get started with LinkShift</Button>
              </Link>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

export { FinalCta };
