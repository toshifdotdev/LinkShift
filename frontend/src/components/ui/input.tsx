import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useFieldDescribedBy } from "./field";
import { cn } from "@/lib/utils";

function mergeDescribedBy(prop: string | undefined, fromField: string | undefined) {
  const merged = [prop, fromField].filter(Boolean).join(" ");
  return merged || undefined;
}

function Input({
  className,
  type = "text",
  "aria-describedby": describedBy,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const fromField = useFieldDescribedBy();
  return (
    <input
      type={type}
      data-slot="input"
      aria-describedby={mergeDescribedBy(describedBy, fromField)}
      className={cn(
        "h-9 w-full rounded-md border border-input bg-surface px-3 text-sm text-foreground",
        "placeholder:text-fg-muted transition-colors duration-150",
        "hover:border-border-strong focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring/40",
        "disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:outline-destructive/30",
        className,
      )}
      {...props}
    />
  );
}

function Textarea({
  className,
  "aria-describedby": describedBy,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const fromField = useFieldDescribedBy();
  return (
    <textarea
      data-slot="textarea"
      aria-describedby={mergeDescribedBy(describedBy, fromField)}
      className={cn(
        "min-h-20 w-full resize-y rounded-md border border-input bg-surface px-3 py-2 text-sm text-foreground",
        "placeholder:text-fg-muted transition-colors duration-150",
        "hover:border-border-strong focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring/40",
        "disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input, Textarea };
