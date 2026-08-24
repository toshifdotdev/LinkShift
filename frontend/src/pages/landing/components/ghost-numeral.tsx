import { cn } from "@/lib/utils";

/**
 * Oversized ghost stage numeral — quiet editorial wayfinding tying the
 * 01–04 journey sections together. Purely decorative.
 */
function GhostNumeral({
  children,
  tone = "ink",
}: {
  children: string;
  tone?: "ink" | "surface";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute -top-6 right-2 z-0 hidden select-none font-display text-[clamp(9rem,20vw,16rem)] leading-none font-semibold italic sm:block lg:-top-12",
        tone === "ink" ? "text-elevated" : "text-raised",
      )}
    >
      {children}
    </span>
  );
}

export { GhostNumeral };
