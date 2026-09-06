import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";



interface SegmentedOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

interface SegmentedProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: SegmentedOption[];
  ariaLabel?: string;
  fullWidth?: boolean;
  className?: string;
}

function Segmented({
  value,
  defaultValue,
  onValueChange,
  options,
  ariaLabel,
  fullWidth = false,
  className,
}: SegmentedProps) {
  return (
    <TabsPrimitive.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange ? (v: unknown) => onValueChange(v as string) : undefined}
    >
      <TabsPrimitive.List
        aria-label={ariaLabel}
        className={cn(
          "items-center gap-0.5 rounded-md border border-border bg-elevated p-0.5",
          fullWidth ? "flex" : "inline-flex",
          className,
        )}
      >
        {options.map((option) => (
          <TabsPrimitive.Tab
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className={cn(
              "inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-[5px] px-3 text-xs font-medium text-fg-secondary transition-colors duration-150",
              "hover:text-foreground data-active:bg-raised data-active:text-foreground",
              "disabled:cursor-not-allowed disabled:opacity-45",
              "max-lg:min-h-11",
              fullWidth && "flex-1",
            )}
          >
            {option.label}
          </TabsPrimitive.Tab>
        ))}
      </TabsPrimitive.List>
    </TabsPrimitive.Root>
  );
}

export { Segmented };
export type { SegmentedOption };
