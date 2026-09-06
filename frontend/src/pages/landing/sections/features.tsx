import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Container } from "@/components/ui/container";
import { ProductScreenshot } from "@/components/product-screenshot";
import { useScramble } from "@/lib/use-scramble";
import { Kicker, Reveal } from "../components/reveal";

const features = [
  {
    n: "01",
    stage: "SHORTEN",
    title: "Shortening with intent",
    body: "Compress any URL into a clean, memorable link. Pick a slug, change the destination anytime, and never break what you've already shared.",
    tag: "CORE",
  },
  {
    n: "02",
    stage: "TRACK",
    title: "Analytics without the noise",
    body: "Clicks, scans, referrers, geography. Recorded per link, surfaced in a ledger that respects your attention.",
    tag: "DATA",
  },
  {
    n: "03",
    stage: "SCAN",
    title: "QR codes that stay in sync",
    body: "Every link ships with a matching QR. Print it, embed it, restyle it. Update the destination centrally. Nothing on paper ever goes stale.",
    tag: "QR",
  },
  {
    n: "04",
    stage: "OWN",
    title: "Domains that carry your name",
    body: "Connect a custom domain. Every short link becomes yours. No third-party branding between you and your audience. Verification is built in.",
    tag: "DNS",
  },
];

function Features() {
  const [active, setActive] = useState(0);
  const setActiveStable = useCallback((i: number) => setActive(i), []);

  
  const [replayToken, setReplayToken] = useState(0);
  const ledgerRef = useRef<HTMLDivElement>(null);
  const wasOutsideRef = useRef(true);

  useEffect(() => {
    const el = ledgerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && wasOutsideRef.current) {
          wasOutsideRef.current = false;
          setReplayToken((t) => t + 1);
        } else if (!entry.isIntersecting) {
          wasOutsideRef.current = true;
        }
      },
      { rootMargin: "-22% 0px -22% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  
  const rowRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const rows = rowRefs.current;
    if (!rows.length) return;

    const observer = new IntersectionObserver(
      () => {
        const bandCenter = window.innerHeight / 2;
        let closest = -1;
        let closestDistance = Number.POSITIVE_INFINITY;

        for (let i = 0; i < rows.length; i++) {
          const el = rows[i];
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          const intersects = rect.top < bandCenter && rect.bottom > bandCenter;
          if (!intersects) continue;
          const distance = Math.abs((rect.top + rect.bottom) / 2 - bandCenter);
          if (distance < closestDistance) {
            closestDistance = distance;
            closest = i;
          }
        }

        if (closest !== -1) setActiveStable(closest);
      },
      {
        
        rootMargin: "-40% 0px -40% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    rows.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [setActiveStable]);

  return (
    <section id="product" className="scroll-mt-20 py-24 sm:py-32">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Reveal>
              <Kicker>The product</Kicker>
              <h2 className="font-display mt-5 text-balance text-[clamp(2rem,4vw,3rem)] leading-[1.08] font-medium tracking-[-0.01em]">
                Everything a link should do.
                <br />
                <span className="text-fg-muted">Nothing it shouldn't.</span>
              </h2>
              <p className="text-pretty mt-5 max-w-sm text-[15px] leading-relaxed text-fg-secondary">
                LinkShift is built around one belief: a short link is infrastructure,
                not decoration. Each feature earns its place.
              </p>
            </Reveal>
            <StageReadout activeIndex={active} />
            
            
            <Reveal delay={0.15}>
              <figure className="mt-8 overflow-hidden rounded-lg border border-border bg-surface shadow-[0_16px_40px_-20px_rgba(0,0,0,0.7)]">
                <ProductScreenshot shot="create-link" />
              </figure>
            </Reveal>
          </div>

          
          <div ref={ledgerRef} className="border-t border-border">
            {features.map((f, i) => (
              <FeatureRow
                key={f.n}
                feature={f}
                index={i}
                active={active === i}
                replayToken={replayToken}
                rowRef={(el) => {
                  rowRefs.current[i] = el;
                }}
              />
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}


const StageReadout = memo(function StageReadout({ activeIndex }: { activeIndex: number }) {
  const f = features[activeIndex];
  return (
    <div className="mt-8 hidden h-6 items-center lg:flex" aria-hidden="true">
      <span
        key={f.n}
        className="animate-in fade-in slide-in-from-bottom-1 font-mono text-xs tracking-[0.16em] duration-300"
      >
        <span className="text-brand">{f.n}</span>
        <span className="text-fg-muted"> / {f.stage}</span>
      </span>
    </div>
  );
});


const FeatureRow = memo(function FeatureRow({
  feature,
  index,
  active,
  replayToken,
  rowRef,
}: {
  feature: (typeof features)[number];
  index: number;
  active: boolean;
  replayToken: number;
  rowRef: (el: HTMLElement | null) => void;
}) {
  return (
    <Reveal delay={index * 0.05}>
      <article
        ref={rowRef}
        className={`relative border-b border-border py-7 transition-opacity duration-300 sm:py-8 ${
          active ? "opacity-100" : "opacity-50 sm:opacity-40"
        }`}
      >
        
        <span
          aria-hidden="true"
          className={`absolute top-7 bottom-7 -left-3 w-0.5 rounded-full bg-brand transition-[transform,opacity] duration-300 ease-out sm:-left-5 ${
            active ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0"
          }`}
        />

        <div className="grid gap-2 sm:grid-cols-[3rem_1fr_auto] sm:gap-6">
          <p
            className={`font-mono text-xs leading-7 tracking-widest transition-colors duration-300 ${
              active ? "text-brand" : "text-fg-muted"
            }`}
          >
            {feature.n}
          </p>
          <div>
            <h3 className="text-[17px] font-semibold tracking-tight">{feature.title}</h3>
            <p className="text-pretty mt-2 max-w-lg text-sm leading-relaxed text-fg-secondary">
              {feature.body}
            </p>
          </div>
          <div className="hidden flex-col items-end justify-between gap-4 sm:flex">
            <p className="font-mono text-[10px] tracking-[0.18em] text-fg-muted">{feature.tag}</p>
            <StageVisual key={replayToken} index={index} active={active} />
          </div>
        </div>
      </article>
    </Reveal>
  );
});


const StageVisual = memo(function StageVisual({
  index,
  active,
}: {
  index: number;
  active: boolean;
}) {
  switch (index) {
    case 0:
      return <SlugStage active={active} />;
    case 1:
      return <SparkStage active={active} />;
    case 2:
      return <MatrixStage active={active} />;
    default:
      return <DomainStage active={active} />;
  }
});

function SlugStage({ active }: { active: boolean }) {
  const display = useScramble("xK7q2m", active, 420);
  return (
    <p className="rounded-md border border-border bg-elevated px-2.5 py-1.5 font-mono text-[11px] tabular-nums">
      <span className="text-fg-muted">example.com/…</span>
      <span className="mx-1.5 text-border-strong">→</span>
      <span className="text-brand">{active ? display || "xK7q2m" : "xK7q2m"}</span>
    </p>
  );
}

function SparkStage({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 72 24" className="w-18 text-fg-muted" aria-hidden="true">
      <polyline
        points="0,20 10,17 20,18 30,12 40,14 50,7 60,9 72,3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={active ? 0 : 1}
        style={{
          transition: "stroke-dashoffset 650ms cubic-bezier(0.22,1,0.36,1) 80ms",
        }}
      />
      <circle
        cx="72"
        cy="3"
        r="2"
        fill="#E8590C"
        className={`transition-opacity duration-300 ${active ? "opacity-100 delay-500" : "opacity-0"}`}
      />
    </svg>
  );
}

const MATRIX_CELLS = [
  1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1,
];

function MatrixStage({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="grid w-12 grid-cols-5 gap-[3px] rounded-md border border-border bg-elevated p-1.5"
    >
      {MATRIX_CELLS.map((on, i) => (
        <span
          key={i}
          style={{ transitionDelay: `${i * 16}ms` }}
          className={`aspect-square rounded-[1px] transition-opacity duration-200 ${
            on
              ? i === 22
                ? "bg-brand"
                : "bg-fg-secondary"
              : "bg-border"
          } ${active ? (on ? "opacity-100" : "opacity-35") : "opacity-10"}`}
        />
      ))}
    </div>
  );
}

function DomainStage({ active }: { active: boolean }) {
  return (
    <p className="flex items-center gap-2 rounded-md border border-border bg-elevated px-2.5 py-1.5 font-mono text-[11px]">
      <span
        className={`size-1.5 rounded-full bg-success transition-[transform,opacity] duration-300 ${
          active ? "scale-100 opacity-100" : "scale-50 opacity-30"
        }`}
        aria-hidden="true"
      />
      go.linkshift.in
      <Check
        className={`size-3 text-success transition-[transform,opacity] duration-300 delay-100 ${
          active ? "scale-100 opacity-100" : "scale-50 opacity-0"
        }`}
        aria-hidden="true"
      />
    </p>
  );
}

export { Features };
