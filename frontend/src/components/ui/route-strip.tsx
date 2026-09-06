import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";


interface RouteStripProps extends HTMLAttributes<HTMLElement> {
  
  index?: string;
  
  label: string;
  title: string;
  description?: string;
  
  meta?: ReactNode;
  
  action?: ReactNode;
}

function RouteStrip({
  index,
  label,
  title,
  description,
  meta,
  action,
  className,
  ...rest
}: RouteStripProps) {
  return (
    <header
      data-slot="route-strip"
      className={cn("flex flex-col gap-5 border-b border-border-subtle pb-6", className)}
      {...rest}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="ls-marquee">{index ? `${index} · ${label}` : label}</p>
          <h1 className="font-display mt-3 text-balance text-[clamp(1.4rem,2vw,1.75rem)] leading-tight font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-fg-secondary">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {meta && <div className="flex flex-wrap items-center gap-x-4 gap-y-2">{meta}</div>}
    </header>
  );
}

export { RouteStrip };
