import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";



type BannerTone = "neutral" | "info" | "success" | "warning" | "destructive";

const toneStyles: Record<BannerTone, { frame: string; lamp: string }> = {
  neutral: { frame: "border-border bg-elevated", lamp: "text-fg-secondary" },
  info: { frame: "border-info/30 bg-info-soft", lamp: "text-info" },
  success: { frame: "border-success/30 bg-success-soft", lamp: "text-success" },
  warning: { frame: "border-warning/30 bg-warning-soft", lamp: "text-warning" },
  destructive: { frame: "border-destructive/30 bg-destructive-soft", lamp: "text-destructive" },
};

interface BannerProps {
  tone?: BannerTone;
  children: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

function Banner({ tone = "neutral", children, action, onDismiss, className }: BannerProps) {
  const styles = toneStyles[tone];
  return (
    <div
      role={tone === "destructive" || tone === "warning" ? "alert" : "status"}
      data-slot="banner"
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm text-foreground",
        styles.frame,
        className,
      )}
    >
      <span aria-hidden="true" className={cn("relative mt-[7px] flex size-1.5 shrink-0", styles.lamp)}>
        <span className="absolute inset-0 rounded-full bg-current" />
        <span className="absolute -inset-1 rounded-full border border-current opacity-40" />
      </span>
      <div className="min-w-0 flex-1 leading-relaxed">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="-m-1 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-muted transition-colors duration-150 hover:bg-foreground/5 hover:text-foreground"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export { Banner };
export type { BannerTone };
