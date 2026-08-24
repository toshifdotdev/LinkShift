import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

function Field({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="field"
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    />
  );
}

function FieldLabel({
  className,
  children,
  htmlFor,
}: {
  className?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      data-slot="field-label"
      className={cn("text-[13px] font-medium text-fg-secondary", className)}
    >
      {children}
    </label>
  );
}

function FieldHint({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <p data-slot="field-hint" className={cn("text-xs text-fg-muted", className)}>
      {children}
    </p>
  );
}

function FieldError({ className, children }: { className?: string; children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" data-slot="field-error" className={cn("text-xs text-destructive", className)}>
      {children}
    </p>
  );
}

export { Field, FieldLabel, FieldHint, FieldError };
