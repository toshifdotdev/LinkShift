import { cn } from "@/lib/utils";

/**
 * A deterministic progress indicator — a 1px ember hairline that sweeps
 * L→R. Used inside primary action buttons (Save, Continue, Download) to
 * communicate in-flight work without the anxiety of an indeterminate spinner.
 */
function ProgressIndicator({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn("relative block h-px w-full overflow-hidden", className)}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-brand to-transparent"
        style={{ animation: "ls-progress-sweep 1.4s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}
      />
      <style>{`@keyframes ls-progress-sweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } } @media (prefers-reduced-motion: reduce) { [aria-label="Loading"] > span { animation: none !important; } }`}</style>
    </span>
  );
}

export { ProgressIndicator };
