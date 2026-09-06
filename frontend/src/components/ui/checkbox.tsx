import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";


interface CheckboxProps {
  checked?: boolean | "mixed";
  defaultChecked?: boolean | "mixed";
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  name?: string;
  value?: string;
  invalid?: boolean;
  "aria-label"?: string;
  className?: string;
}

function Checkbox({
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  name,
  value,
  invalid,
  "aria-label": ariaLabel,
  className,
}: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      checked={checked === undefined ? undefined : checked !== false}
      defaultChecked={
        defaultChecked === undefined ? undefined : defaultChecked !== false
      }
      indeterminate={checked === "mixed" || defaultChecked === "mixed"}
      onCheckedChange={onCheckedChange ? (next: boolean) => onCheckedChange(next) : undefined}
      disabled={disabled}
      name={name}
      value={value}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      data-slot="checkbox"
      className={cn(
        "group flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-[3px] border border-border-strong bg-raised transition-colors duration-150",
        "data-checked:border-brand data-checked:bg-brand",
        "aria-invalid:border-destructive",
        "data-disabled:cursor-not-allowed data-disabled:opacity-45",
        "max-lg:after:absolute max-lg:after:-inset-3.5 max-lg:after:content-['']",
        className,
      )}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-primary-foreground">
        <Check
          className="size-3 stroke-[3] group-aria-checked-mixed:hidden"
          aria-hidden="true"
        />
        <Minus
          className="hidden size-3 stroke-[3] group-aria-checked-mixed:flex"
          aria-hidden="true"
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
