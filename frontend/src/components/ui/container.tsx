import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const widths = {
  prose: "max-w-3xl",
  content: "max-w-5xl",
  wide: "max-w-6xl",
  full: "max-w-7xl",
  marketing: "max-w-[88rem]",
} as const;

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  width?: keyof typeof widths;
}

function Container({ className, width = "wide", ...props }: ContainerProps) {
  return (
    <div
      data-slot="container"
      className={cn("mx-auto w-full px-5 sm:px-8", widths[width], className)}
      {...props}
    />
  );
}

export { Container };
