import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-[clamp(1.6rem,3vw,2.1rem)] leading-tight font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description && <p className="mt-1.5 max-w-xl text-sm text-fg-secondary">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface/60 px-6 py-16 text-center",
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-lg border border-border bg-elevated text-fg-muted">
        {icon}
      </div>
      <p className="font-display mt-4 text-lg font-medium text-foreground">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-surface px-6 py-16 text-center">
      <p className="font-mono text-[11px] tracking-[0.18em] text-destructive uppercase">Error</p>
      <p className="font-display mt-3 text-lg font-medium text-foreground">{title}</p>
      {message && <p className="mt-1.5 max-w-sm text-sm text-fg-muted">{message}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 rounded-md border border-border-strong px-4 py-2 font-mono text-[11px] tracking-[0.08em] text-foreground uppercase transition-colors hover:border-brand/60 hover:bg-brand/[0.06]"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export { PageHeader, EmptyState, ErrorState };
