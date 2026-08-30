import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * LinkShift empty state.
 *
 * A centered "ink-on-ink" plate with a single mono marquee label, a Fraunces
 * headline, a quiet one-line caption, and a single primary action. Never a
 * screaming illustration — the typographic restraint is the point.
 */
function EditorialEmpty({
  marquee,
  title,
  description,
  action,
  children,
  className,
  ...rest
}: {
  marquee?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-sunken/40 px-6 py-16 text-center sm:py-20",
        className,
      )}
      {...rest}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border-strong to-transparent"
      />
      {marquee && <p className="ls-marquee mb-5">{marquee}</p>}
      <h3 className="font-display text-balance text-[clamp(1.4rem,2.6vw,1.85rem)] leading-[1.1] font-medium tracking-[-0.01em] text-foreground">
        {title}
      </h3>
      {description && (
        <p className="text-pretty mt-3 max-w-md text-sm leading-relaxed text-fg-secondary">
          {description}
        </p>
      )}
      {action && <div className="mt-7">{action}</div>}
      {children && <div className="mt-6 w-full">{children}</div>}
    </div>
  );
}

export { EditorialEmpty };
