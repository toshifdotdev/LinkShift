import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";



interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
}

function Select({ value, defaultValue, onValueChange, disabled, children }: SelectProps) {
  return (
    <SelectPrimitive.Root
      value={value}
      defaultValue={defaultValue}
      disabled={disabled}
      onValueChange={onValueChange ? (v: unknown) => onValueChange(v as string) : undefined}
    >
      {children}
    </SelectPrimitive.Root>
  );
}

function SelectTrigger({
  className,
  placeholder,
  "aria-label": ariaLabel,
  children,
}: {
  className?: string;
  placeholder?: string;
  "aria-label"?: string;
  
  children?: ReactNode | ((value: string) => ReactNode);
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      aria-label={ariaLabel}
      className={cn(
        "flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-input bg-raised px-3 text-sm text-foreground transition-colors duration-150",
        "hover:border-border-strong data-popup-open:border-brand",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <SelectPrimitive.Value placeholder={placeholder}>{children}</SelectPrimitive.Value>
      <SelectPrimitive.Icon className="shrink-0 text-fg-muted">
        <ChevronDown className="size-3.5" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  sideOffset = 4,
}: {
  className?: string;
  children: ReactNode;
  sideOffset?: number;
}) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner side="bottom" align="start" sideOffset={sideOffset} className="z-50">
        <SelectPrimitive.Popup
          className={cn(
            "min-w-[var(--button-width)] max-h-[min(var(--available-height,320px),320px)] overflow-y-auto rounded-md border border-border bg-raised py-1 shadow-lift",
            "animate-in fade-in zoom-in-95 duration-150",
            "data-ending-style:animate-out data-ending-style:fade-out data-ending-style:zoom-out-95",
            className,
          )}
        >
          {children}
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectItem({
  value,
  disabled,
  className,
  children,
}: {
  value: string;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <SelectPrimitive.Item
      value={value}
      disabled={disabled}
      className={cn(
        "flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-foreground outline-none transition-colors duration-100",
        "data-highlighted:bg-[var(--raised-hover)] data-selected:font-medium",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <span className="flex w-3.5 shrink-0 items-center justify-center text-brand">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-3.5" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectLabel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <SelectPrimitive.Label
      className={cn(
        "px-3 pt-2 pb-1 font-mono text-[10px] font-medium tracking-[0.14em] text-fg-muted uppercase",
        className,
      )}
    >
      {children}
    </SelectPrimitive.Label>
  );
}

function SelectSeparator({ className }: { className?: string }) {
  return <SelectPrimitive.Separator className={cn("my-1 h-px bg-border-subtle", className)} />;
}

export { Select, SelectTrigger, SelectContent, SelectItem, SelectLabel, SelectSeparator };
