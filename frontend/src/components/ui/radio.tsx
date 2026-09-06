import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupRoot } from "@base-ui/react/radio-group";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";



interface RadioGroupProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  ariaLabel?: string;
  className?: string;
  children: ReactNode;
}

function RadioGroup({
  value,
  defaultValue,
  onValueChange,
  ariaLabel,
  className,
  children,
}: RadioGroupProps) {
  return (
    <RadioGroupRoot
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange ? (v: unknown) => onValueChange(v as string) : undefined}
      aria-label={ariaLabel}
      className={className}
    >
      {children}
    </RadioGroupRoot>
  );
}

interface RadioProps {
  value: string;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
}

function Radio({ value, disabled, className, children }: RadioProps) {
  return (
    <RadioPrimitive.Root
      value={value}
      disabled={disabled}
      data-slot="radio"
      className={cn(
        "flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border-strong bg-raised transition-colors duration-150",
        "data-checked:border-brand",
        "data-disabled:cursor-not-allowed data-disabled:opacity-45",
        "max-lg:after:absolute max-lg:after:-inset-3.5 max-lg:after:content-['']",
        className,
      )}
    >
      <RadioPrimitive.Indicator className="size-[7px] rounded-full bg-brand" />
      {children}
    </RadioPrimitive.Root>
  );
}

interface RadioGridOption {
  value: string;
  label: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

interface RadioGridProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: RadioGridOption[];
  columns?: 2 | 3 | 4;
  ariaLabel?: string;
  className?: string;
}

function RadioGrid({
  value,
  defaultValue,
  onValueChange,
  options,
  columns = 3,
  ariaLabel,
  className,
}: RadioGridProps) {
  return (
    <RadioGroupRoot
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange ? (v: unknown) => onValueChange(v as string) : undefined}
      aria-label={ariaLabel}
      data-slot="radio-grid"
      className={cn(
        "grid gap-2",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-2 sm:grid-cols-3",
        columns === 4 && "grid-cols-2 sm:grid-cols-4",
        className,
      )}
    >
      {options.map((option) => (
        <RadioPrimitive.Root
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-3 text-center transition-colors duration-150",
            "hover:border-border-strong data-checked:border-brand data-checked:bg-brand-soft",
            "data-disabled:cursor-not-allowed data-disabled:opacity-45",
            "max-lg:min-h-11",
          )}
        >
          {option.icon && <span className="text-fg-secondary">{option.icon}</span>}
          <span className="text-xs font-medium text-foreground">{option.label}</span>
          {option.hint && (
            <span className="font-mono text-[10px] tracking-[0.08em] text-fg-muted uppercase">
              {option.hint}
            </span>
          )}
        </RadioPrimitive.Root>
      ))}
    </RadioGroupRoot>
  );
}

export { Radio, RadioGroup, RadioGrid };
export type { RadioGridOption };
