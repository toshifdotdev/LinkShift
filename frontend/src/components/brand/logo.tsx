import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * Replaceable brand assets.
 * The final logo is not decided yet — swap the internals of
 * `LogoMark` / `Logo` without touching call sites.
 */

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      {/* Ink: sharp "L" stem */}
      <path
        d="M8 4v12h9"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Ember: shift vector */}
      <path d="M8 16L18 6" stroke="#E8590C" strokeWidth="2.4" strokeLinecap="round" />
      <path
        d="M13 6h5v5"
        stroke="#E8590C"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Logo({
  to = "/",
  size = "md",
  className,
}: {
  to?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <Link
      to={to}
      aria-label="LinkShift home"
      className={cn(
        "group/logo inline-flex items-center gap-2.5 text-foreground",
        className,
      )}
    >
      {/* brand artifact: the mark framed like a plate */}
      <span
        className={cn(
          "flex items-center justify-center rounded-md border border-border bg-surface transition-colors duration-200 group-hover/logo:border-border-strong",
          size === "sm" ? "size-6" : "size-7",
        )}
      >
        <LogoMark className={size === "sm" ? "size-3.5" : "size-4"} />
      </span>
      <span
        className={cn(
          "font-display font-semibold tracking-tight",
          size === "sm" ? "text-base" : "text-lg",
        )}
      >
        LinkShift
      </span>
    </Link>
  );
}

export { Logo };
