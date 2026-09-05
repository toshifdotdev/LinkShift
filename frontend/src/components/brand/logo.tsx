import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/*
 * Brand mark: vector reconstruction of the chain-link/shift symbol
 * (public/brand/logo-mark.svg), inlined so it inherits the ink color and
 * stays crisp at every size. The mark sits on its own light ground
 * (#F9F9F9), so the plate stays light in both themes — a framed
 * brand artifact on paper and on carbon alike.
 */
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
      <span
        className={cn(
          "flex items-center justify-center overflow-hidden rounded-md border border-border bg-[#f9f9f9] text-[#141a22] transition-colors duration-200 group-hover/logo:border-border-strong",
          size === "sm" ? "size-6" : "size-7",
        )}
      >
        <svg
          viewBox="0 -1.2 102 91.2"
          aria-hidden="true"
          focusable="false"
          className={cn(size === "sm" ? "size-[18px]" : "size-[21px]")}
        >
          <g
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M 61.54 60.37 L 38.87 81.51 A 13 13 0 0 1 30 85 L 24 85 A 19 21.5 0 0 1 24 42 L 64 42" />
            <path d="M 39.53 27.27 A 29 29 0 1 1 77.2 60.3" />
          </g>
          <path
            d="M 66.32 32.4 L 75.68 40.1 Q 78 42 75.68 43.9 L 66.32 51.6 Q 64 53.5 64 50.5 L 64 33.5 Q 64 30.5 66.32 32.4 Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinejoin="round"
          />
        </svg>
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
