import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowDown, Check, Copy, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Lamp } from "@/components/ui/lamp";
import { useToaster } from "@/components/ui/toaster";
import { useCountUp } from "@/lib/use-count-up";
import { useScramble } from "@/lib/use-scramble";
import { EASE } from "../components/reveal";

const DEMO_URL =
  "https://example.com/notes/the-long-read-on-shorting-things-well?utm_source=landing";

const SLUG_ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SIGNALS = ["QR ATTACHED", "DOMAIN OPTIONAL", "CLICKS LEDGERED"] as const;

function randomSlug(length = 6): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += SLUG_ALPHABET[Math.floor(Math.random() * SLUG_ALPHABET.length)];
  }
  return out;
}

function looksLikeUrl(value: string): boolean {
  const v = value.trim();
  return /^[a-z]+:\/\//i.test(v) || /^[\w-]+(\.[\w-]+)+/.test(v);
}

/**
 * Preview states.
 * idle      compact card: input + Shorten
 * shifting  transformation beat: region opens to its FINAL height while
 *           the connector draws and the panel fades in
 * expanded  rail sweeps, slug resolves, stats/signals/footer fade in —
 *           zero further layout change, so the sequence reads as one
 *           continuous transformation
 */
type DemoState = "idle" | "shifting" | "expanded";

interface DemoResult {
  source: string;
  slug: string;
}

const SHIFT_MS = 620;

function ShortenDemo() {
  const { toast } = useToaster();
  const reduce = useReducedMotion();

  const [state, setState] = useState<DemoState>("idle");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DemoResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const [pendingShift, setPendingShift] = useState(false);

  /* Every scheduled callback lives here — cleared on reset/unmount so
     rapid clicks, mid-transition resets and unmounts can never leave
     stale animation state behind. */
  const timersRef = useRef<Set<number>>(new Set());

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => {
      window.clearTimeout(t);
      window.clearInterval(t);
    });
    timersRef.current.clear();
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    const t = window.setTimeout(() => {
      timersRef.current.delete(t);
      fn();
    }, ms);
    timersRef.current.add(t);
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const runShift = useCallback(
    (raw: string) => {
      if (!looksLikeUrl(raw)) {
        setError("Enter a valid URL to shorten");
        return;
      }
      setError(null);
      setCopied(false);
      setResult({ source: raw.trim(), slug: randomSlug() });
      setState("shifting");
      later(() => setState("expanded"), reduce ? 120 : SHIFT_MS);
    },
    [later, reduce],
  );

  const reset = useCallback(() => {
    clearTimers();
    setEngaged(true);
    setPendingShift(false);
    setCopied(false);
    setError(null);
    setResult(null);
    setUrl("");
    setState("idle");
  }, [clearTimers]);

  const engage = useCallback(() => {
    setEngaged(true);
    setPendingShift(false);
  }, []);

  /* Auto-demo: the URL types itself, then shifts. Any engagement cancels
     it; under reduced motion it runs almost immediately. */
  useEffect(() => {
    if (engaged) return;

    if (reduce) {
      const timers = timersRef.current;
      const t = window.setTimeout(() => {
        setUrl(DEMO_URL);
        setPendingShift(true);
      }, 400);
      timers.add(t);
      return () => {
        window.clearTimeout(t);
        timers.delete(t);
      };
    }

    let i = 0;
    const typeTimer = window.setInterval(() => {
      i += 4;
      setUrl(DEMO_URL.slice(0, i));
      if (i >= DEMO_URL.length) {
        window.clearInterval(typeTimer);
        setPendingShift(true);
      }
    }, 24);
    timersRef.current.add(typeTimer);
    return () => window.clearInterval(typeTimer);
  }, [engaged, reduce]);

  useEffect(() => {
    if (!pendingShift) return;
    const timers = timersRef.current;
    const t = window.setTimeout(() => {
      timers.delete(t);
      setPendingShift(false);
      if (engaged) return;
      setUrl(DEMO_URL);
      runShift(DEMO_URL);
    }, 0);
    timers.add(t);
    return () => {
      window.clearTimeout(t);
      timers.delete(t);
    };
  }, [pendingShift, engaged, runShift]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "shifting") return;
    engage();
    runShift(url);
  }

  async function handleCopy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(`https://lshift.io/${result.slug}`);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: `${result.slug} is a preview — real links live inside your account.`,
        variant: "success",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Your browser blocked clipboard access.",
        variant: "error",
      });
    }
  }

  const open = state !== "idle";

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-surface shadow-[0_32px_80px_-32px_rgba(0,0,0,0.9)]">
      {/* window chrome */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3 sm:px-6">
        <div className="flex items-center gap-2" aria-hidden="true">
          <span className="size-2 rounded-full bg-border-strong" />
          <span
            className={`size-2 rounded-full transition-colors duration-300 ${
              state === "shifting" ? "bg-brand" : "bg-border-strong"
            }`}
          />
          <span className="size-2 rounded-full bg-border-strong" />
        </div>
        <Lamp
          tone={state === "expanded" ? "ember" : "neutral"}
          pulse={state === "shifting"}
        >
          {state === "shifting" ? "Shifting" : "Preview"}
        </Lamp>
      </div>

      <div className="p-4 sm:p-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <label htmlFor="demo-url" className="sr-only">
              URL to shorten
            </label>
            <input
              id="demo-url"
              value={url}
              onChange={(e) => {
                engage();
                setUrl(e.target.value);
                setError(null);
              }}
              placeholder="Paste a long URL…"
              aria-invalid={!!error}
              className={`h-11 w-full rounded-md border bg-raised px-4 font-mono text-[13px] text-foreground caret-brand placeholder:text-fg-muted transition-colors hover:border-border-strong focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring/40 ${
                state === "shifting" ? "opacity-70" : ""
              } ${error ? "border-destructive" : "border-input"}`}
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="h-11 shrink-0 px-5"
            loading={state === "shifting"}
            loadingLabel="Shifting"
          >
            {state !== "shifting" && (
              <>
                Shorten
                <ArrowDown className="size-4" />
              </>
            )}
          </Button>
        </form>

        {error && (
          <p role="alert" className="mt-2 text-xs text-destructive">
            {error}
          </p>
        )}

        {/* shift connector — confined to the empty gap between input and
            the expanding region */}
        <div aria-hidden="true" className="pointer-events-none relative h-0">
          <AnimatePresence>
            {state === "shifting" && !reduce && (
              <motion.span
                initial={{ scaleY: 0, x: "-50%" }}
                animate={{ scaleY: 1, x: "-50%" }}
                exit={{ opacity: 0, x: "-50%", transition: { duration: 0.15 } }}
                transition={{ duration: 0.35, ease: EASE }}
                style={{ transformOrigin: "top" }}
                className="absolute top-1/2 left-1/2 h-7 w-px bg-gradient-to-b from-brand via-brand/70 to-transparent"
              />
            )}
          </AnimatePresence>
        </div>

        {/* ONE smooth height transition for the entire compact → expanded
            move: the grid track opens once to the final height while the
            panel fades in; everything afterwards happens in place. */}
        <div
          className={`grid transition-[grid-template-rows] ease-out ${
            reduce ? "duration-0" : "duration-500"
          } ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        >
          <div className="min-h-0 overflow-hidden">
            {result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: reduce ? 0 : 0.12, ease: EASE }}
                className="pt-4"
              >
                <div className="relative rounded-md border border-border bg-elevated/60 p-4 pl-6">
                  {/* THE EMBER RULE — own clipped track; reveals via a CSS
                      class flip only when `expanded` (post-settle). During
                      idle/shifting/expansion frames it is not visible, so
                      it cannot bleed anywhere. */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-3 left-2 w-px overflow-hidden bg-border"
                  >
                    <span
                      className={`absolute inset-x-0 top-0 h-full origin-top bg-brand transition-transform ease-out ${
                        state === "expanded"
                          ? "scale-y-100 duration-[420ms]"
                          : "scale-y-0 duration-0"
                      }`}
                    />
                  </span>

                  <p className="font-mono text-[10px] tracking-[0.16em] text-fg-muted uppercase">
                    Long URL
                  </p>
                  <p className="mt-1 truncate font-mono text-xs text-fg-secondary">
                    {result.source}
                  </p>

                  <p className="my-2 flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] text-brand uppercase">
                    <ArrowDown className="size-3" aria-hidden="true" />
                    Shifted
                  </p>

                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate font-mono text-base tabular-nums sm:text-lg">
                      <span className="text-fg-muted">https://</span>
                      <span className="font-medium text-brand">
                        lshift.io/
                        <SlugText slug={result.slug} active={state === "expanded"} />
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={handleCopy}
                      aria-label="Copy short link"
                      className="flex size-8 shrink-0 items-center justify-center rounded-md text-fg-secondary transition-all duration-150 hover:bg-raised hover:text-foreground active:scale-90"
                    >
                      {copied ? (
                        <Check className="size-4 text-success" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* reserved at final height from the first frame; revealed
                    in place on `expanded` — no second layout jump */}
                <div
                    aria-hidden={!open || state !== "expanded"}
                    className={`transition-opacity duration-500 ${
                      state === "expanded"
                        ? "opacity-100 delay-150"
                        : "pointer-events-none opacity-0"
                    }`}
                  >
                  <DemoStats active={state === "expanded"} />
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {SIGNALS.map((signal, i) => (
                      <span
                        key={signal}
                        className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2 py-0.5 font-mono text-[9px] tracking-[0.14em] uppercase transition-opacity duration-300 ${
                          state === "expanded" ? "opacity-100" : "opacity-0"
                        }`}
                        style={{ transitionDelay: `${350 + i * 90}ms` }}
                      >
                        <span className="size-1 rounded-full bg-brand/80" />
                        {signal}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="font-mono text-[10px] tracking-wide text-fg-muted uppercase">
                      Preview — sign up to create real links
                    </p>
                    <button
                      type="button"
                      onClick={reset}
                      className="flex items-center gap-1.5 font-mono text-[10px] tracking-wide text-fg-muted uppercase transition-colors hover:text-fg-secondary"
                    >
                      <RotateCcw className="size-3" aria-hidden="true" />
                      Reset
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SlugText({ slug, active }: { slug: string; active: boolean }) {
  const display = useScramble(slug, active);
  return <span>{display}</span>;
}

function DemoStats({ active }: { active: boolean }) {
  const clicks = useCountUp(1287, active, 800);
  const scans = useCountUp(214, active, 800);
  const countries = useCountUp(19, active, 800);

  return (
    <div className="mt-3 grid grid-cols-3 divide-x divide-border overflow-hidden rounded-md border border-border bg-background/60">
      <Stat label="CLICKS / MO" value={clicks.toLocaleString()} />
      <Stat label="QR SCANS" value={scans.toLocaleString()} />
      <Stat label="COUNTRIES" value={countries.toLocaleString()} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3.5 sm:px-6">
      <p className="font-mono text-[10px] tracking-[0.14em] text-fg-muted">{label}</p>
      <p className="mt-1 font-mono text-lg font-medium text-foreground tabular-nums sm:text-xl">
        {value}
      </p>
    </div>
  );
}

export { ShortenDemo };
