import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";


interface CodeChipProps extends Omit<HTMLAttributes<HTMLElement>, "prefix"> {
  prefix?: ReactNode;
  truncate?: boolean;
}

function CodeChip({ prefix, truncate = false, className, children, ...props }: CodeChipProps) {
  return (
    <code
      data-slot="code-chip"
      className={cn(
        "inline-flex max-w-full min-w-0 items-baseline rounded-[3px] border border-border bg-elevated px-1.5 py-[3px] font-mono text-xs leading-none text-foreground",
        className,
      )}
      {...props}
    >
      {prefix != null && (
        <span className={cn("shrink-0 text-fg-muted", truncate && "truncate")}>{prefix}</span>
      )}
      <span className={cn("min-w-0", truncate && "truncate")}>{children}</span>
    </code>
  );
}

export { CodeChip };
