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
      data-index={index}
      className={cn("flex flex-col gap-5 border-b border-border-subtle pb-6", className)}
      {...rest}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <p className="ls-marquee">{index ? `${index} · ${label}` : label}</p>
          <h1 className="font-display mt-3 text-balance text-[clamp(1.55rem,2.4vw,2rem)] leading-[1.1] font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-fg-secondary">{description}</p>
          )}
        </div>
        {action && <div className="flex shrink-0 items-center sm:pt-1">{action}</div>}
      </div>
      {meta && <div className="flex flex-wrap items-center gap-x-4 gap-y-2">{meta}</div>}
    </header>
  );
}

export { RouteStrip };
