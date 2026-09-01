import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/*
 * Brand mark: the supplied asset (public/brand/linkshift-logo.png), served
 * from a downscaled derivative for weight. The mark carries its own light
 * ground (#F9F9F9), so the plate stays light in both themes — a framed
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
          "flex items-center justify-center overflow-hidden rounded-md border border-border bg-[#f9f9f9] transition-colors duration-200 group-hover/logo:border-border-strong",
          size === "sm" ? "size-6" : "size-7",
        )}
      >
        <img
          src="/brand/linkshift-logo-256.png"
          alt=""
          width={256}
          height={256}
          className={cn("object-cover", size === "sm" ? "size-6" : "size-7")}
        />
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
