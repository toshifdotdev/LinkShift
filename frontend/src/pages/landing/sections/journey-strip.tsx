import {
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
} from "framer-motion";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Container } from "@/components/ui/container";

const stages = [
  { n: "01", label: "Shorten", note: "Long URL → short link" },
  { n: "02", label: "Track", note: "Every click accounted for" },
  { n: "03", label: "Scan", note: "QR codes that stay in sync" },
  { n: "04", label: "Own", note: "Your domain, your brand" },
];

/**
 * Scroll-driven progress path.
 *
 * ONE authoritative progress value (0→1) is derived from the section's
 * scroll position and shared by every visual: the ember line's scaleX
 * (desktop) / scaleY (mobile) and the per-step milestone styling. React
 * state changes only at the three milestone crossings — never per scroll
 * pixel — so there is nothing to oscillate and nothing to fight the user.
 */
function JourneyStrip() {
  const stepsRef = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({
    target: stepsRef,
    offset: ["start 0.85", "end 0.55"],
  });
  const lineScale = useSpring(scrollYProgress, { stiffness: 120, damping: 28 });

  /* milestone state: 0..3, changes only when a milestone is crossed */
  const [reached, setReached] = useState(0);
  useMotionValueEvent(lineScale, "change", (v) => {
    const idx = Math.min(3, Math.max(0, Math.floor(v * 3 + 1e-4)));
    setReached((prev) => (prev === idx ? prev : idx));
  });

  return (
    <section aria-label="The LinkShift journey" className="border-y border-border bg-surface">
      <Container>
        <div className="relative py-10 sm:py-12">
          {/* desktop: horizontal path along the existing line */}
          <span
            aria-hidden="true"
            className="absolute top-[3.625rem] right-[8%] left-[8%] hidden h-px bg-border lg:block"
          >
            <motion.span
              className="block h-full origin-left bg-brand/80"
              style={{ scaleX: lineScale }}
            />
          </span>

          {/* mobile: vertical path beside the step circles */}
          <span
            aria-hidden="true"
            className="absolute top-6 bottom-6 left-[1.125rem] w-px bg-border lg:hidden"
          >
            <motion.span
              className="block h-full w-full origin-top bg-brand/80"
              style={{ scaleY: lineScale }}
            />
          </span>

          <ol ref={stepsRef} className="relative grid grid-cols-2 gap-y-8 lg:grid-cols-4">
            {stages.map((s, i) => {
              const active = i <= reached;
              return (
                <li key={s.n}>
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ margin: "-40px" }}
                    transition={{ duration: 0.5 }}
                    className="relative flex items-start gap-3 lg:flex-col lg:gap-0"
                  >
                    <span
                      className={cn(
                        "relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border bg-background font-mono text-xs transition-colors duration-500",
                        active
                          ? "border-brand/60 text-brand"
                          : "border-border-strong text-fg-secondary",
                      )}
                    >
                      {s.n}
                      {/* completed marker */}
                      {i < reached && (
                        <span
                          aria-hidden="true"
                          className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-brand"
                        />
                      )}
                    </span>
                    <div className="lg:mt-4">
                      <p
                        className={cn(
                          "font-display text-lg leading-none font-medium transition-colors duration-500",
                          active ? "text-foreground" : "text-fg-secondary",
                        )}
                      >
                        {s.label}
                      </p>
                      <p className="mt-1.5 text-xs leading-snug text-fg-muted">{s.note}</p>
                    </div>
                  </motion.div>
                </li>
              );
            })}
          </ol>
        </div>
      </Container>
    </section>
  );
}

export { JourneyStrip };
