import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

function Dialog({
  open,
  onOpenChange,
  onOpenChangeComplete,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fires after the open/close animation finishes — safe place to reset state. */
  onOpenChangeComplete?: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}
    >
      {children}
    </DialogPrimitive.Root>
  );
}

function DialogTrigger({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <DialogPrimitive.Trigger className={className}>
      {children}
    </DialogPrimitive.Trigger>
  );
}

function DialogContent({
  children,
  className,
  showClose = true,
  style,
}: {
  children: ReactNode;
  className?: string;
  showClose?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/70 animate-in fade-in duration-200 data-ending-style:animate-out data-ending-style:fade-out" />
      <DialogPrimitive.Popup
        style={style}
        className={cn(
          "fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg max-h-[calc(100dvh-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto",
          "rounded-lg border border-border bg-elevated p-6 shadow-2xl shadow-black/50",
          "focus:outline-none animate-in fade-in zoom-in-95 duration-200",
          /* Base UI holds the popup mounted while it animates out and flags it
             with `data-ending-style` — ease it back down instead of unmounting. */
          "data-ending-style:animate-out data-ending-style:fade-out data-ending-style:zoom-out-95",
          className,
        )}
      >
        {showClose && (
          <DialogPrimitive.Close
            aria-label="Close"
            className="absolute top-4 right-4 flex size-7 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-raised hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        )}
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

function DialogTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <DialogPrimitive.Title
      className={cn("font-display text-lg font-semibold tracking-tight text-foreground", className)}
    >
      {children}
    </DialogPrimitive.Title>
  );
}

function DialogDescription({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <DialogPrimitive.Description
      className={cn("mt-2 text-sm leading-relaxed text-fg-secondary", className)}
    >
      {children}
    </DialogPrimitive.Description>
  );
}

function DialogFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}>{children}</div>;
}

export { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogFooter };
