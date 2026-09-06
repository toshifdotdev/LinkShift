import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * Waybill — the plan card. A plate carrying the plan's route code, its
 * status lamp, detail rows, and the renewal action. The current plan gets
 * the ember stripe (the Rail language reserved for *current*).
 */
interface WaybillProps extends HTMLAttributes<HTMLElement> {
  /** Plan route code, e.g. "PRO". */
  code: string;
  /** Human plan name, e.g. "Pro". */
  name?: string;
  /** Status lamp node. */
  status?: ReactNode;
  current?: boolean;
  action?: ReactNode;
  children?: ReactNode;
}

function Waybill({
  code,
  name,
  status,
  current = false,
  action,
  children,
  className,
  ...rest
}: WaybillProps) {
  return (
    <article
      data-slot="waybill"
      className={cn("ls-plate relative overflow-hidden p-6", className)}
      {...rest}
    >
      {current && <span aria-hidden="true" className="ls-stripe" />}
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="ls-marquee">Waybill</p>
          <p className="mt-3 font-mono text-2xl font-medium tracking-tight text-foreground">
            {code}
          </p>
          {name && <p className="mt-0.5 text-sm text-fg-secondary">{name}</p>}
        </div>
        {status && <div className="shrink-0 pt-0.5">{status}</div>}
      </header>
      {children && (
        <dl className="mt-5 flex flex-col gap-2.5 border-t border-border-subtle pt-5">
          {children}
        </dl>
      )}
      {action && <footer className="mt-6">{action}</footer>}
    </article>
  );
}

function WaybillRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="font-mono text-[10px] tracking-[0.14em] text-fg-muted uppercase">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

export { Waybill, WaybillRow };
