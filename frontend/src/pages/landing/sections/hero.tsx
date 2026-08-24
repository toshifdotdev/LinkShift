import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, MoveRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ShortenDemo } from "../components/shorten-demo";
import { EASE } from "../components/reveal";

const PIPELINE = ["LONG URL", "SHIFT", "SHORT LINK", "TRACKED"];

function Hero() {
  const reduce = useReducedMotion();
  const fade = (delay: number) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, delay, ease: EASE },
  });

  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      {/* quiet ink texture */}
      <div
        aria-hidden="true"
        className="dot-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black_30%,transparent_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 h-px w-[min(48rem,80%)] -translate-x-1/2 bg-gradient-to-r from-transparent via-brand/30 to-transparent"
      />

      <Container className="relative">
        <div className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10 xl:gap-12">
          <div>
            {/* 01 · eyebrow */}
            <motion.p
              {...fade(0)}
              className="flex items-center gap-3 font-mono text-[11px] font-medium tracking-[0.18em] text-brand uppercase"
            >
              Links · QR · Analytics
            </motion.p>

            {/* 03–04 · headline reveal via clip-path wipe.
               No overflow:hidden, no masks, no padding tricks: the resting
               clip-path insets are NEGATIVE, so glyphs can never be clipped
               once revealed — descenders, italics and punctuation included. */}
            <h1 className="mt-5">
              <motion.span
                className="font-display block text-[clamp(2.6rem,6.5vw,4.5rem)] leading-[1.06] font-medium tracking-[-0.02em]"
                initial={reduce ? { opacity: 0 } : { opacity: 1, clipPath: "inset(-15% -6% 108% -3%)" }}
                animate={
                  reduce
                    ? { opacity: 1 }
                    : { opacity: 1, clipPath: "inset(-15% -6% -22% -3%)" }
                }
                transition={{ duration: 0.6, delay: 0.12, ease: EASE }}
              >
                Every link
              </motion.span>
              <motion.span
                className="font-display block text-[clamp(2.6rem,6.5vw,4.5rem)] leading-[1.06] font-medium tracking-[-0.02em] italic"
                initial={reduce ? { opacity: 0 } : { opacity: 1, clipPath: "inset(-18% -8% 112% -4%)" }}
                animate={
                  reduce
                    ? { opacity: 1 }
                    : { opacity: 1, clipPath: "inset(-18% -8% -26% -4%)" }
                }
                transition={{ duration: 0.6, delay: 0.24, ease: EASE }}
              >
                tells a story.
              </motion.span>
            </h1>

            {/* ember statement — sibling of h1, shares no clipping context */}
            <motion.p {...fade(0.4)} className="mt-3 flex items-center gap-4">
              <motion.span
                aria-hidden="true"
                className="h-px shrink-0 bg-brand"
                initial={reduce ? { opacity: 0 } : { width: 0 }}
                animate={reduce ? { opacity: 1 } : { width: "3.5rem" }}
                transition={{ duration: 0.5, delay: 0.46, ease: EASE }}
              />
              <span className="text-lg font-medium tracking-tight text-brand sm:text-xl">
                We make it shorter.
              </span>
            </motion.p>

            {/* 05 · the transformation pipeline */}
            <motion.div
              {...fade(0.54)}
              className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1"
              aria-label="How LinkShift works"
            >
              {PIPELINE.map((step, i) => (
                <span
                  key={step}
                  className={`font-mono text-[10px] tracking-[0.16em] uppercase ${
                    i === 1 ? "text-brand" : "text-fg-muted"
                  }`}
                >
                  {i > 0 && <span className="mr-2 text-border-strong">→</span>}
                  {step}
                </span>
              ))}
            </motion.div>

            {/* 06 · supporting copy */}
            <motion.p
              {...fade(0.64)}
              className="text-pretty mt-6 max-w-md text-base leading-relaxed text-fg-secondary sm:text-lg"
            >
              LinkShift turns long URLs into precise short links — with QR codes,
              custom domains and analytics that show you exactly where every click
              comes from.
            </motion.p>

            {/* 07 · CTAs */}
            <motion.div {...fade(0.72)} className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/pricing">
                <Button size="lg">
                  Start shortening
                  <MoveRight className="size-4" />
                </Button>
              </Link>
              <a href="#product">
                <Button variant="outline" size="lg">
                  See the product
                  <ArrowDown className="size-4" />
                </Button>
              </a>
            </motion.div>
          </div>

          {/* 08 · the shift, live */}
          <motion.div
            id="demo"
            className="scroll-mt-28"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.4, ease: EASE }}
          >
            <ShortenDemo />
          </motion.div>
        </div>
      </Container>
    </section>
  );
}

export { Hero };
