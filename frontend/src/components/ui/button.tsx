import { cva, type VariantProps } from "class-variance-authority";
import { Spinner } from "./spinner";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * LinkShift button family.
 * Static design carries the identity: slug typography (mono caps) on ink
 * surfaces with a drawn ember rule on hover. Ghost/link stay editorial
 * Archivo for quiet contexts.
 */
const buttonVariants = cva(
  // `ls-btn` carries the shared interaction system (ember rule-draw + press feedback)
  "ls-btn ls-pressable relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-md font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out select-none focus-visible:outline-2 focus-visible:outline-ring/70 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      size: {
        xs: "h-7 gap-1 px-2.5 text-[10.5px]",
        sm: "h-8 gap-1.5 px-3 text-[11px]",
        md: "h-9 gap-2 px-4 text-[11.5px]",
        lg: "h-11 gap-2 px-6 text-xs",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-xs": "size-7",
      },
      variant: {
        /* Primary action — ember plate, deep-ember spine, white rule */
        default:
          "bg-brand font-mono uppercase tracking-[0.08em] text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-1px_0_rgba(0,0,0,0.22)] [--ls-spine:#9a3d06] [--ls-rule:rgba(255,255,255,0.85)] hover:bg-brand-hover active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.28)]",
        primary:
          "bg-brand font-mono uppercase tracking-[0.08em] text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-1px_0_rgba(0,0,0,0.22)] [--ls-spine:#9a3d06] [--ls-rule:rgba(255,255,255,0.85)] hover:bg-brand-hover active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.28)]",
        /* Ink plate — raised surface, ember spine + rule */
        secondary:
          "border border-border bg-raised font-mono uppercase tracking-[0.08em] text-foreground [--ls-spine:var(--brand)] [--ls-rule:var(--brand)] hover:border-border-strong hover:bg-[var(--raised-hover)] active:bg-[var(--raised-active)]",
        outline:
          "border border-border-strong bg-transparent font-mono uppercase tracking-[0.08em] text-foreground [--ls-spine:var(--brand)] [--ls-rule:var(--brand)] hover:border-brand/60 hover:bg-brand/[0.06]",
        /* Editorial quiet — Inter sentence case, no spine */
        ghost:
          "bg-transparent font-sans normal-case tracking-normal text-fg-secondary [--ls-spine:transparent] [--ls-rule:var(--brand)] hover:bg-elevated hover:text-foreground",
        destructive:
          "border border-destructive/30 bg-destructive/10 font-mono uppercase tracking-[0.08em] text-destructive [--ls-spine:var(--destructive)] [--ls-rule:var(--destructive)] hover:border-destructive/50 hover:bg-destructive/20",
        link: "bg-transparent font-sans normal-case tracking-normal text-brand underline-offset-4 hover:underline [--ls-spine:transparent]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  loadingLabel?: string;
}

function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  loading = false,
  loadingLabel,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      data-slot="button"
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading ? (
        <>
          <Spinner className="size-3.5 text-current" />
          {loadingLabel && <span>{loadingLabel}</span>}
        </>
      ) : (
        (children as ReactNode)
      )}
    </button>
  );
}

export { Button, buttonVariants };
