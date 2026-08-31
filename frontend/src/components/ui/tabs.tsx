import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * Tabs — panel switching. The current tab rides a 1px ember rail: the Rail
 * language reserved for *current*.
 */

interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: ReactNode;
}

function Tabs({ value, defaultValue, onValueChange, className, children }: TabsProps) {
  return (
    <TabsPrimitive.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange ? (v: unknown) => onValueChange(v as string) : undefined}
      className={className}
    >
      {children}
    </TabsPrimitive.Root>
  );
}

function TabsList({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <TabsPrimitive.List
      className={cn(
        "relative flex items-center gap-1 border-b border-border-subtle",
        className,
      )}
    >
      <TabsPrimitive.Indicator
        className="pointer-events-none absolute bottom-0 left-[var(--active-tab-left,0px)] h-px w-[var(--active-tab-width,0px)] bg-brand transition-[left,width] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
      />
      {children}
    </TabsPrimitive.List>
  );
}

interface TabsTriggerProps {
  value: string;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

function TabsTrigger({ value, disabled, className, children }: TabsTriggerProps) {
  return (
    <TabsPrimitive.Tab
      value={value}
      disabled={disabled}
      className={cn(
        "-mb-px inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 px-3 text-[12.5px] font-medium text-fg-secondary transition-colors duration-150",
        "hover:text-foreground data-active:text-foreground",
        "disabled:cursor-not-allowed disabled:opacity-45",
        "max-lg:min-h-11",
        className,
      )}
    >
      {children}
    </TabsPrimitive.Tab>
  );
}

function TabsPanel({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <TabsPrimitive.Panel value={value} className={cn("pt-4 outline-none", className)}>
      {children}
    </TabsPrimitive.Panel>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsPanel };
