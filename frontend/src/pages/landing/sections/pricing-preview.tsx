import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Reveal, Kicker } from "../components/reveal";

function PricingPreview() {
  return (
    <section className="border-t border-border bg-surface py-20 sm:py-24">
      <Container>
        <Reveal>
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl">
              <Kicker>Pricing</Kicker>
              <h2 className="font-display mt-5 text-balance text-[clamp(1.9rem,3.5vw,2.75rem)] leading-[1.08] font-medium tracking-[-0.01em]">
                Clear plans.
                <br />
                <span className="text-fg-muted">Written-down limits.</span>
              </h2>
            </div>
            <Link to="/pricing" className="shrink-0">
              <Button variant="secondary" size="lg">
                View pricing
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
            <p className="mt-6 border-t border-border pt-5 font-mono text-xs tracking-[0.16em] text-fg-muted uppercase">
              Monthly and yearly billing
            </p>
        </Reveal>
      </Container>
    </section>
  );
}

export { PricingPreview };
