import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { GhostNumeral } from "../components/ghost-numeral";
import { EASE, Kicker, Reveal } from "../components/reveal";

const domains = [
  {
    host: "go.linkshift.in",
    status: "VERIFIED",
    note: "Default short domain",
    delay: 0.15,
  },
  {
    host: "links.yourbrand.com",
    status: "PENDING",
    note: "Awaiting DNS record",
    delay: 0.28,
  },
];

function DomainsSection() {
  return (
    <section className="relative overflow-hidden border-y border-border bg-surface py-24 sm:py-32">
      <GhostNumeral tone="surface">04</GhostNumeral>
      <Container>
        <div className="relative grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="order-2 lg:order-1">
            <Reveal>
              <p className="font-mono text-[11px] tracking-[0.16em] text-fg-muted uppercase">
                DNS TXT · _linkshift.links.yourbrand.com
              </p>
              <p className="mt-2 inline-block rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-fg-secondary select-all">
                linkshift-verify=8f3a91c4e2b7
              </p>

              <ul className="mt-6 space-y-2.5">
                {domains.map((d) => (
                  <motion.li
                    key={d.host}
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ margin: "-40px" }}
                    transition={{ duration: 0.45, delay: d.delay, ease: EASE }}
                    className="flex items-center justify-between gap-3 rounded-md border border-border bg-elevated/60 px-4 py-3"
                  >
                    <span className="truncate font-mono text-sm">{d.host}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="hidden font-mono text-[10px] tracking-wide text-fg-muted sm:inline">
                        {d.note}
                      </span>
                      {d.status === "PENDING" ? (
                        <Badge variant="warning">
                          <span className="relative flex size-1.5" aria-hidden="true">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                            <span className="relative inline-flex size-1.5 rounded-full bg-amber-400" />
                          </span>
                          {d.status}
                        </Badge>
                      ) : (
                        <motion.span
                          initial={{ scale: 0.6, opacity: 0 }}
                          whileInView={{ scale: 1, opacity: 1 }}
                          viewport={{ margin: "-40px" }}
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 22,
                            delay: (d.delay ?? 0) + 0.25,
                          }}
                        >
                          <Badge variant="success">
                            <Check className="size-2.5" aria-hidden="true" />
                            {d.status}
                          </Badge>
                        </motion.span>
                      )}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </Reveal>
          </div>

          <div className="order-1 lg:order-2">
            <Reveal>
              <Kicker index="04">Own</Kicker>
              <h2 className="font-display mt-5 text-balance text-[clamp(2rem,4vw,3rem)] leading-[1.08] font-medium tracking-[-0.01em]">
                Your name in every link.
              </h2>
              <p className="text-pretty mt-5 max-w-md text-[15px] leading-relaxed text-fg-secondary">
                Connect a custom domain and the shift happens on your turf — no
                third-party branding between you and your audience. Verification is
                built in: add one DNS record, flip to verified, start shifting.
              </p>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}

export { DomainsSection };
