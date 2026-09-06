import { cn } from "@/lib/utils";

/*
 * The arc stays visible under reduced motion — role="status" plus the
 * label carry the meaning when the spin stops.
 */
function Spinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label="Loading"
      className={cn("size-4 motion-safe:animate-spin motion-reduce:animate-none text-brand", className)}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export { Spinner };
