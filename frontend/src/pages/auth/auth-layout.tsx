import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/brand/logo";

/**
 * Shared authentication shell — ink field with the same quiet dot-grid
 * texture as the hero, framed card, editorial type.
 */
function AuthLayout({
  kicker,
  title,
  description,
  children,
  footer,
}: {
  kicker: string;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="dot-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black_20%,transparent_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 h-px w-[min(40rem,80%)] -translate-x-1/2 bg-gradient-to-r from-transparent via-brand/30 to-transparent"
      />

      <div className="relative px-5 pt-6 sm:px-8">
        <Logo />
      </div>

      <div className="relative flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <p className="font-mono text-[11px] font-medium tracking-[0.18em] text-brand uppercase">
            {kicker}
          </p>
          <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="text-pretty mt-2 text-sm leading-relaxed text-fg-secondary">
              {description}
            </p>
          )}

          <div className="mt-8">{children}</div>

          {footer && (
            <div className="mt-6 text-[13px] text-fg-secondary">{footer}</div>
          )}
        </div>
      </div>

      <footer className="relative px-5 pb-6 text-center font-mono text-[10px] tracking-[0.14em] text-fg-muted uppercase sm:px-8">
        <Link to="/" className="transition-colors hover:text-fg-secondary">
          ← LinkShift
        </Link>
      </footer>
    </main>
  );
}

export { AuthLayout };
