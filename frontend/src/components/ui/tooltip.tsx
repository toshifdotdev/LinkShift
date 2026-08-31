import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { isValidElement, type ReactNode } from "react";

/*
 * Tooltip — quiet raised plate, 4px radius, no arrow clutter. Every
 * icon-only button in the app should carry one.
 */

function TooltipProvider({ children, delay = 400 }: { children: ReactNode; delay?: number }) {
  return (
    <TooltipPrimitive.Provider delay={delay} closeDelay={100}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
  /** Render the child untouched — useful when the trigger is unavailable. */
  disabled?: boolean;
}

function Tooltip({ content, children, side = "top", sideOffset = 6, disabled = false }: TooltipProps) {
  if (disabled) return <>{children}</>;
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger
        render={isValidElement(children) ? children : <span>{children}</span>}
      />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side={side} sideOffset={sideOffset} className="z-[70]">
          <TooltipPrimitive.Popup
            className="max-w-56 rounded-[4px] border border-border bg-raised px-2 py-1 text-xs font-normal tracking-normal text-foreground normal-case shadow-lift"
            style={{ animationDuration: "120ms" }}
          >
            {content}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export { Tooltip, TooltipProvider };
