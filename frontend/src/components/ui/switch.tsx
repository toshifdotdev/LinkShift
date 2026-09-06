import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@/lib/utils";


interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  name?: string;
  "aria-label"?: string;
  className?: string;
}

function Switch({
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  name,
  "aria-label": ariaLabel,
  className,
}: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      defaultChecked={defaultChecked}
      onCheckedChange={onCheckedChange ? (next: boolean) => onCheckedChange(next) : undefined}
      disabled={disabled}
      name={name}
      aria-label={ariaLabel}
      data-slot="switch"
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-border-strong bg-raised transition-colors duration-150",
        "data-checked:border-brand data-checked:bg-brand",
        "data-disabled:cursor-not-allowed data-disabled:opacity-45",
        
        "max-lg:after:absolute max-lg:after:-inset-3.5 max-lg:after:content-['']",
        className,
      )}
    >
      <SwitchPrimitive.Thumb
        className="block size-3.5 translate-x-[3px] rounded-full bg-fg-secondary transition-transform duration-150 data-checked:translate-x-[17px] data-checked:bg-white"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
