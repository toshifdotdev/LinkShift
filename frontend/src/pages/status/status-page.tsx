import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { fetchStatus, type ComponentStatus, type StatusPayload } from "@/api/status";
import { Container } from "@/components/ui/container";
import { PublicShell } from "@/components/public-shell";
import { useSeo } from "@/lib/seo";

const COPY: Record<ComponentStatus, { label: string; tone: string; Icon: typeof CheckCircle2 }> = {
  operational: {
    label: "Operational",
    tone: "text-emerald-400",
    Icon: CheckCircle2,
  },
  degraded: {
    label: "Degraded",
    tone: "text-amber-400",
    Icon: AlertTriangle,
  },
  down: {
    label: "Down",
    tone: "text-red-400",
    Icon: AlertTriangle,
  },
};

const formatTime = (iso: string): string => {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime())
    ? "unknown"
    : parsed.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
};

export function StatusPage() {
  useSeo({
    title: "Service Status - LinkShift",
    description:
      "Live availability for LinkShift redirects, link storage and analytics. If a short link is not resolving, check this page first.",
  });

  const [data, setData] = useState<StatusPayload | null>(null);
  const [unreachable, setUnreachable] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await fetchStatus());
      setUnreachable(false);
    } catch {
      setUnreachable(true);
    }
  }, []);

  useEffect(() => {
    const initial = setTimeout(() => void load(), 0);
    const timer = setInterval(() => void load(), 30_000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [load]);

  const overall: ComponentStatus | null = unreachable ? "down" : (data?.status ?? null);
  const headline = COPY[overall ?? "operational"];

  return (
    <PublicShell>
      <Container className="py-16 md:py-24">
        <header className="max-w-2xl">
          <p className="ls-marquee">Service status</p>
          <h1 className="font-display mt-3 text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
            Are your short links resolving?
          </h1>
          <p className="mt-3 text-sm text-fg-secondary">
            This page reflects live checks, refreshed every 30 seconds. If a link of
            yours is not working, start here.
          </p>
        </header>

        <div className="mt-8 rounded-xl border border-border bg-surface">
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            {overall === null ? (
              <Clock aria-hidden="true" className="size-5 text-fg-secondary" />
            ) : (
              <headline.Icon aria-hidden="true" className={`size-5 ${headline.tone}`} />
            )}
            <div>
              <p className="text-sm font-medium">
                {overall === null
                  ? "Checking…"
                  : overall === "operational"
                    ? "All systems operational"
                    : overall === "degraded"
                      ? "Some systems are degraded"
                      : "We are experiencing an outage"}
              </p>
              <p className="mt-0.5 text-xs text-fg-secondary">
                {data?.updatedAt ? `Last checked ${formatTime(data.updatedAt)}` : "Checking dependencies…"}
              </p>
            </div>
          </div>

          <ul className="divide-y divide-border">
            {(data?.components ?? []).map((component) => {
              const copy = COPY[component.status];
              return (
                <li
                  key={component.id}
                  className="flex items-center justify-between gap-4 px-5 py-3.5"
                >
                  <span className="text-sm">{component.name}</span>
                  <span className={`flex items-center gap-2 text-xs ${copy.tone}`}>
                    <copy.Icon aria-hidden="true" className="size-4" />
                    {copy.label}
                  </span>
                </li>
              );
            })}
            {unreachable && (
              <li className="px-5 py-3.5 text-xs text-fg-secondary">
                The status feed itself could not be reached. That usually means the
                API is unreachable, which would also stop redirects.
              </li>
            )}
          </ul>
        </div>

        <p className="mt-6 text-xs text-fg-secondary">
          Ongoing incidents are posted on this page. For anything not covered here,
          email us through the{" "}
          <Link to="/contact" className="underline underline-offset-4">
            contact form
          </Link>
          .
        </p>
      </Container>
    </PublicShell>
  );
}